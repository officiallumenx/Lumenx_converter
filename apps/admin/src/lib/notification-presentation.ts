import {
  AlertTriangle,
  BookOpen,
  Bus,
  CalendarDays,
  CalendarOff,
  ClipboardList,
  FileText,
  IndianRupee,
  Info,
  Megaphone,
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

/**
 * Icon chip classes — category drives the chip tint (not severity).
 * CRITICAL/alert rows always get the destructive red chip regardless.
 * Normal INFO-level transport/announcements/events show blue, not orange.
 */
export function notificationIconChipClass(
  row: Pick<NotificationInboxListItem, "type" | "priority" | "payload" | "category">,
): string {
  // Alert/emergency rows always red — overrides category
  if (isNotificationAlertRow(row)) return ALERT_ICON_CHIP_CLASS;
  // Category → specific chip tint
  if (row.category === "leave") {
    return "bg-violet-500/15 border-violet-500/30 text-violet-700 dark:text-violet-300";
  }
  if (row.category === "transport") {
    // Transport category = blue chip (INFO level); severity may still be amber/red for the row
    return "bg-sky-500/15 border-sky-500/30 text-sky-700 dark:text-sky-300";
  }
  if (row.category === "fees") {
    return "bg-amber-500/15 border-amber-500/30 text-amber-800 dark:text-amber-300";
  }
  if (row.category === "circulars" || row.category === "messages") {
    return "bg-indigo-500/15 border-indigo-500/30 text-indigo-700 dark:text-indigo-300";
  }
  if (row.category === "events") {
    return "bg-purple-500/15 border-purple-500/30 text-purple-700 dark:text-purple-300";
  }
  if (row.category === "attendance") {
    return "bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300";
  }
  if (row.category === "assignments" || row.category === "exams") {
    return "bg-orange-500/15 border-orange-500/30 text-orange-700 dark:text-orange-300";
  }
  // Severity fallback — only for categories without a specific chip
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

/**
 * Prefer category-specific icons.
 * Icon is always based on CATEGORY (what kind of notification).
 * Severity color is handled separately via notificationIconChipClass.
 */
export function notificationTypeIcon(
  type: NotificationInboxListItem["type"],
  category?: NotificationCategory,
): LucideIcon {
  // Category → icon (do NOT infer category from title text)
  if (category === "leave") return CalendarOff;
  if (category === "transport") return Bus;
  if (category === "fees") return IndianRupee;
  if (category === "attendance") return ClipboardList;
  if (category === "messages") return MessageSquare;
  if (category === "circulars") return Megaphone;
  if (category === "assignments") return BookOpen;
  if (category === "events") return CalendarDays;
  if (category === "exams") return FileText;
  // Severity fallback (only when no specific category icon)
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
