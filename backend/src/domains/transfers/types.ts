export type TransferRequestStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "completed";

/** Explicitly approved fields shared with the destination (never full history). */
export type TransferSharedFields = {
  firstName?: boolean;
  surname?: boolean;
  displayName?: boolean;
  gender?: boolean;
  dateOfBirth?: boolean;
  bloodGroup?: boolean;
  /** Share admission number only when both sides approve. */
  admissionNumber?: boolean;
};

export type StudentTransferRequestRow = {
  id: string;
  source_institute_id: string;
  destination_institute_id: string;
  source_student_id: string;
  destination_student_id: string | null;
  destination_academic_year_id: string | null;
  destination_class_id: string | null;
  destination_section_id: string | null;
  status: TransferRequestStatus;
  effective_on: string | null;
  initiated_by_user_id: string;
  decided_by_user_id: string | null;
  decision_reason: string | null;
  shared_fields: TransferSharedFields;
  client_request_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type StudentTransferRequestDto = {
  id: string;
  sourceInstituteId: string;
  destinationInstituteId: string;
  sourceStudentId: string;
  destinationStudentId: string | null;
  destinationAcademicYearId: string | null;
  destinationClassId: string | null;
  destinationSectionId: string | null;
  status: TransferRequestStatus;
  effectiveOn: string | null;
  initiatedByUserId: string;
  decidedByUserId: string | null;
  decisionReason: string | null;
  sharedFields: TransferSharedFields;
  clientRequestId: string | null;
  /** Minimal identity preview — never full source roster. */
  sourceStudentPreview?: {
    displayName: string | null;
    admissionNumber: string | null;
  };
  createdAt: string;
  updatedAt: string;
};

export type InitiateTransferInput = {
  sourceInstituteId: string;
  destinationInstituteId: string;
  sourceStudentId: string;
  effectiveOn?: string | null;
  sharedFields: TransferSharedFields;
  clientRequestId?: string | null;
};

export type AcceptTransferInput = {
  destinationAcademicYearId: string;
  destinationClassId: string;
  destinationSectionId: string;
  /** Optional link to an existing destination student (same person). */
  destinationStudentId?: string | null;
  reason?: string | null;
};

export type DecideTransferInput = {
  reason?: string | null;
};
