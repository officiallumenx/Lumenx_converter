import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import { dedupeNotificationsById } from "@lumenx/module-notifications";
import type { AppNotification } from "@lumenx/types";
import {
  inboxItemDtosToAppNotifications,
  listInboxNotifications,
} from "@/lib/notification-inbox";

/**
 * Load the actor-scoped inbox for Connect portals (API mode).
 * School circulars arrive as inbox rows with category announcements — do not
 * merge the full published announcements feed (that floods Announcements).
 */
export async function loadConnectPortalInbox(
  instituteId: string | null,
): Promise<AppNotification[]> {
  if (!isApiAuthMode()) return [];
  if (!instituteId || !isInstituteUuid(instituteId)) return [];

  const inbox = await listInboxNotifications({ instituteId });
  return dedupeNotificationsById(inboxItemDtosToAppNotifications(inbox)).sort(
    (a, b) =>
      Date.parse(b.createdAt ?? "") - Date.parse(a.createdAt ?? ""),
  );
}
