/**
 * Mirror shared Transport → Admin workflow notifications into the existing
 * Admin Notification Center (no second inbox).
 */
import type { AppNotification } from "@lumenx/types";
import {
  listTransportNotifications,
  subscribeTransportNotifications,
  type TransportNotifCategory,
  type TransportWorkflowNotification,
} from "@lumenx/utils";

import {
  prependAdminNotification,
  type AdminNotification,
} from "@/lib/notification-center-store";

const syncedIds = new Set<string>();

function categoryToType(category: TransportNotifCategory): AppNotification["type"] {
  if (category === "sos" || category === "emergency") return "warning";
  if (category === "trip" || category === "boarding") return "positive";
  if (category === "approach") return "info";
  return "info";
}

function categoryToPriority(
  category: TransportNotifCategory,
  priority?: TransportWorkflowNotification["priority"],
): AppNotification["priority"] {
  if (priority === "critical" || priority === "important") return "high";
  if (priority === "success" || priority === "normal") return "normal";
  if (category === "sos" || category === "emergency") return "high";
  if (category === "approval" || category === "boarding" || category === "approach") return "high";
  return "normal";
}

function toAdminRow(n: TransportWorkflowNotification): AdminNotification {
  const reason = n.reason ? `\nReason: ${n.reason}` : "";
  return {
    id: n.id,
    title: n.title,
    desc: n.message,
    detail: `${n.message}${reason}`,
    time: "Just now",
    type: categoryToType(n.category),
    category: "circulars",
    unread: n.unread,
    priority: categoryToPriority(n.category, n.priority),
    createdAt: n.createdAt,
    href: n.href ?? "/transport",
    templateId: n.templateId,
  };
}

export function syncTransportNotificationsToAdminCenter(): void {
  const items = listTransportNotifications("admin");
  for (const item of [...items].reverse()) {
    if (syncedIds.has(item.id)) continue;
    syncedIds.add(item.id);
    prependAdminNotification(toAdminRow(item));
  }
}

let started = false;

/** Call once from Admin Transport shell / notification route. */
export function startTransportAdminNotificationSync(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  syncTransportNotificationsToAdminCenter();
  subscribeTransportNotifications(() => {
    syncTransportNotificationsToAdminCenter();
  });
}
