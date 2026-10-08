/**
 * FCM tray presentation helpers — metadata only.
 * Does not change delivery/claim/outbox behavior.
 */

/** Android status-bar small icon resource (Connect drawable name). */
export const CONNECT_FCM_SMALL_ICON = "ic_notification";

/** Accent colors for Android NotificationCompat / FCM `android.notification.color`. */
export const FCM_ANDROID_COLOR = {
  info: "#2563EB",
  warning: "#D97706",
  critical: "#DC2626",
} as const;

const CATEGORY_TRAY_LABEL: Record<string, string> = {
  attendance: "Attendance",
  homework: "Homework",
  fees: "Fees",
  exams: "Exam",
  events: "Event",
  transport: "Transport",
  leave: "Leave",
  announcements: "Announcement",
  messages: "Message",
  complaints: "Notice",
  admissions: "Admissions",
  careers: "Careers",
  certificates: "Certificate",
  documents: "Document",
  timetable: "Timetable",
  system: "Notice",
  nexus: "Nexus",
};

export function backendCategoryTrayLabel(
  category: string | null | undefined,
): string {
  if (!category) return "Notice";
  return CATEGORY_TRAY_LABEL[category] ?? "Notice";
}

/**
 * Resolve Android notification accent from existing priority + payload severity fields.
 * INFO/normal → blue; WARNING/important/attention → amber; CRITICAL/urgent/emergency → red.
 */
export function resolveAndroidNotificationColor(input: {
  priority: string;
  payload?: Record<string, unknown> | null;
  isAlert?: boolean;
}): string {
  const priority = String(input.priority ?? "normal").toLowerCase();
  const severity =
    typeof input.payload?.severity === "string"
      ? input.payload.severity.toLowerCase()
      : "";
  const alertSeverity =
    typeof input.payload?.alertSeverity === "string"
      ? input.payload.alertSeverity.toLowerCase()
      : "";

  if (
    input.isAlert ||
    priority === "critical" ||
    severity === "critical" ||
    severity === "urgent" ||
    alertSeverity === "emergency"
  ) {
    return FCM_ANDROID_COLOR.critical;
  }

  if (
    priority === "important" ||
    severity === "attention" ||
    severity === "warning" ||
    alertSeverity === "mandatory"
  ) {
    return FCM_ANDROID_COLOR.warning;
  }

  // normal / success / info → blue (not red)
  return FCM_ANDROID_COLOR.info;
}

/**
 * Visible tray title: "Announcement • Nate".
 * Preserves alert "Important:" prefix. Does not mutate DB title.
 */
export function formatFcmTrayTitle(input: {
  title: string;
  category: string;
  isAlert: boolean;
}): string {
  const title = input.title.trim() || "Notification";
  if (input.isAlert) {
    if (/^important:/i.test(title)) return title;
    return `Important: ${title}`;
  }
  const label = backendCategoryTrayLabel(input.category);
  const prefix = `${label} • `;
  if (title.toLowerCase().startsWith(prefix.toLowerCase())) return title;
  if (title.toLowerCase().startsWith(`${label.toLowerCase()} · `)) return title;
  return `${prefix}${title}`;
}

export function buildFcmAndroidNotification(input: {
  isAlert: boolean;
  priority: string;
  payload?: Record<string, unknown> | null;
  /** device_token.app — only Connect has the dedicated small icon asset. */
  deviceApp?: string | null;
}): {
  channelId: string;
  color: string;
  icon?: string;
} {
  const color = resolveAndroidNotificationColor({
    priority: input.priority,
    payload: input.payload,
    isAlert: input.isAlert,
  });
  const out: { channelId: string; color: string; icon?: string } = {
    channelId: input.isAlert ? "lumenx_alerts" : "lumenx_notifications",
    color,
  };
  if (input.deviceApp === "connect") {
    out.icon = CONNECT_FCM_SMALL_ICON;
  }
  return out;
}
