/**
 * Admissions write API — programs/openings CRUD, applications, documents, inquiries.
 * API auth mode only.
 */
import { getAdmissionsApiClient } from "@/lib/admissions-api";
import type { AdmissionsApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import type {
  AdmissionApplicationDto,
  AdmissionApplicationStatus,
  AdmissionOpeningDto,
  AdmissionOpeningStatus,
  AdmissionProgramDto,
  AdmissionProgramStatus,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Admissions API is only available in API auth mode");
  }
}

export type CreateAdmissionProgramInput = {
  instituteId: string;
  name: string;
  slug?: string;
  description?: string | null;
  duration?: string | null;
  eligibility?: string | null;
  ageCriteria?: string | null;
  seatsAvailable?: number;
  grades?: unknown;
  academicYearLabel?: string | null;
  applicationDeadline?: string;
  publishNow?: boolean;
};

export type UpdateAdmissionProgramInput = Partial<
  Omit<CreateAdmissionProgramInput, "instituteId" | "publishNow">
> & {
  status?: AdmissionProgramStatus;
  applicationDeadline?: string | null;
};

export type CreateAdmissionOpeningInput = {
  instituteId: string;
  programId: string;
  name: string;
  slug?: string;
  description?: string | null;
  seatsAvailable?: number;
  academicYearLabel?: string | null;
  applicationDeadline?: string;
  openNow?: boolean;
};

export type UpdateAdmissionOpeningInput = Partial<
  Omit<CreateAdmissionOpeningInput, "instituteId" | "programId" | "openNow">
> & {
  status?: AdmissionOpeningStatus;
  applicationDeadline?: string | null;
};

export type CreateAdmissionApplicationInput = {
  instituteId: string;
  openingId: string;
  studentDisplayName: string;
  payload?: unknown;
  submitNow?: boolean;
};

export type TransitionAdmissionApplicationInput = {
  status: AdmissionApplicationStatus;
  decisionNote?: string | null;
};

export type CreateAdmissionDocumentInput = {
  docType:
    | "birth_certificate"
    | "transfer_certificate"
    | "marks_memo"
    | "student_photo"
    | "parent_id"
    | "additional";
  label: string;
  fileName?: string | null;
  assetPath?: string | null;
};

export type UpdateAdmissionDocumentInput = {
  status?:
    | "not_uploaded"
    | "uploaded"
    | "under_review"
    | "verified"
    | "rejected"
    | "resubmission_required";
  note?: string | null;
  fileName?: string | null;
  assetPath?: string | null;
};

export type CreateAdmissionInquiryInput = {
  instituteId: string;
  category?:
    | "admission"
    | "program"
    | "fees"
    | "transport"
    | "hostel"
    | "general";
  subject: string;
  body: string;
  contactName: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
};

export type RespondAdmissionInquiryInput = {
  status: "responded" | "closed";
  responseNote: string;
};

export async function createAdmissionProgram(
  input: CreateAdmissionProgramInput,
  client: AdmissionsApiClient = getAdmissionsApiClient(),
): Promise<AdmissionProgramDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.post<AdmissionProgramDto>("/api/v1/admissions/programs", {
    institute_id: input.instituteId.trim(),
    name: input.name.trim(),
    slug: input.slug?.trim(),
    description: input.description,
    duration: input.duration,
    eligibility: input.eligibility,
    age_criteria: input.ageCriteria,
    seats_available: input.seatsAvailable,
    grades: input.grades,
    academic_year_label: input.academicYearLabel,
    application_deadline: input.applicationDeadline,
    publish_now: input.publishNow,
  });
}

export async function updateAdmissionProgram(
  programId: string,
  input: UpdateAdmissionProgramInput,
  client: AdmissionsApiClient = getAdmissionsApiClient(),
): Promise<AdmissionProgramDto> {
  assertApiMode();
  if (!isInstituteUuid(programId)) {
    throw new Error("program_id must be a valid UUID");
  }
  const body: Record<string, unknown> = {};
  if (input.name !== undefined) body.name = input.name.trim();
  if (input.slug !== undefined) body.slug = input.slug.trim();
  if (input.description !== undefined) body.description = input.description;
  if (input.duration !== undefined) body.duration = input.duration;
  if (input.eligibility !== undefined) body.eligibility = input.eligibility;
  if (input.ageCriteria !== undefined) body.age_criteria = input.ageCriteria;
  if (input.seatsAvailable !== undefined) body.seats_available = input.seatsAvailable;
  if (input.grades !== undefined) body.grades = input.grades;
  if (input.academicYearLabel !== undefined) {
    body.academic_year_label = input.academicYearLabel;
  }
  if (input.applicationDeadline !== undefined) {
    body.application_deadline = input.applicationDeadline;
  }
  if (input.status !== undefined) body.status = input.status;
  return client.patch<AdmissionProgramDto>(
    `/api/v1/admissions/programs/${programId.trim()}`,
    body,
  );
}

export async function deleteAdmissionProgram(
  programId: string,
  client: AdmissionsApiClient = getAdmissionsApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(programId)) {
    throw new Error("program_id must be a valid UUID");
  }
  await client.delete(`/api/v1/admissions/programs/${programId.trim()}`);
}

export async function createAdmissionOpening(
  input: CreateAdmissionOpeningInput,
  client: AdmissionsApiClient = getAdmissionsApiClient(),
): Promise<AdmissionOpeningDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  if (!isInstituteUuid(input.programId)) {
    throw new Error("program_id must be a valid UUID");
  }
  return client.post<AdmissionOpeningDto>("/api/v1/admissions/openings", {
    institute_id: input.instituteId.trim(),
    program_id: input.programId.trim(),
    name: input.name.trim(),
    slug: input.slug?.trim(),
    description: input.description,
    seats_available: input.seatsAvailable,
    academic_year_label: input.academicYearLabel,
    application_deadline: input.applicationDeadline,
    open_now: input.openNow,
  });
}

export async function updateAdmissionOpening(
  openingId: string,
  input: UpdateAdmissionOpeningInput,
  client: AdmissionsApiClient = getAdmissionsApiClient(),
): Promise<AdmissionOpeningDto> {
  assertApiMode();
  if (!isInstituteUuid(openingId)) {
    throw new Error("opening_id must be a valid UUID");
  }
  const body: Record<string, unknown> = {};
  if (input.name !== undefined) body.name = input.name.trim();
  if (input.slug !== undefined) body.slug = input.slug.trim();
  if (input.description !== undefined) body.description = input.description;
  if (input.seatsAvailable !== undefined) body.seats_available = input.seatsAvailable;
  if (input.academicYearLabel !== undefined) {
    body.academic_year_label = input.academicYearLabel;
  }
  if (input.applicationDeadline !== undefined) {
    body.application_deadline = input.applicationDeadline;
  }
  if (input.status !== undefined) body.status = input.status;
  return client.patch<AdmissionOpeningDto>(
    `/api/v1/admissions/openings/${openingId.trim()}`,
    body,
  );
}

export async function deleteAdmissionOpening(
  openingId: string,
  client: AdmissionsApiClient = getAdmissionsApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(openingId)) {
    throw new Error("opening_id must be a valid UUID");
  }
  await client.delete(`/api/v1/admissions/openings/${openingId.trim()}`);
}

export async function createAdmissionApplication(
  input: CreateAdmissionApplicationInput,
  client: AdmissionsApiClient = getAdmissionsApiClient(),
): Promise<AdmissionApplicationDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  if (!isInstituteUuid(input.openingId)) {
    throw new Error("opening_id must be a valid UUID");
  }
  return client.post<AdmissionApplicationDto>("/api/v1/admissions/applications", {
    institute_id: input.instituteId.trim(),
    opening_id: input.openingId.trim(),
    student_display_name: input.studentDisplayName.trim(),
    payload: input.payload,
    submit_now: input.submitNow,
  });
}

export async function transitionAdmissionApplication(
  applicationId: string,
  input: TransitionAdmissionApplicationInput,
  client: AdmissionsApiClient = getAdmissionsApiClient(),
): Promise<AdmissionApplicationDto> {
  assertApiMode();
  if (!isInstituteUuid(applicationId)) {
    throw new Error("application_id must be a valid UUID");
  }
  return client.post<AdmissionApplicationDto>(
    `/api/v1/admissions/applications/${applicationId.trim()}/transition`,
    {
      status: input.status,
      decision_note: input.decisionNote,
    },
  );
}

export async function createAdmissionDocument(
  applicationId: string,
  input: CreateAdmissionDocumentInput,
  client: AdmissionsApiClient = getAdmissionsApiClient(),
): Promise<unknown> {
  assertApiMode();
  if (!isInstituteUuid(applicationId)) {
    throw new Error("application_id must be a valid UUID");
  }
  return client.post(
    `/api/v1/admissions/applications/${applicationId.trim()}/documents`,
    {
      doc_type: input.docType,
      label: input.label.trim(),
      file_name: input.fileName,
      asset_path: input.assetPath,
    },
  );
}

export async function updateAdmissionDocument(
  documentId: string,
  input: UpdateAdmissionDocumentInput,
  client: AdmissionsApiClient = getAdmissionsApiClient(),
): Promise<unknown> {
  assertApiMode();
  if (!isInstituteUuid(documentId)) {
    throw new Error("document_id must be a valid UUID");
  }
  return client.patch(`/api/v1/admissions/documents/${documentId.trim()}`, {
    status: input.status,
    note: input.note,
    file_name: input.fileName,
    asset_path: input.assetPath,
  });
}

export async function createAdmissionInquiry(
  input: CreateAdmissionInquiryInput,
  client: AdmissionsApiClient = getAdmissionsApiClient(),
): Promise<unknown> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.post("/api/v1/admissions/inquiries", {
    institute_id: input.instituteId.trim(),
    category: input.category,
    subject: input.subject.trim(),
    body: input.body.trim(),
    contact_name: input.contactName.trim(),
    contact_email: input.contactEmail,
    contact_phone: input.contactPhone,
  });
}

export async function respondAdmissionInquiry(
  inquiryId: string,
  input: RespondAdmissionInquiryInput,
  client: AdmissionsApiClient = getAdmissionsApiClient(),
): Promise<unknown> {
  assertApiMode();
  if (!isInstituteUuid(inquiryId)) {
    throw new Error("inquiry_id must be a valid UUID");
  }
  return client.post(`/api/v1/admissions/inquiries/${inquiryId.trim()}/respond`, {
    status: input.status,
    response_note: input.responseNote.trim(),
  });
}
