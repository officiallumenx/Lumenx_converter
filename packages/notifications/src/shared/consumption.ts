/**
 * Phase 9 — shared consumption helpers (deep links, dedupe).
 * Keeps existing AppNotification UI shapes; does not redesign inboxes.
 */
import type { AppNotification, NotificationCategory } from "@lumenx/types";

/** Default deep links for actionable categories when href is missing. */
export const DEFAULT_NOTIFICATION_HREF: Partial<Record<NotificationCategory, string>> = {
  academic: "/timetable",
  attendance: "/attendance",
  assignments: "/homework",
  exams: "/exams",
  fees: "/fees",
  sports: "/events",
  events: "/events",
  holidays: "/events",
  circulars: "/notifications",
  emergency: "/notifications",
};

export function ensureNotificationHref(
  n: AppNotification,
  fallback?: string,
): AppNotification {
  if (n.href && n.href.trim()) return n;
  const fromCategory = DEFAULT_NOTIFICATION_HREF[n.category];
  const href = fallback ?? fromCategory ?? "/notifications";
  return { ...n, href };
}

/** Keep first occurrence of each id (stable foundation id). */
export function dedupeNotificationsById(rows: AppNotification[]): AppNotification[] {
  const seen = new Set<string>();
  const out: AppNotification[] = [];
  for (const row of rows) {
    if (!row.id || seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(ensureNotificationHref(row));
  }
  return out;
}

export function isImportantNotification(n: AppNotification): boolean {
  return n.priority === "high" || n.category === "emergency" || n.type === "warning";
}

export {
  isAlertNotification,
  isAlertPresentationPayload,
  ALERT_PRESENTATION,
  ALERT_ROW_CLASS,
  ALERT_ICON_CHIP_CLASS,
  ALERT_BADGE_CLASS,
} from "./alert-presentation";
export {
  playAlertChime,
  playNotificationChime,
  playChimeForVariant,
  setAlertChimesEnabled,
  areAlertChimesEnabled,
  loadAlertChimesPreference,
  saveAlertChimesPreference,
  bootstrapAlertChimesPreference,
} from "./alert-chime";
export {
  dispatchInAppAlert,
  subscribeInAppAlerts,
  IN_APP_ALERT_EVENT,
  type InAppAlertEventDetail,
} from "./in-app-alert";
export {
  bootstrapPushDeviceToken,
  type DeviceApp,
  type DevicePlatform,
  type RegisterDeviceTokenFn,
} from "./push-device-token";
