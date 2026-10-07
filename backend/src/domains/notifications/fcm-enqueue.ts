import type { SupabaseClient } from "@supabase/supabase-js";
import {
  insertFcmDeliveryAttempts,
  listValidDeviceTokensForUsers,
} from "./repository.js";
import { resolveTargetApps } from "./resolve-target-apps.js";
import type { DeviceApp, NotificationRow, RecipientRow } from "./types.js";

/** Enqueue pending FCM delivery rows for each recipient device token (filtered by target apps). */
export async function enqueueFcmDeliveryAttempts(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    notificationId: string;
    recipients: RecipientRow[];
    /** When omitted, read from notification payload / category defaults. */
    targetApps?: DeviceApp[];
    category?: NotificationRow["category"];
    payload?: Record<string, unknown>;
  },
): Promise<number> {
  if (input.recipients.length === 0) return 0;

  const fromPayload = Array.isArray(input.payload?.targetApps)
    ? (input.payload.targetApps as string[])
    : undefined;
  const targetApps = resolveTargetApps(
    input.category ?? "system",
    input.targetApps ??
      (fromPayload
        ? (fromPayload.filter((a) => typeof a === "string") as DeviceApp[])
        : undefined),
  );
  if (targetApps.length === 0) return 0;

  const userIds = [...new Set(input.recipients.map((r) => r.user_profile_id))];
  const tokens = await listValidDeviceTokensForUsers(admin, userIds, targetApps);
  if (tokens.length === 0) return 0;

  const recipientByUser = new Map(
    input.recipients.map((r) => [r.user_profile_id, r.id]),
  );

  const rows = tokens
    .map((token) => {
      const recipientId = recipientByUser.get(token.user_profile_id);
      if (!recipientId) return null;
      return {
        instituteId: input.instituteId,
        notificationId: input.notificationId,
        notificationRecipientId: recipientId,
        deviceTokenId: token.id,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);

  if (rows.length === 0) return 0;
  await insertFcmDeliveryAttempts(admin, rows);
  return rows.length;
}

export function isAlertNotificationRow(notification: NotificationRow): boolean {
  const payload = notification.payload ?? {};
  // Soft transport chime must NOT use the critical alert channel.
  if (payload.presentation === "chime") return false;
  if (payload.presentation === "alert") return true;
  if (payload.severity === "critical") return true;
  if (notification.category === "system" && notification.priority === "critical") {
    return true;
  }
  return notification.priority === "critical";
}
