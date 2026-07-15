import type { TeacherNotification } from "./types";

/** Which teacher portal workspace owns this item (dual-role teachers see one at a time). */
export type TeacherPortalScope = "subject" | "activity";

/** Subject Teacher workspace — academic, class, and staff items only. */
export function isSubjectPortalNotification(n: TeacherNotification): boolean {
  return n.portalScope !== "activity";
}

export function filterSubjectPortalNotifications(
  items: TeacherNotification[],
): TeacherNotification[] {
  return items.filter(isSubjectPortalNotification);
}
