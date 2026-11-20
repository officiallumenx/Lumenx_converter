/**
 * Send module category → existing API contracts.
 * Each category keeps its own backend path; Send only chooses which one.
 */

export const SEND_CATEGORIES = [
  "announcements",
  "alerts",
  "holidays",
  "events",
] as const;
export type SendCategory = (typeof SEND_CATEGORIES)[number];

export function parseSendCategory(raw: unknown): SendCategory {
  if (raw === "alerts" || raw === "alert") return "alerts";
  if (raw === "holidays" || raw === "holiday") return "holidays";
  if (raw === "events" || raw === "event") return "events";
  return "announcements";
}

export function sendCategoryLabel(category: SendCategory): string {
  switch (category) {
    case "alerts":
      return "Alerts";
    case "holidays":
      return "Holidays";
    case "events":
      return "Events";
    default:
      return "Announcements";
  }
}

export type SendApiContractKind =
  | "announcement_create_publish"
  | "school_alert_broadcast"
  | "calendar_holiday_create"
  | "event_create_publish";

/** Which existing contract the Send UI must call for this category. */
export function sendApiContractForCategory(category: SendCategory): {
  kind: SendApiContractKind;
  pathHint: string;
} {
  switch (category) {
    case "alerts":
      return {
        kind: "school_alert_broadcast",
        pathHint: "POST school-alerts/broadcast (broadcastSchoolAlert)",
      };
    case "holidays":
      return {
        kind: "calendar_holiday_create",
        pathHint: "POST /api/v1/events (kind=holiday, source=calendar)",
      };
    case "events":
      return {
        kind: "event_create_publish",
        pathHint: "POST /api/v1/events (+ publish) source=events",
      };
    default:
      return {
        kind: "announcement_create_publish",
        pathHint: "POST announcements create/publish (createAnnouncement)",
      };
  }
}

export function shouldIgnoreDuplicateSendClick(busy: boolean): boolean {
  return busy;
}
