/** Mirrors backend AdmissionApplicationDto — keep in sync with domains/admissions/types.ts. */

export type AdmissionApplicationStatus =
  | "draft"
  | "submitted"
  | "review"
  | "verification"
  | "parent_confirmation"
  | "waitlisted"
  | "approved"
  | "rejected"
  | "withdrawn";

export type AdmissionApplicationDto = {
  id: string;
  instituteId: string;
  openingId: string;
  programId: string;
  applicantUserId: string;
  studentDisplayName: string;
  status: AdmissionApplicationStatus;
  payload: unknown;
  decisionNote: string | null;
  convertedStudentId: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdmissionApplicationStage =
  | "submitted"
  | "review"
  | "verification"
  | "approved"
  | "parent_confirmation"
  | "waitlisted"
  | "rejected"
  | "withdrawn";

/** Shape-compatible with demo AdminSyncRow for shared admissions UI. */
export type AdmissionApplicationListItem = {
  id: string;
  name: string;
  grade: string;
  stage: AdmissionApplicationStage;
  applied: string;
  docs: string;
  instituteId?: string;
};

export type ListAdmissionApplicationsParams = {
  instituteId: string;
};
