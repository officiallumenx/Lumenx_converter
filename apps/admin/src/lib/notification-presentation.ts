import {
  AlertTriangle,
  Bus,
  CalendarDays,
  ClipboardList,
  IndianRupee,
  Info,
  MessageSquare,
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
  if (row.category === "leave") {
    return "bg-violet-500/15 border-violet-500/30 text-violet-700 dark:text-violet-300";
  }
  if (row.category === "transport") {
    return "bg-cyan-500/15 border-cyan-500/30 text-cyan-700 dark:text-cyan-300";
  }
  if (row.category === "fees") {
    return "bg-amber-500/15 border-amber-500/30 text-amber-800 dark:text-amber-300";
  }
  if (row.type === "warning") {
    return "bg-amber-500/15 border-amber-500/30 text-amber-800 dark:text-amber-300";
  }
  if (row.type === "positive") {
    return "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300";
  }
  return "bg-sky-500/15 border-sky-500/30 text-sky-700 dark:text-sky-300";
}

export function notificationRowSurfaceClass(
  row: Pick<NotificationInboxListItem, "unread" | "priority" | "payload" | "category">,
): string {
  if (isNotificationAlertRow(row)) return ALERT_ROW_CLASS;
  if (row.unread) return "bg-primary/[0.03]";
  return "";
}

/** Prefer category-specific icons so leave/transport/etc. are not a blank Info mark. */
export function notificationTypeIcon(
  type: NotificationInboxListItem["type"],
  category?: NotificationCategory,
): LucideIcon {
  if (category === "leave") return CalendarDays;
  if (category === "transport") return Bus;
  if (category === "fees") return IndianRupee;
  if (category === "attendance") return ClipboardList;
  if (category === "messages") return MessageSquare;
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
