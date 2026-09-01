/** Mirrors backend admissions DTOs — keep in sync with domains/admissions/types.ts. */

export type AdmissionProgramStatus = "draft" | "published" | "archived";
export type AdmissionOpeningStatus = "draft" | "open" | "closed";

export type AdmissionProgramDto = {
  id: string;
  instituteId: string;
  name: string;
  slug: string;
  description: string | null;
  duration: string | null;
  eligibility: string | null;
  ageCriteria: string | null;
  seatsAvailable: number;
  grades: unknown;
  academicYearLabel: string | null;
  applicationDeadline: string | null;
  status: AdmissionProgramStatus;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type AdmissionOpeningDto = {
  id: string;
  instituteId: string;
  programId: string;
  name: string;
  slug: string;
  description: string | null;
  seatsAvailable: number;
  academicYearLabel: string | null;
  applicationDeadline: string | null;
  status: AdmissionOpeningStatus;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type AdmissionProgramListItem = {
  id: string;
  name: string;
  slug: string;
  status: AdmissionProgramStatus;
  seatsAvailable: number;
  academicYearLabel: string;
  applicationDeadline: string;
};

export type AdmissionOpeningListItem = {
  id: string;
  programId: string;
  name: string;
  slug: string;
  status: AdmissionOpeningStatus;
  seatsAvailable: number;
  academicYearLabel: string;
  applicationDeadline: string;
};

export type ListAdmissionProgramsParams = {
  instituteId: string;
};

export type ListAdmissionOpeningsParams = {
  instituteId: string;
};

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

export type AdmissionDocumentDto = {
  id: string;
  instituteId: string;
  applicationId: string;
  docType:
    | "birth_certificate"
    | "transfer_certificate"
    | "marks_memo"
    | "student_photo"
    | "parent_id"
    | "additional";
  label: string;
  fileName: string | null;
  assetPath: string | null;
  status:
    | "not_uploaded"
    | "uploaded"
    | "under_review"
    | "verified"
    | "rejected"
    | "resubmission_required";
  note: string | null;
  uploadedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};
