export type TrialStatus = "draft" | "open" | "evaluating" | "completed" | "archived";

export type CandidateStatus =
  | "registered"
  | "evaluated"
  | "selected"
  | "waiting"
  | "rejected";

export type SelectionViewTab =
  | "trials"
  | "candidates"
  | "selected"
  | "waiting"
  | "rejected";

export type EvaluationMetricKey =
  | "technique"
  | "speed"
  | "strength"
  | "discipline"
  | "attendance"
  | "coachRating";

export interface CommitteeMember {
  id: string;
  name: string;
  role: string;
}

export interface CandidateEvaluation {
  technique: number;
  speed: number;
  strength: number;
  discipline: number;
  attendance: number;
  coachRating: number;
  totalScore: number;
  evaluatedBy: string;
  evaluatedAt: string;
  notes?: string;
}

export interface SelectionCandidate {
  id: string;
  trialId: string;
  studentId: string;
  studentName: string;
  classLabel: string;
  registeredAt: string;
  status: CandidateStatus;
  evaluation?: CandidateEvaluation;
  rank?: number;
  notified: boolean;
  notifiedAt?: string;
}

export interface SelectionTrial {
  id: string;
  title: string;
  sport: string;
  teamId: string;
  teamName: string;
  trialDate: string;
  venue: string;
  maxSlots: number;
  waitingListSlots: number;
  status: TrialStatus;
  description: string;
  committee: CommitteeMember[];
  createdAt: string;
  updatedAt: string;
}

export interface SelectionTrialInput {
  title: string;
  sport: string;
  teamId: string;
  teamName: string;
  trialDate: string;
  venue: string;
  maxSlots: number;
  waitingListSlots: number;
  description: string;
}

export interface CandidateRegistrationInput {
  studentId: string;
  studentName: string;
  classLabel: string;
}

export interface CandidateEvaluationInput {
  technique: number;
  speed: number;
  strength: number;
  discipline: number;
  attendance: number;
  coachRating: number;
  evaluatedBy: string;
  notes?: string;
}

export interface CommitteeMemberInput {
  name: string;
  role: string;
}

export type TrialSortField = "date" | "title" | "updatedAt";

export interface TrialListFilters {
  query?: string;
  status?: TrialStatus | "all";
  sortBy?: TrialSortField;
  sortDir?: "asc" | "desc";
}

export interface CandidateListFilters {
  query?: string;
  trialId?: string | "all";
  status?: CandidateStatus | "all";
  sortBy?: "rank" | "student" | "score";
  sortDir?: "asc" | "desc";
}

export const TRIAL_STATUS_LABELS: Record<TrialStatus, string> = {
  draft: "Draft",
  open: "Open for Registration",
  evaluating: "Evaluating",
  completed: "Completed",
  archived: "Archived",
};

export const CANDIDATE_STATUS_LABELS: Record<CandidateStatus, string> = {
  registered: "Registered",
  evaluated: "Evaluated",
  selected: "Selected",
  waiting: "Waiting List",
  rejected: "Rejected",
};

export const EVALUATION_METRIC_LABELS: Record<EvaluationMetricKey, string> = {
  technique: "Technique",
  speed: "Speed",
  strength: "Strength",
  discipline: "Discipline",
  attendance: "Attendance",
  coachRating: "Coach Rating",
};

export const SELECTION_VIEW_TAB_LABELS: Record<SelectionViewTab, string> = {
  trials: "Selection Trials",
  candidates: "Candidates",
  selected: "Selected Players",
  waiting: "Waiting List",
  rejected: "Rejected Players",
};

export const WORKFLOW_STEPS = ["Register", "Evaluate", "Rank", "Select", "Notify"] as const;

export function computeEvaluationScore(input: Omit<CandidateEvaluationInput, "evaluatedBy" | "notes">): number {
  const values = [
    input.technique,
    input.speed,
    input.strength,
    input.discipline,
    input.attendance,
    input.coachRating,
  ];
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

export function defaultEvaluationMetrics(): Record<EvaluationMetricKey, number> {
  return {
    technique: 5,
    speed: 5,
    strength: 5,
    discipline: 5,
    attendance: 5,
    coachRating: 5,
  };
}
