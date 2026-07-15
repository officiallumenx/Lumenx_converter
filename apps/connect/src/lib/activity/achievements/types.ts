import type { ActivityCategoryId } from "@/activity-workspace/hub/categories";

/** Workspace module that produced the achievement — aligns with Activity Hub categories. */
export type AchievementSourceModule = ActivityCategoryId;

/** Kind of source record within a module — extensible per module without schema changes. */
export type AchievementSourceRecordKind =
  | "match_result"
  | "coach_note"
  | "attendance"
  | "tournament"
  | "activity"
  | "event"
  | "club_milestone"
  | "workshop_completion"
  | "competition_result"
  | "custom";

export type AchievementType =
  | "winner"
  | "runner_up"
  | "participation"
  | "mvp"
  | "best_performer"
  | "fair_play"
  | "leadership"
  | "attendance_excellence"
  | "coach_recognition"
  | "custom";

export type AchievementLevel =
  | "school"
  | "inter_school"
  | "district"
  | "state"
  | "national"
  | "international";

export interface AchievementSourceRef {
  module: AchievementSourceModule;
  recordId: string;
  recordLabel: string;
  recordKind: AchievementSourceRecordKind;
}

export interface AchievementNotificationPrefs {
  notifyStudent: boolean;
  notifyParents: boolean;
  notifyTeachers: boolean;
}

/** Generic activity workspace achievement — not sports-specific. */
export interface ActivityAchievement {
  id: string;
  title: string;
  achievementType: AchievementType;
  level: AchievementLevel;
  source: AchievementSourceRef;
  studentId: string;
  studentName: string;
  studentClassLabel: string;
  teamId?: string;
  teamName?: string;
  date: string;
  description: string;
  notifications: AchievementNotificationPrefs;
  awardedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityAchievementInput {
  title: string;
  achievementType: AchievementType;
  level: AchievementLevel;
  sourceModule: AchievementSourceModule;
  sourceRecordId: string;
  sourceRecordKind: AchievementSourceRecordKind;
  studentId: string;
  studentName: string;
  studentClassLabel: string;
  teamId?: string;
  teamName?: string;
  date: string;
  description: string;
  notifications?: AchievementNotificationPrefs;
}

export type AchievementSortField = "date" | "student" | "updatedAt";

export interface AchievementListFilters {
  query?: string;
  achievementType?: AchievementType | "all";
  level?: AchievementLevel | "all";
  studentId?: string | "all";
  teamId?: string | "all";
  sourceModule?: AchievementSourceModule | "all";
  date?: string | "all";
  sortBy?: AchievementSortField;
  sortDir?: "asc" | "desc";
}

export const ACHIEVEMENT_TYPE_LABELS: Record<AchievementType, string> = {
  winner: "Winner",
  runner_up: "Runner-up",
  participation: "Participation",
  mvp: "MVP",
  best_performer: "Best Performer",
  fair_play: "Fair Play",
  leadership: "Leadership",
  attendance_excellence: "Attendance Excellence",
  coach_recognition: "Coach Recognition",
  custom: "Custom",
};

export const ACHIEVEMENT_LEVEL_LABELS: Record<AchievementLevel, string> = {
  school: "School",
  inter_school: "Inter School",
  district: "District",
  state: "State",
  national: "National",
  international: "International",
};

export const ACHIEVEMENT_SOURCE_MODULE_LABELS: Record<AchievementSourceModule, string> = {
  sports: "Sports",
  events: "Events",
  clubs: "Clubs",
  workshops: "Workshops",
  competitions: "Competitions",
};

export const ACHIEVEMENT_SOURCE_KIND_LABELS: Record<AchievementSourceRecordKind, string> = {
  match_result: "Match Result",
  coach_note: "Coach Note",
  attendance: "Attendance",
  tournament: "Tournament",
  activity: "Activity",
  event: "Event",
  club_milestone: "Club Milestone",
  workshop_completion: "Workshop Completion",
  competition_result: "Competition Result",
  custom: "Custom",
};
