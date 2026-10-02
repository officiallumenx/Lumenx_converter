import {
  AlertTriangle,
  Info,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import {
  ALERT_ICON_CHIP_CLASS,
  ALERT_ROW_CLASS,
  isAlertPresentationPayload,
} from "@lumenx/notifications";
import type { NotificationCategory } from "@lumenx/types";
import type { NotificationInboxListItem } from "@/lib/notification-inbox/types";
import { ADMIN_NOTIFICATION_CATEGORY_LABELS } from "@/lib/notification-center-store";

export type InboxTone = "info" | "warning" | "success" | "danger";

export function isNotificationAlertRow(
  row: Pick<NotificationInboxListItem, "priority" | "payload" | "category">,
): boolean {
  if (row.priority === "high" || row.category === "emergency") return true;
  if (row.payload) return isAlertPresentationPayload(row.payload);
  return false;
}

export function notificationTypeTone(
  type: NotificationInboxListItem["type"],
): InboxTone {
  if (type === "warning") return "warning";
  if (type === "positive") return "success";
  return "info";
}

export function notificationCategoryLabel(
  category: NotificationCategory,
): string {
  return ADMIN_NOTIFICATION_CATEGORY_LABELS[category] ?? category;
}

/** Icon chip classes — same palette as Notification Center inbox. */
export function notificationIconChipClass(
  row: Pick<NotificationInboxListItem, "type" | "priority" | "payload" | "category">,
): string {
  if (isNotificationAlertRow(row)) return ALERT_ICON_CHIP_CLASS;
  if (row.type === "warning") {
    return "bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-400";
  }
  if (row.type === "positive") {
    return "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-400";
  }
  return "bg-sky-500/10 border-sky-500/25 text-sky-700 dark:text-sky-400";
}

export function notificationRowSurfaceClass(
  row: Pick<NotificationInboxListItem, "unread" | "priority" | "payload" | "category">,
): string {
  if (isNotificationAlertRow(row)) return ALERT_ROW_CLASS;
  if (row.unread) return "bg-primary/[0.03]";
  return "";
}

export function notificationTypeIcon(
  type: NotificationInboxListItem["type"],
): LucideIcon {
  if (type === "warning") return AlertTriangle;
  if (type === "positive") return Sparkles;
  return Info;
}

export function notificationPillTone(
  row: Pick<NotificationInboxListItem, "type" | "priority" | "payload" | "category">,
): InboxTone {
  if (isNotificationAlertRow(row)) return "danger";
  return notificationTypeTone(row.type);
}
