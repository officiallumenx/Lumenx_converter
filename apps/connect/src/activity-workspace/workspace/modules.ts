/**
 * Activity Workspace — module registry (finalized V1 workflow).
 */

import type { ActivityModuleId, ActivityWorkspaceModuleId } from "../core/types";

export type ActivityWorkspaceModule = {
  id: ActivityModuleId;
  label: string;
  /** Shorter label for bottom nav / tight UI. */
  shortLabel?: string;
  description: string;
  role: "landing" | "module";
};

export const ACTIVITY_WORKSPACE_MODULES: readonly ActivityWorkspaceModule[] = [
  { id: "dashboard", label: "Home", shortLabel: "Home", description: "Overview and shortcuts", role: "landing" },
  {
    id: "sports",
    label: "Sports",
    description: "Teams and student rosters",
    role: "module",
  },
  {
    id: "extra-curricular",
    label: "Extra-Curricular",
    shortLabel: "ECA",
    description: "Groups and student rosters",
    role: "module",
  },
  {
    id: "attendance",
    label: "Attendance",
    description: "Mark a team or group",
    role: "module",
  },
  {
    id: "diary",
    label: "Diary Book",
    shortLabel: "Diary",
    description: "Daily class notes for the principal",
    role: "module",
  },
  {
    id: "achievements",
    label: "Achievements",
    description: "Team/Group or student from that roster",
    role: "module",
  },
  {
    id: "messages",
    label: "Messages",
    description: "Send to a Sports team or ECA group",
    role: "module",
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Read-only alerts from Activity actions",
    role: "module",
  },
  {
    id: "announcements",
    label: "Announcements",
    shortLabel: "Announce",
    description: "Send to a Sports team or ECA group",
    role: "module",
  },
  {
    id: "practice",
    label: "Practice",
    description: "Schedule team or group practice",
    role: "module",
  },
  {
    id: "calendar",
    label: "Calendar",
    description: "Sports, ECA, practice, programmes, reminders",
    role: "module",
  },
  {
    id: "profile",
    label: "Settings",
    description: "Profile, alerts, Dual Role, help",
    role: "module",
  },
] as const;

export const ACTIVITY_WORKSPACE_LANDING: ActivityWorkspaceModuleId = "dashboard";

export function isActivityLandingModule(id: ActivityModuleId): boolean {
  return id === ACTIVITY_WORKSPACE_LANDING;
}

export function getActivityWorkspaceModule(id: ActivityModuleId) {
  return ACTIVITY_WORKSPACE_MODULES.find((m) => m.id === id);
}
