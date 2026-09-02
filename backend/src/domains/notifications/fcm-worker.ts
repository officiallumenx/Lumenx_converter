import type { SupabaseClient } from "@supabase/supabase-js";
import type { Messaging } from "firebase-admin/messaging";
import type { Logger } from "../../logger/logger.js";
import {
  findDeviceTokenById,
  findNotificationById,
  listPendingFcmDeliveryAttempts,
  softInvalidateDeviceToken,
  updateDeliveryAttemptStatus,
} from "./repository.js";
import { isAlertNotificationRow } from "./fcm-enqueue.js";

export type FcmWorkerResult = {
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
};

const DEFAULT_BATCH = 50;

function buildFcmData(notification: {
  id: string;
  institute_id: string;
  deep_link: string | null;
  payload: Record<string, unknown>;
  priority: string;
}): Record<string, string> {
  const data: Record<string, string> = {
    notificationId: notification.id,
    instituteId: notification.institute_id,
    priority: notification.priority,
  };
  if (notification.deep_link) data.href = notification.deep_link;
  if (notification.payload?.presentation === "alert") {
    data.presentation = "alert";
    data.variant = "alert";
  } else {
    data.variant = "notification";
  }
  if (typeof notification.payload?.schoolAlertId === "string") {
    data.schoolAlertId = notification.payload.schoolAlertId;
  }
  if (typeof notification.payload?.leaveId === "string") {
    data.leaveId = notification.payload.leaveId;
  }
  return data;
}

/**
 * Process pending FCM outbox rows. No-op when messaging is null (Firebase not configured).
 */
export async function processPendingFcmDeliveries(
  admin: SupabaseClient,
  messaging: Messaging | null,
  logger: Logger,
  options?: { limit?: number },
): Promise<FcmWorkerResult> {
  const result: FcmWorkerResult = { processed: 0, sent: 0, failed: 0, skipped: 0 };
  if (!messaging) return result;

  const pending = await listPendingFcmDeliveryAttempts(admin, options?.limit ?? DEFAULT_BATCH);
  if (pending.length === 0) return result;

  const notificationCache = new Map<string, Awaited<ReturnType<typeof findNotificationById>>>();

  for (const attempt of pending) {
    result.processed += 1;

    if (!attempt.device_token_id) {
      await updateDeliveryAttemptStatus(admin, attempt.id, {
        status: "skipped",
        error: "missing_device_token",
      });
      result.skipped += 1;
      continue;
    }

    const tokenRow = await findDeviceTokenById(admin, attempt.device_token_id);
    if (!tokenRow || !tokenRow.valid) {
      await updateDeliveryAttemptStatus(admin, attempt.id, {
        status: "skipped",
        error: "invalid_device_token",
      });
      result.skipped += 1;
      continue;
    }

    let notification = notificationCache.get(attempt.notification_id);
    if (notification === undefined) {
      notification = await findNotificationById(admin, attempt.notification_id);
      notificationCache.set(attempt.notification_id, notification);
    }
    if (!notification) {
      await updateDeliveryAttemptStatus(admin, attempt.id, {
        status: "failed",
        error: "notification_not_found",
      });
      result.failed += 1;
      continue;
    }

    const isAlert = isAlertNotificationRow(notification);

    try {
      await messaging.send({
        token: tokenRow.token,
        notification: {
          title: isAlert ? `Important: ${notification.title}` : notification.title,
          body: notification.body,
        },
        data: buildFcmData(notification),
        android: {
          priority: isAlert ? "high" : "normal",
          notification: {
            channelId: isAlert ? "lumenx_alerts" : "lumenx_notifications",
            color: isAlert ? "#DC2626" : undefined,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: isAlert ? "default" : "default",
              ...(isAlert ? { "interruption-level": "time-sensitive" } : {}),
            },
          },
        },
      });
      await updateDeliveryAttemptStatus(admin, attempt.id, { status: "sent", error: null });
      result.sent += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : "fcm_send_failed";
      const code =
        err &&
        typeof err === "object" &&
        "code" in err &&
        typeof (err as { code: unknown }).code === "string"
          ? (err as { code: string }).code
          : "";

      if (
        code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-registration-token"
      ) {
        await softInvalidateDeviceToken(admin, tokenRow.id);
      }

      await updateDeliveryAttemptStatus(admin, attempt.id, {
        status: "failed",
        error: message.slice(0, 500),
      });
      result.failed += 1;
      logger.warn({ msg: "fcm_send_failed", attemptId: attempt.id, error: message, code });
    }
  }

  return result;
}
