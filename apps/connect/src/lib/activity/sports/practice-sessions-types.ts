import type { SportsActivityNotificationPrefs } from "./activities-types";

/** Execution record status — Practice Sessions screen. */
export type PracticeSessionStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "archived";

/** Child execution record — must always reference a parent Sports Activity. */
export interface PracticeSession {
  id: string;
  title: string;
  /** Required parent reference — no standalone sessions. */
  sportsActivityId: string;
  /** Denormalized for list cards — synced from parent on write. */
  sportsActivityTitle: string;
  teamId: string;
  teamName: string;
  coach: string;
  assistantCoach?: string;
  venue: string;
  date: string;
  startTime: string;
  endTime: string;
  objectives: string;
  equipmentRequired: string;
  notes: string;
  status: PracticeSessionStatus;
  notifications: SportsActivityNotificationPrefs;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PracticeSessionInput {
  title: string;
  sportsActivityId: string;
  teamId: string;
  coach: string;
  assistantCoach?: string;
  venue: string;
  date: string;
  startTime: string;
  endTime: string;
  objectives: string;
  equipmentRequired: string;
  notes: string;
  notifications?: SportsActivityNotificationPrefs;
}

export type PracticeSessionSortField = "date" | "updatedAt";

export interface PracticeSessionListFilters {
  query?: string;
  sportsActivityId?: string | "all";
  teamId?: string | "all";
  coach?: string | "all";
  status?: PracticeSessionStatus | "all";
  date?: string | "all";
  sortBy?: PracticeSessionSortField;
  sortDir?: "asc" | "desc";
}

export const PRACTICE_SESSION_STATUS_LABELS: Record<PracticeSessionStatus, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  archived: "Archived",
};
