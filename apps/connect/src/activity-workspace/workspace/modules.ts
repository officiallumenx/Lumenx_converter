/**

 * Activity Workspace — module registry.

 */

import type { ActivityModuleId, ActivityWorkspaceModuleId } from "../core/types";



export type ActivityWorkspaceModule = {

  id: ActivityModuleId;

  label: string;

  description: string;

  role: "landing" | "module" | "legacy";

};



export const ACTIVITY_WORKSPACE_MODULES: readonly ActivityWorkspaceModule[] = [

  { id: "dashboard", label: "Dashboard", description: "Overview and quick access", role: "landing" },

  { id: "sports", label: "Sports", description: "Sections, teams, students & performance", role: "module" },

  {

    id: "extra-curricular",

    label: "Extra-Curricular",

    description: "Dance, music, drama, clubs & groups",

    role: "module",

  },

  { id: "attendance", label: "Attendance", description: "Class-wise or team-wise marking", role: "module" },

  { id: "achievements", label: "Achievements", description: "Sports & ECA team achievements", role: "module" },

  { id: "messages", label: "Messages", description: "Send to teams by Sports or ECA", role: "module" },

  { id: "notifications", label: "Notifications", description: "Activity workspace alerts", role: "module" },

  { id: "announcements", label: "Announcements", description: "Send & receive announcements", role: "module" },

  { id: "certificates", label: "Certificates", description: "Issue to teams with names", role: "module" },

  { id: "practice", label: "Practice", description: "Assign practice by team", role: "module" },

  { id: "calendar", label: "Calendar", description: "Personal reminders & tasks", role: "module" },

  { id: "profile", label: "Settings", description: "Profile & role switch", role: "module" },

  { id: "events", label: "Events", description: "Legacy", role: "legacy" },

  { id: "competitions", label: "Competitions", description: "Legacy", role: "legacy" },

  { id: "clubs", label: "Clubs", description: "Legacy", role: "legacy" },

  { id: "workshops", label: "Workshops", description: "Legacy", role: "legacy" },

] as const;



export const ACTIVITY_WORKSPACE_LANDING: ActivityWorkspaceModuleId = "dashboard";



export function isActivityLandingModule(id: ActivityModuleId): boolean {

  return id === ACTIVITY_WORKSPACE_LANDING;

}



export function getActivityWorkspaceModule(id: ActivityModuleId) {
  return ACTIVITY_WORKSPACE_MODULES.find((m) => m.id === id);
}

