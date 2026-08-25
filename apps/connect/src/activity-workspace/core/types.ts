/** Activity Coordinator workspace — primary modules (nav + dashboard). */
export type ActivityWorkspaceModuleId =
  | "dashboard"
  | "sports"
  | "extra-curricular"
  | "attendance"
  | "diary"
  | "achievements"
  | "messages"
  | "notifications"
  | "announcements"
  | "practice"
  | "calendar"
  | "profile";

/** Alias — finalized V1 Activity Coordinator modules only. */
export type ActivityModuleId = ActivityWorkspaceModuleId;

export function isPrimaryWorkspaceModule(_id: ActivityModuleId): _id is ActivityWorkspaceModuleId {
  return true;
}
