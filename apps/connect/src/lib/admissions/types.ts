import type { ContactInquiryStatus } from "@lumenx/types";

export type { ContactInquiryStatus };

export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "review"
  | "verification"
  | "parent_confirmation"
  | "approved"
  | "rejected"
  | "withdrawn"
  /** @deprecated Legacy aliases kept for older saved rows */
  | "documents_pending"
  | "documents_uploaded"
  | "document_verification"
  | "interview_scheduled"
  | "interview_completed"
  | "under_final_review"
  | "waitlisted"
  | "under_review";

export type DocumentVerificationStatus =
  | "not_uploaded"
  | "uploaded"
  | "under_review"
  | "verified"
  | "rejected"
  | "resubmission_required"
  /** @deprecated V1 aliases */
  | "pending_verification"
  | "requires_resubmission";

export type InquiryCategory = "admission" | "program" | "fees" | "transport" | "hostel" | "general";

/** @deprecated Prefer ContactInquiryStatus from @lumenx/types */
export type InquiryStatus = ContactInquiryStatus;

export type DocumentType =
  | "birth_certificate"
  | "transfer_certificate"
  | "marks_memo"
  | "student_photo"
  | "parent_id"
  | "additional";

export type AdmissionType = "first_time_schooling" | "transfer_admission";

export type AdmissionsAccountType = "parent" | "institute_admin";
export type ParentConfirmationResponse = "continue" | "reject" | "expired";
export type WaitlistRemovalReason = "expired_90_days" | "parent_removed" | "bulk_deleted";

export type CorrectionFieldPath =
  | "student.name"
  | "student.gender"
  | "student.dateOfBirth"
  | "student.nationality"
  | "student.bloodGroup"
  | "parent.fatherName"
  | "parent.motherName"
  | "parent.guardianName"
  | "parent.mobile"
  | "parent.email"
  | "parent.occupation"
  | "address.address"
  | "address.city"
  | "address.state"
  | "address.country"
  | "address.postalCode"
  | "academic.currentSchool"
  | "academic.currentGrade"
  | "academic.previousResults"
  | "academic.performance"
  | "documents.birth_certificate"
  | "documents.transfer_certificate"
  | "documents.marks_memo"
  | "documents.student_photo"
  | "documents.parent_id"
  | "documents.additional";

export interface AdmissionsUser {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  passwordHash: string;
  profileComplete: number;
  createdAt: string;
  accountType: AdmissionsAccountType;
  instituteId?: string;
  instituteName?: string;
}

export interface AdmissionProgram {
  id: string;
  instituteId: string;
  name: string;
  slug: string;
  description: string;
  duration: string;
  eligibility: string;
  ageCriteria?: string;
  seatsAvailable: number;
  grades: string[];
  subjects?: string[];
  facilities?: string[];
  academicYear: string;
  applicationDeadline: string;
  faqIds?: string[];
}

/** Institute-published intake / seats opening (editable by institute admin). */
export type AdmissionOpeningStatus = "draft" | "open" | "closed";

export interface AdmissionOpening {
  id: string;
  instituteId: string;
  name: string;
  slug: string;
  description: string;
  duration: string;
  eligibility: string;
  ageCriteria?: string;
  seatsAvailable: number;
  grades: string[];
  academicYear: string;
  applicationDeadline: string;
  status: AdmissionOpeningStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVerificationEvent {
  id: string;
  status: DocumentVerificationStatus;
  at: string;
  note?: string;
  by?: string;
}

export interface ApplicationDocument {
  id: string;
  type: DocumentType;
  label: string;
  fileName?: string;
  status: DocumentVerificationStatus;
  uploadedAt?: string;
  note?: string;
  adminNotes?: string[];
  verificationTimeline?: DocumentVerificationEvent[];
  previewDataUrl?: string;
  assetPath?: string;
  assetId?: string;
  version?: number;
}

export interface TimelineEvent {
  id: string;
  status: ApplicationStatus;
  label: string;
  at: string;
  note?: string;
}

export type AdmissionFormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "email"
  | "phone"
  | "select"
  | "file_pdf"
  | "file_image"
  | "file_document"
  | "file_any";

export type AdmissionFileAccept = "pdf" | "image" | "document" | "any";

export interface AdmissionFormField {
  id: string;
  label: string;
  type: AdmissionFormFieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];
  helpText?: string;
  /** For legacy `file` fields migrated from storage */
  fileAccept?: AdmissionFileAccept;
}

export interface InstituteAdmissionForm {
  instituteId: string;
  fields: AdmissionFormField[];
  updatedAt: string;
}

export interface InstituteSettingsOverride {
  instituteId: string;
  tagline?: string;
  about?: string;
  contact?: {
    phone?: string;
    email?: string;
    address?: string;
  };
  admissionDates?: { label: string; date: string }[];
  updatedAt: string;
}

export interface AdmissionApplication {
  id: string;
  applicantId: string;
  instituteId?: string;
  admissionType?: AdmissionType;
  status: ApplicationStatus;
  programId: string;
  programName: string;
  grade: string;
  academicYear: string;
  submittedAt?: string;
  updatedAt: string;
  student: StudentInfo;
  parent: ParentInfo;
  address: AddressInfo;
  academic: AcademicInfo;
  documents: ApplicationDocument[];
  timeline: TimelineEvent[];
  /** Answers to institute custom form fields */
  customAnswers?: Record<string, string>;
  adminNotes?: string[];
  /** @deprecated Interview stage removed from admissions workflow */
  interview?: never;
  requiredActions?: string[];
  parentConfirmationRequestedAt?: string;
  parentConfirmationDueAt?: string;
  parentConfirmationRespondedAt?: string;
  parentConfirmationResponse?: ParentConfirmationResponse;
  waitlist?: {
    joinedAt: string;
    expiresAt: string;
    active: boolean;
    priorityScore: number;
    reminderDay80SentAt?: string;
    seatAvailableNotifiedAt?: string;
    lastInstituteReminderAt?: string;
    removedAt?: string;
    removedReason?: WaitlistRemovalReason;
  };
  pendingCorrection?: {
    cycleId: string;
    reason: string;
    requestedAt: string;
    requestedFields: CorrectionFieldPath[];
    requestedBy?: string;
  };
  correctionHistory?: AdmissionCorrectionCycle[];
}

export interface AdmissionCorrectionCycle {
  id: string;
  reason: string;
  requestedAt: string;
  requestedFields: CorrectionFieldPath[];
  requestedBy?: string;
  resubmittedAt?: string;
  resubmittedBy?: string;
  resubmittedFields?: CorrectionFieldPath[];
}

export interface StudentInfo {
  name: string;
  gender: string;
  dateOfBirth: string;
  nationality: string;
  bloodGroup: string;
  photoDataUrl?: string;
}

export interface ParentInfo {
  fatherName: string;
  motherName: string;
  guardianName: string;
  mobile: string;
  email: string;
  occupation: string;
}

export interface AddressInfo {
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface AcademicInfo {
  currentSchool: string;
  currentGrade: string;
  previousResults: string;
  performance: string;
}

export interface ApplicationDraft {
  step: number;
  /** Shared parent details for all children in this draft session */
  parent: Partial<ParentInfo>;
  /** Shared address details for all children in this draft session */
  address: Partial<AddressInfo>;
  /** Multi-child draft support (Phase 2). */
  children?: ChildApplicationDraft[];
  activeChildId?: string;
  /** @deprecated legacy single-child keys retained for migration */
  student: Partial<StudentInfo>;
  academic: Partial<AcademicInfo>;
  programId?: string;
  instituteId?: string;
  grade?: string;
  academicYear?: string;
  documents: Partial<Record<DocumentType, { fileName: string; dataUrl?: string }>>;
  /** Institute Application form answers (field id → value) */
  customAnswers?: Record<string, string>;
}

export interface ChildApplicationDraft {
  id: string;
  admissionType: AdmissionType;
  student: Partial<StudentInfo>;
  academic: Partial<AcademicInfo>;
  programId?: string;
  instituteId?: string;
  grade?: string;
  academicYear?: string;
  documents: Partial<Record<DocumentType, { fileName: string; dataUrl?: string }>>;
  customAnswers?: Record<string, string>;
}

export interface AdmissionsNotification {
  id: string;
  applicantId: string;
  applicationId?: string;
  templateId?: string;
  title: string;
  body: string;
  type:
    | "application"
    | "document"
    | "confirmation"
    | "approval"
    | "rejection"
    | "reminder"
    | "general";
  read: boolean;
  createdAt: string;
}

export interface AdmissionInquiry {
  id: string;
  applicantId: string;
  instituteId?: string;
  category: InquiryCategory;
  subject: string;
  message: string;
  status: InquiryStatus;
  createdAt: string;
  updatedAt: string;
  responses: { id: string; from: string; body: string; at: string }[];
}

export interface InstituteMediaItem {
  id: string;
  type: "photo" | "video";
  title: string;
  caption?: string;
  gradient?: string;
  videoUrl?: string;
}

export interface InstituteProfileExtended {
  instituteId: string;
  logoInitials: string;
  logoGradient: string;
  shortDescription: string;
  principalName: string;
  principalMessage: string;
  history: string;
  vision: string;
  mission: string;
  awards: string[];
  academicHighlights: string[];
  sportsHighlights: string[];
  admissionOffice: {
    phone: string;
    email: string;
    hours: string;
    address: string;
  };
  campusPhotos: InstituteMediaItem[];
  videos: InstituteMediaItem[];
  eventsGallery: InstituteMediaItem[];
  featured: boolean;
  popular: boolean;
  addedAt: string;
}

export interface FaqItem {
  id: string;
  category: "admissions" | "programs" | "fees" | "documents" | "process";
  question: string;
  answer: string;
}

export type AdmissionsTheme = "light" | "dark";
