import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  AdmissionApplicationRow,
  AdmissionApplicationStatus,
  AdmissionDocumentRow,
  AdmissionDocumentStatus,
  AdmissionInquiryRow,
  AdmissionInquiryStatus,
  AdmissionOpeningRow,
  AdmissionOpeningStatus,
  AdmissionProgramRow,
  AdmissionProgramStatus,
  CreateDocumentInput,
  CreateInquiryInput,
  CreateOpeningInput,
  CreateProgramInput,
} from "./types.js";

export const PROGRAM_COLS =
  "id, institute_id, name, slug, description, duration, eligibility, age_criteria, seats_available, grades, academic_year_label, application_deadline, status, created_by_user_id, created_at, updated_at, deleted_at";
export const OPENING_COLS =
  "id, institute_id, program_id, name, slug, description, seats_available, academic_year_label, application_deadline, status, created_by_user_id, created_at, updated_at, deleted_at";
export const APPLICATION_COLS =
  "id, institute_id, opening_id, program_id, applicant_user_id, student_display_name, status, payload, decision_note, converted_student_id, submitted_at, created_at, updated_at, deleted_at";
export const DOCUMENT_COLS =
  "id, institute_id, application_id, doc_type, label, file_name, asset_path, status, note, uploaded_by_user_id, created_at, updated_at, deleted_at";
export const INQUIRY_COLS =
  "id, institute_id, category, subject, body, contact_name, contact_email, contact_phone, status, response_note, requested_by_user_id, responded_by_user_id, responded_at, created_at, updated_at, deleted_at";

export async function listPrograms(
  admin: SupabaseClient,
  instituteId: string,
): Promise<AdmissionProgramRow[]> {
  const result = await admin
    .from("admission_program")
    .select(PROGRAM_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  return ensureDbOk(result) as AdmissionProgramRow[];
}

export async function findProgramById(
  admin: SupabaseClient,
  id: string,
): Promise<AdmissionProgramRow | null> {
  const result = await admin
    .from("admission_program")
    .select(PROGRAM_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as AdmissionProgramRow | null) ?? null;
}

export async function insertProgram(
  admin: SupabaseClient,
  input: CreateProgramInput & {
    createdByUserId: string;
    status: AdmissionProgramStatus;
  },
): Promise<AdmissionProgramRow> {
  const result = await admin
    .from("admission_program")
    .insert({
      institute_id: input.instituteId,
      name: input.name.trim(),
      slug: input.slug.trim(),
      description: input.description?.trim() || null,
      duration: input.duration?.trim() || null,
      eligibility: input.eligibility?.trim() || null,
      age_criteria: input.ageCriteria?.trim() || null,
      seats_available: input.seatsAvailable ?? 0,
      grades: input.grades ?? [],
      academic_year_label: input.academicYearLabel?.trim() || null,
      application_deadline: input.applicationDeadline ?? null,
      status: input.status,
      created_by_user_id: input.createdByUserId,
    })
    .select(PROGRAM_COLS)
    .single();
  return ensureDbOk(result) as AdmissionProgramRow;
}

export async function updateProgramFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<AdmissionProgramRow | null> {
  const result = await admin
    .from("admission_program")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(PROGRAM_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as AdmissionProgramRow | null) ?? null;
}

export async function softDeleteProgram(
  admin: SupabaseClient,
  id: string,
): Promise<AdmissionProgramRow | null> {
  const result = await admin
    .from("admission_program")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(PROGRAM_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as AdmissionProgramRow | null) ?? null;
}

export async function listOpenings(
  admin: SupabaseClient,
  instituteId: string,
): Promise<AdmissionOpeningRow[]> {
  const result = await admin
    .from("admission_opening")
    .select(OPENING_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  return ensureDbOk(result) as AdmissionOpeningRow[];
}

export async function findOpeningById(
  admin: SupabaseClient,
  id: string,
): Promise<AdmissionOpeningRow | null> {
  const result = await admin
    .from("admission_opening")
    .select(OPENING_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as AdmissionOpeningRow | null) ?? null;
}

export async function insertOpening(
  admin: SupabaseClient,
  input: CreateOpeningInput & {
    createdByUserId: string;
    status: AdmissionOpeningStatus;
  },
): Promise<AdmissionOpeningRow> {
  const result = await admin
    .from("admission_opening")
    .insert({
      institute_id: input.instituteId,
      program_id: input.programId,
      name: input.name.trim(),
      slug: input.slug.trim(),
      description: input.description?.trim() || null,
      seats_available: input.seatsAvailable ?? 0,
      academic_year_label: input.academicYearLabel?.trim() || null,
      application_deadline: input.applicationDeadline ?? null,
      status: input.status,
      created_by_user_id: input.createdByUserId,
    })
    .select(OPENING_COLS)
    .single();
  return ensureDbOk(result) as AdmissionOpeningRow;
}

export async function updateOpeningFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<AdmissionOpeningRow | null> {
  const result = await admin
    .from("admission_opening")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(OPENING_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as AdmissionOpeningRow | null) ?? null;
}

export async function softDeleteOpening(
  admin: SupabaseClient,
  id: string,
): Promise<AdmissionOpeningRow | null> {
  const result = await admin
    .from("admission_opening")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(OPENING_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as AdmissionOpeningRow | null) ?? null;
}

export async function listApplications(
  admin: SupabaseClient,
  instituteId: string,
): Promise<AdmissionApplicationRow[]> {
  const result = await admin
    .from("admission_application")
    .select(APPLICATION_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  return ensureDbOk(result) as AdmissionApplicationRow[];
}

export async function findApplicationById(
  admin: SupabaseClient,
  id: string,
): Promise<AdmissionApplicationRow | null> {
  const result = await admin
    .from("admission_application")
    .select(APPLICATION_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as AdmissionApplicationRow | null) ?? null;
}

export async function insertApplication(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    openingId: string;
    programId: string;
    applicantUserId: string;
    studentDisplayName: string;
    status: AdmissionApplicationStatus;
    payload: unknown;
    submittedAt: string | null;
  },
): Promise<AdmissionApplicationRow> {
  const result = await admin
    .from("admission_application")
    .insert({
      institute_id: input.instituteId,
      opening_id: input.openingId,
      program_id: input.programId,
      applicant_user_id: input.applicantUserId,
      student_display_name: input.studentDisplayName.trim(),
      status: input.status,
      payload: input.payload ?? {},
      decision_note: null,
      converted_student_id: null,
      submitted_at: input.submittedAt,
    })
    .select(APPLICATION_COLS)
    .single();
  return ensureDbOk(result) as AdmissionApplicationRow;
}

export async function updateApplicationFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<AdmissionApplicationRow | null> {
  const result = await admin
    .from("admission_application")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(APPLICATION_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as AdmissionApplicationRow | null) ?? null;
}

export async function listDocumentsForApplication(
  admin: SupabaseClient,
  applicationId: string,
): Promise<AdmissionDocumentRow[]> {
  const result = await admin
    .from("admission_document")
    .select(DOCUMENT_COLS)
    .eq("application_id", applicationId)
    .is("deleted_at", null);
  return ensureDbOk(result) as AdmissionDocumentRow[];
}

export async function findDocumentById(
  admin: SupabaseClient,
  id: string,
): Promise<AdmissionDocumentRow | null> {
  const result = await admin
    .from("admission_document")
    .select(DOCUMENT_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as AdmissionDocumentRow | null) ?? null;
}

export async function insertDocument(
  admin: SupabaseClient,
  input: CreateDocumentInput & {
    instituteId: string;
    applicationId: string;
    uploadedByUserId: string;
    status: AdmissionDocumentStatus;
  },
): Promise<AdmissionDocumentRow> {
  const result = await admin
    .from("admission_document")
    .insert({
      institute_id: input.instituteId,
      application_id: input.applicationId,
      doc_type: input.docType,
      label: input.label.trim(),
      file_name: input.fileName?.trim() || null,
      asset_path: input.assetPath?.trim() || null,
      status: input.status,
      note: null,
      uploaded_by_user_id: input.uploadedByUserId,
    })
    .select(DOCUMENT_COLS)
    .single();
  return ensureDbOk(result) as AdmissionDocumentRow;
}

export async function updateDocumentFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<AdmissionDocumentRow | null> {
  const result = await admin
    .from("admission_document")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(DOCUMENT_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as AdmissionDocumentRow | null) ?? null;
}

export async function listInquiries(
  admin: SupabaseClient,
  instituteId: string,
): Promise<AdmissionInquiryRow[]> {
  const result = await admin
    .from("admission_inquiry")
    .select(INQUIRY_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  return ensureDbOk(result) as AdmissionInquiryRow[];
}

export async function findInquiryById(
  admin: SupabaseClient,
  id: string,
): Promise<AdmissionInquiryRow | null> {
  const result = await admin
    .from("admission_inquiry")
    .select(INQUIRY_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as AdmissionInquiryRow | null) ?? null;
}

export async function insertInquiry(
  admin: SupabaseClient,
  input: CreateInquiryInput & { requestedByUserId: string },
): Promise<AdmissionInquiryRow> {
  const result = await admin
    .from("admission_inquiry")
    .insert({
      institute_id: input.instituteId,
      category: input.category ?? "general",
      subject: input.subject.trim(),
      body: input.body.trim(),
      contact_name: input.contactName.trim(),
      contact_email: input.contactEmail?.trim() || null,
      contact_phone: input.contactPhone?.trim() || null,
      status: "open" satisfies AdmissionInquiryStatus,
      response_note: null,
      requested_by_user_id: input.requestedByUserId,
      responded_by_user_id: null,
      responded_at: null,
    })
    .select(INQUIRY_COLS)
    .single();
  return ensureDbOk(result) as AdmissionInquiryRow;
}

export async function updateInquiryFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<AdmissionInquiryRow | null> {
  const result = await admin
    .from("admission_inquiry")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(INQUIRY_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as AdmissionInquiryRow | null) ?? null;
}
