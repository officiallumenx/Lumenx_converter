/** Activity Coordinator workspace — primary modules (nav + dashboard). */
export type ActivityWorkspaceModuleId =
  | "dashboard"
  | "sports"
  | "extra-curricular"
  | "attendance"
  | "achievements"
  | "messages"
  | "notifications"
  | "announcements"
  | "certificates"
  | "practice"
  | "calendar"
  | "profile";

/** Legacy routes kept for bookmarks — not in primary navigation. */
export type ActivityLegacyModuleId =
  | "events"
  | "competitions"
  | "clubs"
  | "workshops";

export type ActivityModuleId = ActivityWorkspaceModuleId | ActivityLegacyModuleId;

export function isPrimaryWorkspaceModule(id: ActivityModuleId): id is ActivityWorkspaceModuleId {
  return id !== "events" &&
    id !== "competitions" &&
    id !== "clubs" &&
    id !== "workshops";
}
