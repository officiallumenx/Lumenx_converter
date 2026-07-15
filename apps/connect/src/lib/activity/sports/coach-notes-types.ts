import type { SportsPerformanceRating } from "./sports-attendance-types";

/** Mock performance metric scores (1–5) — analytics-ready shape. */
export type CoachMetricKey =
  | "fitness"
  | "discipline"
  | "teamwork"
  | "technique"
  | "speed"
  | "stamina"
  | "leadership";

export type CoachPerformanceMetrics = Record<CoachMetricKey, number>;

/** Child record — must always reference exactly one attendance record. */
export interface CoachNoteRecord {
  id: string;
  attendanceRecordId: string;
  practiceSessionId: string;
  practiceSessionTitle: string;
  teamId: string;
  teamName: string;
  sessionDate: string;
  studentId: string;
  studentName: string;
  studentClassLabel: string;
  coach: string;
  performanceRating: SportsPerformanceRating;
  skillsObserved: string;
  strengths: string;
  improvementAreas: string;
  coachNotes: string;
  nextPracticeGoals: string;
  followUpRequired: boolean;
  metrics: CoachPerformanceMetrics;
  followUpNotifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CoachNoteInput {
  attendanceRecordId: string;
  coach: string;
  performanceRating: SportsPerformanceRating;
  skillsObserved: string;
  strengths: string;
  improvementAreas: string;
  coachNotes: string;
  nextPracticeGoals: string;
  followUpRequired: boolean;
  metrics: CoachPerformanceMetrics;
}

export type CoachNoteSortField = "student" | "rating" | "updatedAt";

export interface CoachNoteListFilters {
  query?: string;
  practiceSessionId?: string | "all";
  teamId?: string | "all";
  studentId?: string | "all";
  coach?: string | "all";
  rating?: SportsPerformanceRating | "all";
  date?: string | "all";
  sortBy?: CoachNoteSortField;
  sortDir?: "asc" | "desc";
}

export interface CoachNoteSummary {
  excellent: number;
  good: number;
  average: number;
  needsImprovement: number;
  followUpRequired: number;
  total: number;
}

export const COACH_METRIC_LABELS: Record<CoachMetricKey, string> = {
  fitness: "Fitness",
  discipline: "Discipline",
  teamwork: "Teamwork",
  technique: "Technique",
  speed: "Speed",
  stamina: "Stamina",
  leadership: "Leadership",
};

export const COACH_METRIC_KEYS = Object.keys(COACH_METRIC_LABELS) as CoachMetricKey[];

export function defaultCoachMetrics(): CoachPerformanceMetrics {
  return {
    fitness: 3,
    discipline: 3,
    teamwork: 3,
    technique: 3,
    speed: 3,
    stamina: 3,
    leadership: 3,
  };
}
