/** Mirrors backend careers DTOs — keep in sync with domains/careers/types.ts. */

export type CareerJobStatus = "draft" | "open" | "closed";
export type CareerEmploymentType = "full_time" | "part_time" | "contract";
export type CareerWorkMode = "onsite" | "remote" | "hybrid";

export type CareerJobDto = {
  id: string;
  instituteId: string;
  title: string;
  slug: string;
  description: string | null;
  category: string;
  employmentType: CareerEmploymentType;
  workMode: CareerWorkMode;
  locationLabel: string | null;
  openingsCount: number;
  status: CareerJobStatus;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type CareerJobListItem = {
  id: string;
  title: string;
  category: string;
  status: CareerJobStatus;
  employmentTypeLabel: string;
  workModeLabel: string;
  locationLabel: string;
  openingsCount: number;
};

export type ListCareerJobsParams = {
  instituteId: string;
};

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
