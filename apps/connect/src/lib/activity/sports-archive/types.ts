import type { SportType } from "@/lib/activity/sports/types";

export type SportsArchiveModule =
  | "teams"
  | "activities"
  | "practice"
  | "attendance"
  | "coach_notes"
  | "tournaments"
  | "match_results"
  | "achievements"
  | "certificates";

export type SportsArchiveRecordStatus = "archived" | "restored";

export interface SportsArchiveRecord {
  id: string;
  sourceModule: SportsArchiveModule;
  sourceId: string;
  title: string;
  subtitle?: string;
  academicYear: string;
  teamId?: string;
  teamName?: string;
  sportType?: SportType;
  archivedAt: string;
  archivedBy: string;
  reason: string;
  status: SportsArchiveRecordStatus;
  restoredAt?: string;
  restoredBy?: string;
  summary?: string;
}

export interface SportsArchiveInput {
  sourceModule: SportsArchiveModule;
  sourceId: string;
  reason: string;
  archivedBy: string;
}

export interface SportsArchiveRestoreInput {
  restoredBy: string;
}

export type SportsArchiveSortField = "archivedAt" | "title" | "module";

export type SportsArchiveHistoryTab = "all" | "archived" | "restored";

export interface SportsArchiveListFilters {
  query?: string;
  sourceModule?: SportsArchiveModule | "all";
  academicYear?: string | "all";
  teamId?: string | "all";
  sportType?: SportType | "all";
  archivedDate?: string | "all";
  status?: SportsArchiveRecordStatus | "all";
  historyTab?: SportsArchiveHistoryTab;
  sortBy?: SportsArchiveSortField;
  sortDir?: "asc" | "desc";
}

export const ARCHIVE_MODULE_LABELS: Record<SportsArchiveModule, string> = {
  teams: "Sports Teams",
  activities: "Sports Activities",
  practice: "Practice Sessions",
  attendance: "Attendance",
  coach_notes: "Coach Notes",
  tournaments: "Tournaments",
  match_results: "Match Results",
  achievements: "Achievements",
  certificates: "Certificates",
};

export const ARCHIVE_STATUS_LABELS: Record<SportsArchiveRecordStatus, string> = {
  archived: "Archived",
  restored: "Restored",
};

export const ARCHIVE_HISTORY_TAB_LABELS: Record<SportsArchiveHistoryTab, string> = {
  all: "All history",
  archived: "Archived",
  restored: "Restored",
};

export const ARCHIVE_MODULE_COLORS: Record<SportsArchiveModule, string> = {
  teams: "bg-sky-500",
  activities: "bg-blue-500",
  practice: "bg-emerald-500",
  attendance: "bg-teal-500",
  coach_notes: "bg-violet-500",
  tournaments: "bg-amber-500",
  match_results: "bg-orange-500",
  achievements: "bg-rose-500",
  certificates: "bg-cyan-500",
};
