/** Mirrors backend CareerApplicationDto — keep in sync with domains/careers/types.ts. */

export type CareerApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "shortlisted"
  | "assessment"
  | "demo_class"
  | "interview_scheduled"
  | "interview_completed"
  | "offer_sent"
  | "offer_accepted"
  | "selected"
  | "rejected"
  | "on_hold"
  | "withdrawn";

export type CareerApplicationDto = {
  id: string;
  instituteId: string;
  jobId: string;
  candidateProfileId: string | null;
  applicantUserId: string;
  status: CareerApplicationStatus;
  coverLetter: string | null;
  payload: unknown;
  decisionNote: string | null;
  convertedTeacherId: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CareerApplicationStage =
  | "review"
  | "verification"
  | "interview"
  | "approved"
  | "waitlist"
  | "rejected";

/** Shape-compatible with demo AdminCareerSyncRow. */
export type CareerApplicationListItem = {
  id: string;
  name: string;
  role: string;
  stage: CareerApplicationStage;
  applied: string;
  docs: string;
  institute?: string;
  jobId?: string;
};

export type ListCareerApplicationsParams = {
  instituteId: string;
};
