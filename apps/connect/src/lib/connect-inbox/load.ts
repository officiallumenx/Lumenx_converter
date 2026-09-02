import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import { dedupeNotificationsById } from "@lumenx/module-notifications";
import type { AppNotification } from "@lumenx/types";
import { listAnnouncements } from "@/lib/announcements/api";
import { announcementDtosToAppNotifications } from "@/lib/announcements/map-to-notification";
import {
  inboxItemDtosToAppNotifications,
  listInboxNotifications,
} from "@/lib/notification-inbox";

/**
 * Load institute notifications + published announcements for Connect portals (API mode).
 * Backend scopes rows to the authenticated actor — no role query param needed.
 */
export async function loadConnectPortalInbox(
  instituteId: string | null,
): Promise<AppNotification[]> {
  if (!isApiAuthMode()) return [];
  if (!instituteId || !isInstituteUuid(instituteId)) return [];

  const [inbox, announcements] = await Promise.all([
    listInboxNotifications({ instituteId }),
    listAnnouncements({ instituteId }),
  ]);

  const inboxRows = inboxItemDtosToAppNotifications(inbox);
  const announcementRows = announcementDtosToAppNotifications(announcements);

  const inboxAnnouncementIds = new Set(
    inbox
      .filter((row) => row.notification.category === "announcements")
      .map((row) => {
        const payloadId = row.notification.payload?.announcementId;
        return typeof payloadId === "string" ? payloadId : null;
      })
      .filter((id): id is string => Boolean(id)),
  );

  const dedupedAnnouncements = announcementRows.filter((row) => {
    const rawId = row.id.replace(/^ann-row-/, "");
    return !inboxAnnouncementIds.has(rawId);
  });

  return dedupeNotificationsById([...inboxRows, ...dedupedAnnouncements]).sort(
    (a, b) =>
      Date.parse(b.createdAt ?? "") - Date.parse(a.createdAt ?? ""),
  );
}
