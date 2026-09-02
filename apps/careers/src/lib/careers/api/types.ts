/** Mirrors backend careers DTOs — keep in sync with backend/src/domains/careers/types.ts */

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

export type CandidateProfileDto = {
  id: string;
  instituteId: string;
  userProfileId: string;
  displayName: string;
  headline: string | null;
  summary: string | null;
  phone: string | null;
  email: string | null;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
};

export type UserSavedItemDto = {
  id: string;
  instituteId: string;
  userProfileId: string;
  itemKind: "career_job";
  itemId: string;
  createdAt: string;
  updatedAt: string;
};

export type TalentPoolEntryDto = {
  id: string;
  instituteId: string;
  candidateUserId: string;
  candidateProfileId: string | null;
  notes: string | null;
  status: "active" | "archived";
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type ListCareerJobsParams = { instituteId: string };
export type ListCareerApplicationsParams = { instituteId: string };
