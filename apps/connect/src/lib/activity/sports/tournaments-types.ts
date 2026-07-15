import type { ActivityAudienceSelection } from "@/activity-workspace/hub/audience";
import type { SportsActivityNotificationPrefs } from "./activities-types";
import type { SportType } from "./types";

export type TournamentType =
  | "intra_school"
  | "inter_school"
  | "district"
  | "state"
  | "national"
  | "international";

export type TournamentStatus =
  | "draft"
  | "scheduled"
  | "ongoing"
  | "completed"
  | "cancelled"
  | "archived";

export type TournamentMatchStage = "league" | "quarter_final" | "semi_final" | "final";

export type TournamentMatchStatus = "scheduled" | "ongoing" | "completed" | "cancelled";

/** Scheduled match under a tournament — no scores/results on this screen. */
export interface TournamentMatch {
  id: string;
  tournamentId: string;
  name: string;
  stage: TournamentMatchStage;
  date: string;
  time: string;
  venue: string;
  teamIds: string[];
  teamNames: string[];
  status: TournamentMatchStatus;
}

/** Parent tournament record. */
export interface SportsTournament {
  id: string;
  name: string;
  tournamentType: TournamentType;
  sportType: SportType;
  academicYear: string;
  venue: string;
  startDate: string;
  endDate: string;
  organizer: string;
  description: string;
  status: TournamentStatus;
  audience: ActivityAudienceSelection;
  linkedTeamIds: string[];
  matches: TournamentMatch[];
  notifications: SportsActivityNotificationPrefs;
  publishedAt?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TournamentMatchInput {
  name: string;
  stage: TournamentMatchStage;
  date: string;
  time: string;
  venue: string;
  teamIds: string[];
  teamNames: string[];
  status?: TournamentMatchStatus;
}

export interface SportsTournamentInput {
  name: string;
  tournamentType: TournamentType;
  sportType: SportType;
  academicYear: string;
  venue: string;
  startDate: string;
  endDate: string;
  organizer: string;
  description: string;
  audience: ActivityAudienceSelection;
  linkedTeamIds?: string[];
  matches?: TournamentMatchInput[];
  notifications?: SportsActivityNotificationPrefs;
}

export type TournamentSortField = "date" | "updatedAt";

export interface TournamentListFilters {
  query?: string;
  sportType?: SportType | "all";
  tournamentType?: TournamentType | "all";
  status?: TournamentStatus | "all";
  academicYear?: string | "all";
  sortBy?: TournamentSortField;
  sortDir?: "asc" | "desc";
}

export const TOURNAMENT_TYPE_LABELS: Record<TournamentType, string> = {
  intra_school: "Intra School",
  inter_school: "Inter School",
  district: "District",
  state: "State",
  national: "National",
  international: "International",
};

export const TOURNAMENT_STATUS_LABELS: Record<TournamentStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  ongoing: "Ongoing",
  completed: "Completed",
  cancelled: "Cancelled",
  archived: "Archived",
};

export const TOURNAMENT_MATCH_STAGE_LABELS: Record<TournamentMatchStage, string> = {
  league: "League",
  quarter_final: "Quarter Final",
  semi_final: "Semi Final",
  final: "Final",
};

export const TOURNAMENT_MATCH_STATUS_LABELS: Record<TournamentMatchStatus, string> = {
  scheduled: "Scheduled",
  ongoing: "Ongoing",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const TOURNAMENT_ACADEMIC_YEARS = ["2025–26", "2024–25", "2026–27"] as const;
