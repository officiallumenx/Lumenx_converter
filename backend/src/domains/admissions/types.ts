/** Admissions foundation types (step 6.1). */

export type AdmissionProgramStatus = "draft" | "published" | "archived";
export type AdmissionOpeningStatus = "draft" | "open" | "closed";
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
export type AdmissionDocumentType =
  | "birth_certificate"
  | "transfer_certificate"
  | "marks_memo"
  | "student_photo"
  | "parent_id"
  | "additional";
export type AdmissionDocumentStatus =
  | "not_uploaded"
  | "uploaded"
  | "under_review"
  | "verified"
  | "rejected"
  | "resubmission_required";
export type AdmissionInquiryCategory =
  | "admission"
  | "program"
  | "fees"
  | "transport"
  | "hostel"
  | "general";
export type AdmissionInquiryStatus = "open" | "responded" | "closed";

export type AdmissionProgramRow = {
  id: string;
  institute_id: string;
  name: string;
  slug: string;
  description: string | null;
  duration: string | null;
  eligibility: string | null;
  age_criteria: string | null;
  seats_available: number;
  grades: unknown;
  academic_year_label: string | null;
  application_deadline: string | null;
  status: AdmissionProgramStatus;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

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

export type AdmissionOpeningRow = {
  id: string;
  institute_id: string;
  program_id: string;
  name: string;
  slug: string;
  description: string | null;
  seats_available: number;
  academic_year_label: string | null;
  application_deadline: string | null;
  status: AdmissionOpeningStatus;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
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

export type AdmissionApplicationRow = {
  id: string;
  institute_id: string;
  opening_id: string;
  program_id: string;
  applicant_user_id: string;
  student_display_name: string;
  status: AdmissionApplicationStatus;
  payload: unknown;
  decision_note: string | null;
  converted_student_id: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

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

export type AdmissionDocumentRow = {
  id: string;
  institute_id: string;
  application_id: string;
  doc_type: AdmissionDocumentType;
  label: string;
  file_name: string | null;
  asset_path: string | null;
  status: AdmissionDocumentStatus;
  note: string | null;
  uploaded_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type AdmissionDocumentDto = {
  id: string;
  instituteId: string;
  applicationId: string;
  docType: AdmissionDocumentType;
  label: string;
  fileName: string | null;
  assetPath: string | null;
  status: AdmissionDocumentStatus;
  note: string | null;
  uploadedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdmissionInquiryRow = {
  id: string;
  institute_id: string;
  category: AdmissionInquiryCategory;
  subject: string;
  body: string;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  status: AdmissionInquiryStatus;
  response_note: string | null;
  requested_by_user_id: string | null;
  responded_by_user_id: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type AdmissionInquiryDto = {
  id: string;
  instituteId: string;
  category: AdmissionInquiryCategory;
  subject: string;
  body: string;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  status: AdmissionInquiryStatus;
  responseNote: string | null;
  requestedByUserId: string | null;
  respondedByUserId: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateProgramInput = {
  instituteId: string;
  name: string;
  slug: string;
  description?: string | null;
  duration?: string | null;
  eligibility?: string | null;
  ageCriteria?: string | null;
  seatsAvailable?: number;
  grades?: unknown;
  academicYearLabel?: string | null;
  applicationDeadline?: string | null;
  publishNow?: boolean;
};

export type UpdateProgramInput = {
  name?: string;
  slug?: string;
  description?: string | null;
  duration?: string | null;
  eligibility?: string | null;
  ageCriteria?: string | null;
  seatsAvailable?: number;
  grades?: unknown;
  academicYearLabel?: string | null;
  applicationDeadline?: string | null;
  status?: AdmissionProgramStatus;
};

export type CreateOpeningInput = {
  instituteId: string;
  programId: string;
  name: string;
  slug: string;
  description?: string | null;
  seatsAvailable?: number;
  academicYearLabel?: string | null;
  applicationDeadline?: string | null;
  openNow?: boolean;
};

export type UpdateOpeningInput = {
  name?: string;
  slug?: string;
  description?: string | null;
  seatsAvailable?: number;
  academicYearLabel?: string | null;
  applicationDeadline?: string | null;
  status?: AdmissionOpeningStatus;
};

export type CreateApplicationInput = {
  instituteId: string;
  openingId: string;
  studentDisplayName: string;
  payload?: unknown;
  submitNow?: boolean;
};

export type TransitionApplicationInput = {
  status: AdmissionApplicationStatus;
  decisionNote?: string | null;
};

export type CreateDocumentInput = {
  docType: AdmissionDocumentType;
  label: string;
  fileName?: string | null;
  assetPath?: string | null;
};

export type UpdateDocumentInput = {
  status?: AdmissionDocumentStatus;
  note?: string | null;
  fileName?: string | null;
  assetPath?: string | null;
};

export type CreateInquiryInput = {
  instituteId: string;
  category?: AdmissionInquiryCategory;
  subject: string;
  body: string;
  contactName: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
};

export type RespondInquiryInput = {
  status: "responded" | "closed";
  responseNote: string;
};
