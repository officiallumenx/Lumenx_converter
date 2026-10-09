import type { AppNotification, NotificationCategory } from "@lumenx/types";
import type { LumenXNotificationPriority } from "./types";
import { escalatePriorityFromDueAt, type StoredNotificationPriority } from "./deadline-priority";

const BACKEND_TO_UI_CATEGORY: Record<string, NotificationCategory> = {
  attendance: "attendance",
  homework: "assignments",
  fees: "fees",
  exams: "exams",
  events: "events",
  transport: "transport",
  leave: "leave",
  announcements: "circulars",
  messages: "messages",
  complaints: "system",
  admissions: "academic",
  careers: "academic",
  certificates: "academic",
  documents: "academic",
  timetable: "academic",
  system: "system",
  nexus: "system",
};

export function backendCategoryToUiCategory(
  category: string | null | undefined,
): NotificationCategory {
  if (!category) return "circulars";
  return BACKEND_TO_UI_CATEGORY[category] ?? "circulars";
}

export function presentationFromPriority(priority: LumenXNotificationPriority | string | null | undefined): {
  type: AppNotification["type"];
  priority: NonNullable<AppNotification["priority"]>;
} {
  if (priority === "critical") return { type: "warning", priority: "high" };
  if (priority === "important") return { type: "warning", priority: "normal" };
  if (priority === "success") return { type: "positive", priority: "normal" };
  return { type: "info", priority: "normal" };
}

export function effectiveStoredPriority(input: {
  stored?: StoredNotificationPriority | null;
  dueAt?: string | null;
  now?: Date;
}): StoredNotificationPriority {
  return escalatePriorityFromDueAt(input.stored, input.dueAt, input.now);
}

/** Tailwind-oriented token names for inbox rows — use with existing LumenX tokens. */
export type NotificationToneToken = "primary" | "warning" | "destructive" | "success";

export function toneTokenFromPriority(
  priority: LumenXNotificationPriority | string | null | undefined,
): NotificationToneToken {
  if (priority === "critical") return "destructive";
  if (priority === "important") return "warning";
  if (priority === "success") return "success";
  return "primary";
}

/** Android / tray accent hex — INFO blue, WARNING amber, CRITICAL red. */
export const NOTIFICATION_ACCENT_HEX = {
  info: "#2563EB",
  warning: "#D97706",
  critical: "#DC2626",
} as const;

/**
 * Human-readable severity labels for in-app UI.
 * Category (Transport, Announcement, etc.) is shown separately via
 * `backendCategoryDisplayLabel`.
 */
export const SEVERITY_UI_LABEL: Record<string, string> = {
  /** INFO — normal informational update. */
  normal: "Update",
  success: "Update",
  /** WARNING — needs attention (amber). */
  important: "Attention",
  /** CRITICAL — urgent, requires immediate action (red). */
  critical: "Urgent",
} as const;

/**
 * Map stored priority (+ optional payload severity) to Android notification color.
 * Mirrors backend `resolveAndroidNotificationColor` — keep in sync.
 */
export function androidAccentHexFromPriority(
  priority: LumenXNotificationPriority | string | null | undefined,
  opts?: {
    severity?: string | null;
    alertSeverity?: string | null;
    isAlert?: boolean;
  },
): string {
  const p = String(priority ?? "normal").toLowerCase();
  const severity = String(opts?.severity ?? "").toLowerCase();
  const alertSeverity = String(opts?.alertSeverity ?? "").toLowerCase();
  if (
    opts?.isAlert ||
    p === "critical" ||
    severity === "critical" ||
    severity === "urgent" ||
    alertSeverity === "emergency"
  ) {
    return NOTIFICATION_ACCENT_HEX.critical;
  }
  if (
    p === "important" ||
    severity === "attention" ||
    severity === "warning" ||
    alertSeverity === "mandatory"
  ) {
    return NOTIFICATION_ACCENT_HEX.warning;
  }
  return NOTIFICATION_ACCENT_HEX.info;
}

/** Human tray / in-app label for backend notification.category. */
export function backendCategoryDisplayLabel(
  category: string | null | undefined,
): string {
  switch (category) {
    case "attendance":
      return "Attendance";
    case "homework":
      return "Homework";
    case "fees":
      return "Fees";
    case "exams":
      return "Exam";
    case "events":
      return "Event";
    case "transport":
      return "Transport";
    case "leave":
      return "Leave";
    case "announcements":
      return "Announcement";
    case "messages":
      return "Message";
    case "complaints":
      return "Notice";
    case "admissions":
      return "Admissions";
    case "careers":
      return "Careers";
    case "certificates":
      return "Certificate";
    case "documents":
      return "Document";
    case "timetable":
      return "Timetable";
    case "system":
      return "Notice";
    case "nexus":
      return "Nexus";
    default:
      return "Notice";
  }
}
