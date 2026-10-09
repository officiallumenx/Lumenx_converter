/**
 * FCM tray presentation helpers — metadata only.
 * Does not change delivery/claim/outbox behavior.
 */

/**
 * Android status-bar small icon resource names (drawable names).
 * Must be a monochrome/white-silhouette PNG in the app's drawable directory.
 * Each app declares its own asset; do not mix across apps.
 */
export const CONNECT_FCM_SMALL_ICON = "ic_notification";
export const TRANSPORT_FCM_SMALL_ICON = "ic_notification";
export const ADMIN_FCM_SMALL_ICON = "ic_notification";

/** Accent colors for Android NotificationCompat / FCM `android.notification.color`. */
export const FCM_ANDROID_COLOR = {
  /** INFO / normal priority → blue (not orange/red). */
  info: "#2563EB",
  /** WARNING / important → amber. */
  warning: "#D97706",
  /** CRITICAL / urgent / alert → red. */
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

/**
 * Resolve the Android small icon resource for a given device app.
 * All three apps use `ic_notification` but the constant is kept per-app
 * so future renaming or per-app customisation stays isolated.
 */
export function androidSmallIconForApp(deviceApp: string | null | undefined): string | undefined {
  if (deviceApp === "connect") return CONNECT_FCM_SMALL_ICON;
  if (deviceApp === "transport") return TRANSPORT_FCM_SMALL_ICON;
  if (deviceApp === "admin") return ADMIN_FCM_SMALL_ICON;
  return undefined;
}

export function buildFcmAndroidNotification(input: {
  isAlert: boolean;
  priority: string;
  payload?: Record<string, unknown> | null;
  /**
   * device_token.app — "connect" | "transport" | "admin".
   * Used to select the correct monochrome small icon asset per app.
   */
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
  const icon = androidSmallIconForApp(input.deviceApp);
  if (icon) out.icon = icon;
  return out;
}
