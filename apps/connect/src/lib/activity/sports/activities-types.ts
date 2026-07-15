import type { ActivityAttachment } from "@/activity-workspace/hub/attachments";
import type { ActivityAudienceSelection } from "@/activity-workspace/hub/audience";
import type { SportType } from "./types";

/** Operational record status — Sports Activities screen. */
export type SportsActivityStatus =
  | "draft"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "archived";

export type SportsActivityType =
  | "practice"
  | "match"
  | "trial"
  | "training"
  | "coaching"
  | "event"
  | "session";

export interface SportsActivityCoordinator {
  sportsCoordinator: string;
  coach: string;
  assistantCoach?: string;
}

export interface SportsActivityNotificationPrefs {
  /** Notify audience per Activity Hub selection. */
  notifyAudience: boolean;
  notifyParents: boolean;
  notifyTeachers: boolean;
}

/** Scheduled operational sports record (not a master entity). */
export interface SportsActivity {
  id: string;
  title: string;
  activityType: SportsActivityType;
  sportType: SportType;
  description: string;
  venue: string;
  /** ISO yyyy-mm-dd */
  date: string;
  startTime: string;
  endTime: string;
  status: SportsActivityStatus;
  audience: ActivityAudienceSelection;
  attachments: ActivityAttachment[];
  coordinators: SportsActivityCoordinator;
  /** Linked sports team ids — used for team filter. */
  linkedTeamIds: string[];
  notifications: SportsActivityNotificationPrefs;
  publishedAt?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SportsActivityInput {
  title: string;
  activityType: SportsActivityType;
  sportType: SportType;
  description: string;
  venue: string;
  date: string;
  startTime: string;
  endTime: string;
  audience: ActivityAudienceSelection;
  attachments: ActivityAttachment[];
  coordinators: SportsActivityCoordinator;
  linkedTeamIds?: string[];
  notifications?: SportsActivityNotificationPrefs;
}

export type SportsActivitySortField = "date" | "sport" | "updatedAt";

export interface SportsActivityListFilters {
  query?: string;
  sportType?: SportType | "all";
  teamId?: string | "all";
  status?: SportsActivityStatus | "all";
  date?: string | "all";
  coordinator?: string | "all";
  sortBy?: SportsActivitySortField;
  sortDir?: "asc" | "desc";
}

export const SPORTS_ACTIVITY_TYPE_LABELS: Record<SportsActivityType, string> = {
  practice: "Practice",
  match: "Match",
  trial: "Trial",
  training: "Training",
  coaching: "Coaching",
  event: "Event",
  session: "Session",
};

export const SPORTS_ACTIVITY_STATUS_LABELS: Record<SportsActivityStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  archived: "Archived",
};
