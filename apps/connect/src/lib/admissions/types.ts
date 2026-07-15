export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "documents_pending"
  | "documents_uploaded"
  | "document_verification"
  | "interview_scheduled"
  | "interview_completed"
  | "under_final_review"
  | "approved"
  | "rejected"
  | "waitlisted"
  /** @deprecated V1 alias — mapped to under_final_review in UI */
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

export type InterviewMode = "in_person" | "phone" | "video";

export type InquiryCategory = "admission" | "program" | "fees" | "transport" | "hostel" | "general";

export type InquiryStatus = "open" | "answered" | "closed";

export type DocumentType =
  | "birth_certificate"
  | "transfer_certificate"
  | "marks_memo"
  | "student_photo"
  | "parent_id"
  | "additional";

export type AdmissionsAccountType = "parent" | "institute_admin";

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
  version?: number;
}

export interface InterviewDetails {
  date: string;
  time: string;
  mode: InterviewMode;
  location: string;
  instructions: string;
  requiredDocuments?: string[];
  status: "scheduled" | "completed" | "cancelled";
  meetingLink?: string;
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
  adminNotes?: string[];
  interview?: InterviewDetails;
  requiredActions?: string[];
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
  student: Partial<StudentInfo>;
  parent: Partial<ParentInfo>;
  address: Partial<AddressInfo>;
  academic: Partial<AcademicInfo>;
  programId?: string;
  instituteId?: string;
  grade?: string;
  academicYear?: string;
  documents: Partial<Record<DocumentType, { fileName: string; dataUrl?: string }>>;
}

export interface AdmissionsNotification {
  id: string;
  applicantId: string;
  applicationId?: string;
  title: string;
  body: string;
  type:
    | "application"
    | "document"
    | "interview"
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
  category: "admissions" | "programs" | "fees" | "documents" | "interviews" | "process";
  question: string;
  answer: string;
}

export type AdmissionsTheme = "light" | "dark";
