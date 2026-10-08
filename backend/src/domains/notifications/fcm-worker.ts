import type { SupabaseClient } from "@supabase/supabase-js";
import type { Messaging } from "firebase-admin/messaging";
import type { Logger } from "../../logger/logger.js";
import {
  claimPendingFcmDeliveryAttempt,
  findDeviceTokenById,
  findNotificationById,
  listPendingFcmDeliveryAttempts,
  reclaimStaleSendingFcmAttempts,
  softInvalidateDeviceToken,
  updateDeliveryAttemptStatus,
} from "./repository.js";
import { isAlertNotificationRow } from "./fcm-enqueue.js";
import {
  buildFcmAndroidNotification,
  formatFcmTrayTitle,
} from "./fcm-presentation.js";

export type FcmWorkerResult = {
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  retried: number;
};

const DEFAULT_BATCH = 50;
const BASE_BACKOFF_MS = 30_000;
const MAX_BACKOFF_MS = 60 * 60 * 1000;

/** Exported for presentation unit tests — preserves existing data keys. */
export function buildFcmData(
  notification: {
    id: string;
    institute_id: string;
    category?: string;
    deep_link: string | null;
    payload: Record<string, unknown>;
    priority: string;
  },
  options?: { deviceApp?: string | null },
): Record<string, string> {
  const data: Record<string, string> = {
    notificationId: notification.id,
    instituteId: notification.institute_id,
    priority: notification.priority,
  };
  if (notification.category) {
    data.category = notification.category;
  }
  if (options?.deviceApp) {
    data.app = options.deviceApp;
  }
  const deepLink = notification.deep_link?.trim() ?? "";
  // Only fan out relative in-app paths (never absolute / scheme URLs).
  if (deepLink.startsWith("/") && !deepLink.startsWith("//")) {
    data.href = deepLink;
  }
  if (notification.payload?.presentation === "alert") {
    data.presentation = "alert";
    data.variant = "alert";
  } else if (notification.payload?.presentation === "chime") {
    data.presentation = "chime";
    data.variant = "notification";
  } else {
    data.variant = "notification";
  }
  if (typeof notification.payload?.severity === "string") {
    data.severity = notification.payload.severity;
  }
  if (typeof notification.payload?.alertSeverity === "string") {
    data.alertSeverity = notification.payload.alertSeverity;
  }
  if (typeof notification.payload?.kind === "string") {
    data.kind = notification.payload.kind;
  }
  if (typeof notification.payload?.tripId === "string") {
    data.tripId = notification.payload.tripId;
  }
  if (typeof notification.payload?.studentId === "string") {
    data.studentId = notification.payload.studentId;
  }
  if (typeof notification.payload?.stopId === "string") {
    data.stopId = notification.payload.stopId;
  }
  if (typeof notification.payload?.schoolAlertId === "string") {
    data.schoolAlertId = notification.payload.schoolAlertId;
  }
  if (typeof notification.payload?.leaveId === "string") {
    data.leaveId = notification.payload.leaveId;
  }
  return data;
}

function backoffMs(attemptCount: number): number {
  const exp = Math.min(attemptCount, 10);
  return Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** Math.max(0, exp - 1));
}

function isPermanentFcmError(code: string): boolean {
  return (
    code === "messaging/registration-token-not-registered" ||
    code === "messaging/invalid-registration-token"
  );
}

/**
 * Process pending FCM outbox rows with retry/backoff.
 * No-op when messaging is null (Firebase not configured).
 */
export async function processPendingFcmDeliveries(
  admin: SupabaseClient,
  messaging: Messaging | null,
  logger: Logger,
  options?: { limit?: number },
): Promise<FcmWorkerResult> {
  const result: FcmWorkerResult = {
    processed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    retried: 0,
  };
  if (!messaging) return result;

  await reclaimStaleSendingFcmAttempts(admin);

  const pending = await listPendingFcmDeliveryAttempts(
    admin,
    options?.limit ?? DEFAULT_BATCH,
  );
  if (pending.length === 0) return result;

  const notificationCache = new Map<
    string,
    Awaited<ReturnType<typeof findNotificationById>>
  >();

  for (const candidate of pending) {
    // Atomic claim — another Railway/local worker may have taken this row.
    // Pre-migration DBs without `sending` status fall back to the candidate row.
    let attempt = candidate;
    try {
      const claimed = await claimPendingFcmDeliveryAttempt(admin, candidate.id);
      if (!claimed) {
        result.skipped += 1;
        continue;
      }
      attempt = claimed;
    } catch {
      attempt = candidate;
    }

    result.processed += 1;
    const maxAttempts = Math.max(1, Number(attempt.max_attempts) || 8);
    const priorAttempts = Number(attempt.attempt_count) || 0;

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
        attemptCount: priorAttempts + 1,
      });
      result.failed += 1;
      continue;
    }

    const isAlert = isAlertNotificationRow(notification);
    const androidNotification = buildFcmAndroidNotification({
      isAlert,
      priority: notification.priority,
      payload: notification.payload,
      deviceApp: tokenRow.app,
    });

    try {
      await messaging.send({
        token: tokenRow.token,
        notification: {
          title: formatFcmTrayTitle({
            title: notification.title,
            category: notification.category,
            isAlert,
          }),
          body: notification.body,
        },
        data: buildFcmData(notification, { deviceApp: tokenRow.app }),
        android: {
          priority: isAlert ? "high" : "normal",
          notification: androidNotification,
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
      await updateDeliveryAttemptStatus(admin, attempt.id, {
        status: "sent",
        error: null,
        attemptCount: priorAttempts + 1,
        nextAttemptAt: null,
      });
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

      const nextCount = priorAttempts + 1;
      if (isPermanentFcmError(code)) {
        await softInvalidateDeviceToken(admin, tokenRow.id);
        await updateDeliveryAttemptStatus(admin, attempt.id, {
          status: "failed",
          error: message.slice(0, 500),
          attemptCount: nextCount,
          nextAttemptAt: null,
        });
        result.failed += 1;
      } else if (nextCount >= maxAttempts) {
        await updateDeliveryAttemptStatus(admin, attempt.id, {
          status: "failed",
          error: message.slice(0, 500),
          attemptCount: nextCount,
          nextAttemptAt: null,
        });
        result.failed += 1;
      } else {
        const delay = backoffMs(nextCount);
        await updateDeliveryAttemptStatus(admin, attempt.id, {
          status: "pending",
          error: message.slice(0, 500),
          attemptCount: nextCount,
          nextAttemptAt: new Date(Date.now() + delay).toISOString(),
        });
        result.retried += 1;
      }

      logger.warn({
        msg: "fcm_send_failed",
        attemptId: attempt.id,
        error: message,
        code,
        attemptCount: nextCount,
      });
    }
  }

  return result;
}
