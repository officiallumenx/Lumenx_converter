import type { ActivityAttachment } from "@/activity-workspace/hub/attachments";
import type { SportsActivityNotificationPrefs } from "./activities-types";
import type { SportType } from "./types";

/** Result lifecycle — distinct from tournament match scheduling status. */
export type MatchResultStatus = "completed" | "abandoned" | "walkover" | "cancelled";

/** Mock sport statistics — analytics-ready keyed object. */
export interface MatchResultStatistics {
  goals?: number;
  runs?: number;
  points?: number;
  fouls?: number;
  yellowCards?: number;
  redCards?: number;
  possessionPct?: number;
  extras?: string;
}

/** Mock individual highlights per match. */
export interface MatchResultHighlights {
  highestScorer?: string;
  bestDefender?: string;
  bestGoalkeeper?: string;
  bestBatsman?: string;
  bestBowler?: string;
  other?: string;
}

export interface MatchResultAwards {
  mvp?: string;
  bestPerformer?: string;
  fairPlayAward?: string;
  coachRemarks?: string;
}

/** Child record — must reference exactly one tournament match. */
export interface MatchResult {
  id: string;
  tournamentMatchId: string;
  tournamentId: string;
  tournamentName: string;
  matchName: string;
  sportType: SportType;
  matchDate: string;
  venue: string;
  matchStatus: MatchResultStatus;
  winnerId?: string;
  winnerName?: string;
  runnerUpId?: string;
  runnerUpName?: string;
  isDraw: boolean;
  finalScore: string;
  matchSummary: string;
  awards: MatchResultAwards;
  statistics: MatchResultStatistics;
  highlights: MatchResultHighlights;
  attachments: ActivityAttachment[];
  notifications: SportsActivityNotificationPrefs;
  resultPublishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MatchResultInput {
  tournamentMatchId: string;
  matchStatus: MatchResultStatus;
  winnerId?: string;
  winnerName?: string;
  runnerUpId?: string;
  runnerUpName?: string;
  isDraw: boolean;
  finalScore: string;
  matchSummary: string;
  awards: MatchResultAwards;
  statistics: MatchResultStatistics;
  highlights: MatchResultHighlights;
  attachments: ActivityAttachment[];
  notifications?: SportsActivityNotificationPrefs;
}

export type MatchResultSortField = "date" | "updatedAt";

export interface MatchResultListFilters {
  query?: string;
  tournamentId?: string | "all";
  sportType?: SportType | "all";
  matchStatus?: MatchResultStatus | "all";
  winner?: string | "all";
  date?: string | "all";
  sortBy?: MatchResultSortField;
  sortDir?: "asc" | "desc";
}

export const MATCH_RESULT_STATUS_LABELS: Record<MatchResultStatus, string> = {
  completed: "Completed",
  abandoned: "Abandoned",
  walkover: "Walkover",
  cancelled: "Cancelled",
};

export const MATCH_STAT_KEYS = [
  "goals",
  "runs",
  "points",
  "fouls",
  "yellowCards",
  "redCards",
  "possessionPct",
] as const;

export const MATCH_STAT_LABELS: Record<(typeof MATCH_STAT_KEYS)[number] | "extras", string> = {
  goals: "Goals",
  runs: "Runs",
  points: "Points",
  fouls: "Fouls",
  yellowCards: "Yellow Cards",
  redCards: "Red Cards",
  possessionPct: "Possession %",
  extras: "Extras",
};

export const HIGHLIGHT_FIELD_LABELS: Record<keyof MatchResultHighlights, string> = {
  highestScorer: "Highest Scorer",
  bestDefender: "Best Defender",
  bestGoalkeeper: "Best Goalkeeper",
  bestBatsman: "Best Batsman",
  bestBowler: "Best Bowler",
  other: "Other Highlight",
};
