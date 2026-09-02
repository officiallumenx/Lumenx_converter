import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  actorHasInstituteRole,
  requireInstituteId,
} from "../../authorization/index.js";
import {
  findApplicationById,
  findDocumentById,
  findInquiryById,
  findOpeningById,
  findProgramById,
  insertApplication,
  insertDocument,
  insertInquiry,
  insertOpening,
  insertProgram,
  listApplications,
  listDocumentsForApplication,
  listInquiries,
  listOpenings,
  listPrograms,
  softDeleteOpening,
  softDeleteProgram,
  updateApplicationFields,
  updateDocumentFields,
  updateInquiryFields,
  updateOpeningFields,
  updateProgramFields,
} from "./repository.js";
import type {
  AdmissionApplicationDto,
  AdmissionApplicationRow,
  AdmissionApplicationStatus,
  AdmissionDocumentDto,
  AdmissionDocumentRow,
  AdmissionInquiryDto,
  AdmissionInquiryRow,
  AdmissionOpeningDto,
  AdmissionOpeningRow,
  AdmissionProgramDto,
  AdmissionProgramRow,
  CreateApplicationInput,
  CreateDocumentInput,
  CreateInquiryInput,
  CreateOpeningInput,
  CreateProgramInput,
  RespondInquiryInput,
  TransitionApplicationInput,
  UpdateDocumentInput,
  UpdateOpeningInput,
  UpdateProgramInput,
} from "./types.js";

export const ADMISSION_WRITE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "admissions_officer",
  "it_admin",
] as const;

export const ADMISSION_STAFF_READ_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "admissions_officer",
  "it_admin",
  "teacher",
  "accountant",
  "staff",
] as const;

const APP_TRANSITIONS: Record<
  AdmissionApplicationStatus,
  AdmissionApplicationStatus[]
> = {
  draft: ["submitted", "withdrawn"],
  submitted: ["review", "withdrawn", "rejected"],
  review: ["verification", "waitlisted", "rejected", "withdrawn"],
  verification: ["parent_confirmation", "review", "rejected", "withdrawn"],
  parent_confirmation: ["approved", "rejected", "withdrawn"],
  waitlisted: ["review", "approved", "rejected", "withdrawn"],
  approved: [],
  rejected: [],
  withdrawn: [],
};

export function toProgramDto(row: AdmissionProgramRow): AdmissionProgramDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    duration: row.duration,
    eligibility: row.eligibility,
    ageCriteria: row.age_criteria,
    seatsAvailable: row.seats_available,
    grades: row.grades,
    academicYearLabel: row.academic_year_label,
    applicationDeadline: row.application_deadline,
    status: row.status,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toOpeningDto(row: AdmissionOpeningRow): AdmissionOpeningDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    programId: row.program_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    seatsAvailable: row.seats_available,
    academicYearLabel: row.academic_year_label,
    applicationDeadline: row.application_deadline,
    status: row.status,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toApplicationDto(
  row: AdmissionApplicationRow,
): AdmissionApplicationDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    openingId: row.opening_id,
    programId: row.program_id,
    applicantUserId: row.applicant_user_id,
    studentDisplayName: row.student_display_name,
    status: row.status,
    payload: row.payload,
    decisionNote: row.decision_note,
    convertedStudentId: row.converted_student_id,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toDocumentDto(row: AdmissionDocumentRow): AdmissionDocumentDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    applicationId: row.application_id,
    docType: row.doc_type,
    label: row.label,
    fileName: row.file_name,
    assetPath: row.asset_path,
    status: row.status,
    note: row.note,
    uploadedByUserId: row.uploaded_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toInquiryDto(row: AdmissionInquiryRow): AdmissionInquiryDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    category: row.category,
    subject: row.subject,
    body: row.body,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    status: row.status,
    responseNote: row.response_note,
    requestedByUserId: row.requested_by_user_id,
    respondedByUserId: row.responded_by_user_id,
    respondedAt: row.responded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isWriter(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  return ADMISSION_WRITE_ROLES.some((role) =>
    actorHasInstituteRole(actor, instituteId, role),
  );
}

function isStaffReader(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  return ADMISSION_STAFF_READ_ROLES.some((role) =>
    actorHasInstituteRole(actor, instituteId, role),
  );
}

function isMember(actor: Actor, instituteId: string): boolean {
  return (
    actor.isPlatformOperator ||
    actor.memberships.some(
      (m) => m.instituteId === instituteId && m.status === "active",
    )
  );
}

function canReadProgram(actor: Actor, row: AdmissionProgramRow): boolean {
  if (!isMember(actor, row.institute_id)) return false;
  if (isStaffReader(actor, row.institute_id)) return true;
  return row.status === "published";
}

function canReadOpening(actor: Actor, row: AdmissionOpeningRow): boolean {
  if (!isMember(actor, row.institute_id)) return false;
  if (isStaffReader(actor, row.institute_id)) return true;
  return row.status === "open" || row.status === "closed";
}

function canReadApplication(
  actor: Actor,
  row: AdmissionApplicationRow,
): boolean {
  if (!isMember(actor, row.institute_id)) return false;
  if (isStaffReader(actor, row.institute_id)) return true;
  return row.applicant_user_id === actor.userId;
}

function canReadInquiry(actor: Actor, row: AdmissionInquiryRow): boolean {
  if (!isMember(actor, row.institute_id)) return false;
  if (isStaffReader(actor, row.institute_id)) return true;
  return row.requested_by_user_id === actor.userId;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Programs ─────────────────────────────────────────────────────

export async function listProgramsForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
): Promise<AdmissionProgramDto[]> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  const rows = await listPrograms(admin, instituteId);
  return rows.filter((r) => canReadProgram(actor, r)).map(toProgramDto);
}

export async function getProgramForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<AdmissionProgramDto> {
  const row = await findProgramById(admin, id);
  if (!row || !canReadProgram(actor, row)) {
    throw AppError.notFound("Admission program not found");
  }
  return toProgramDto(row);
}

export async function createProgramForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateProgramInput,
): Promise<AdmissionProgramDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  if (!isWriter(actor, instituteId)) {
    throw AppError.forbidden("Insufficient admissions write access");
  }
  const name = input.name.trim();
  const slug = (input.slug?.trim() || slugify(name)).trim();
  if (!name || !slug) {
    throw AppError.validation("Referenced resource is invalid", {
      name: ["Required"],
    });
  }
  const row = await insertProgram(admin, {
    ...input,
    instituteId,
    name,
    slug,
    createdByUserId: actor.userId,
    status: input.publishNow ? "published" : "draft",
  });
  return toProgramDto(row);
}

export async function updateProgramForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: UpdateProgramInput,
): Promise<AdmissionProgramDto> {
  const existing = await findProgramById(admin, id);
  if (!existing || !canReadProgram(actor, existing)) {
    throw AppError.notFound("Admission program not found");
  }
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Admission program not found");
  }
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.slug !== undefined) patch.slug = input.slug.trim();
  if (input.description !== undefined) {
    patch.description = input.description?.trim() || null;
  }
  if (input.duration !== undefined) patch.duration = input.duration?.trim() || null;
  if (input.eligibility !== undefined) {
    patch.eligibility = input.eligibility?.trim() || null;
  }
  if (input.ageCriteria !== undefined) {
    patch.age_criteria = input.ageCriteria?.trim() || null;
  }
  if (input.seatsAvailable !== undefined) {
    patch.seats_available = input.seatsAvailable;
  }
  if (input.grades !== undefined) patch.grades = input.grades;
  if (input.academicYearLabel !== undefined) {
    patch.academic_year_label = input.academicYearLabel?.trim() || null;
  }
  if (input.applicationDeadline !== undefined) {
    patch.application_deadline = input.applicationDeadline;
  }
  if (input.status !== undefined) patch.status = input.status;
  if (Object.keys(patch).length === 0) return toProgramDto(existing);
  const updated = await updateProgramFields(admin, id, patch);
  if (!updated) throw AppError.notFound("Admission program not found");
  return toProgramDto(updated);
}

export async function deleteProgramForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<void> {
  const existing = await findProgramById(admin, id);
  if (!existing || !canReadProgram(actor, existing)) {
    throw AppError.notFound("Admission program not found");
  }
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Admission program not found");
  }
  if (existing.status === "published") {
    throw AppError.conflict("Archive program before deleting");
  }
  const deleted = await softDeleteProgram(admin, id);
  if (!deleted) throw AppError.notFound("Admission program not found");
}

// ── Openings ─────────────────────────────────────────────────────

export async function listOpeningsForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
): Promise<AdmissionOpeningDto[]> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  const rows = await listOpenings(admin, instituteId);
  return rows.filter((r) => canReadOpening(actor, r)).map(toOpeningDto);
}

export async function getOpeningForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<AdmissionOpeningDto> {
  const row = await findOpeningById(admin, id);
  if (!row || !canReadOpening(actor, row)) {
    throw AppError.notFound("Admission opening not found");
  }
  return toOpeningDto(row);
}

export async function createOpeningForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateOpeningInput,
): Promise<AdmissionOpeningDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  if (!isWriter(actor, instituteId)) {
    throw AppError.forbidden("Insufficient admissions write access");
  }
  const program = await findProgramById(admin, input.programId);
  if (!program || program.institute_id !== instituteId) {
    throw AppError.validation("Referenced resource is invalid", {
      program_id: ["Program not found in this institute"],
    });
  }
  if (program.status !== "published") {
    throw AppError.conflict("Program must be published before openings");
  }
  const name = input.name.trim();
  const slug = (input.slug?.trim() || slugify(name)).trim();
  const row = await insertOpening(admin, {
    ...input,
    instituteId,
    name,
    slug,
    createdByUserId: actor.userId,
    status: input.openNow ? "open" : "draft",
  });
  return toOpeningDto(row);
}

export async function updateOpeningForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: UpdateOpeningInput,
): Promise<AdmissionOpeningDto> {
  const existing = await findOpeningById(admin, id);
  if (!existing || !canReadOpening(actor, existing)) {
    throw AppError.notFound("Admission opening not found");
  }
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Admission opening not found");
  }
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.slug !== undefined) patch.slug = input.slug.trim();
  if (input.description !== undefined) {
    patch.description = input.description?.trim() || null;
  }
  if (input.seatsAvailable !== undefined) {
    patch.seats_available = input.seatsAvailable;
  }
  if (input.academicYearLabel !== undefined) {
    patch.academic_year_label = input.academicYearLabel?.trim() || null;
  }
  if (input.applicationDeadline !== undefined) {
    patch.application_deadline = input.applicationDeadline;
  }
  if (input.status !== undefined) patch.status = input.status;
  if (Object.keys(patch).length === 0) return toOpeningDto(existing);
  const updated = await updateOpeningFields(admin, id, patch);
  if (!updated) throw AppError.notFound("Admission opening not found");
  return toOpeningDto(updated);
}

export async function deleteOpeningForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<void> {
  const existing = await findOpeningById(admin, id);
  if (!existing || !canReadOpening(actor, existing)) {
    throw AppError.notFound("Admission opening not found");
  }
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Admission opening not found");
  }
  if (existing.status === "open") {
    throw AppError.conflict("Close opening before deleting");
  }
  const deleted = await softDeleteOpening(admin, id);
  if (!deleted) throw AppError.notFound("Admission opening not found");
}

// ── Applications ─────────────────────────────────────────────────

export async function listApplicationsForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
): Promise<AdmissionApplicationDto[]> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  const rows = await listApplications(admin, instituteId);
  return rows
    .filter((r) => canReadApplication(actor, r))
    .map(toApplicationDto);
}

export async function getApplicationForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<AdmissionApplicationDto> {
  const row = await findApplicationById(admin, id);
  if (!row || !canReadApplication(actor, row)) {
    throw AppError.notFound("Admission application not found");
  }
  return toApplicationDto(row);
}

export async function createApplicationForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateApplicationInput,
): Promise<AdmissionApplicationDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  if (!isMember(actor, instituteId)) {
    throw AppError.forbidden("Insufficient admissions access");
  }

  const opening = await findOpeningById(admin, input.openingId);
  if (!opening || opening.institute_id !== instituteId) {
    throw AppError.validation("Referenced resource is invalid", {
      opening_id: ["Opening not found in this institute"],
    });
  }
  if (opening.status !== "open") {
    throw AppError.conflict("Applications are only accepted for open intakes");
  }

  const name = input.studentDisplayName.trim();
  if (!name) {
    throw AppError.validation("Referenced resource is invalid", {
      student_display_name: ["Required"],
    });
  }

  const submitNow = input.submitNow === true;
  const row = await insertApplication(admin, {
    instituteId,
    openingId: opening.id,
    programId: opening.program_id,
    applicantUserId: actor.userId,
    studentDisplayName: name,
    status: submitNow ? "submitted" : "draft",
    payload: input.payload ?? {},
    submittedAt: submitNow ? new Date().toISOString() : null,
  });
  if (submitNow) {
    const { emitAdmissionApplicationCreatedNotification } = await import(
      "./notifications.js"
    );
    await emitAdmissionApplicationCreatedNotification(admin, actor.userId, row);
  }
  return toApplicationDto(row);
}

export async function transitionApplicationForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: TransitionApplicationInput,
): Promise<AdmissionApplicationDto> {
  const existing = await findApplicationById(admin, id);
  if (!existing || !canReadApplication(actor, existing)) {
    throw AppError.notFound("Admission application not found");
  }

  const isOwner = existing.applicant_user_id === actor.userId;
  const staff = isWriter(actor, existing.institute_id);

  // Applicant may submit draft→submitted or withdraw (non-terminal)
  if (!staff) {
    if (!isOwner) {
      throw AppError.notFound("Admission application not found");
    }
    const ownerOk =
      (existing.status === "draft" && input.status === "submitted") ||
      (input.status === "withdrawn" &&
        !["approved", "rejected", "withdrawn"].includes(existing.status));
    if (!ownerOk) {
      throw AppError.notFound("Admission application not found");
    }
  }

  const allowed = APP_TRANSITIONS[existing.status] ?? [];
  if (!allowed.includes(input.status)) {
    // Staff see real conflict; others never learn graph details
    if (!staff) {
      throw AppError.notFound("Admission application not found");
    }
    throw AppError.forbidden("Transition not allowed");
  }

  const patch: Record<string, unknown> = { status: input.status };
  if (input.status === "submitted" && !existing.submitted_at) {
    patch.submitted_at = new Date().toISOString();
  }
  if (input.decisionNote !== undefined) {
    if (!staff) {
      throw AppError.notFound("Admission application not found");
    }
    patch.decision_note = input.decisionNote?.trim() || null;
  }

  const updated = await updateApplicationFields(admin, id, patch);
  if (!updated) throw AppError.notFound("Admission application not found");
  if (updated.status !== existing.status) {
    const { emitAdmissionApplicationTransitionNotification } = await import(
      "./notifications.js"
    );
    await emitAdmissionApplicationTransitionNotification(admin, actor.userId, {
      application: updated,
      previousStatus: existing.status,
    });
  }
  return toApplicationDto(updated);
}

// ── Documents ────────────────────────────────────────────────────

export async function listDocumentsForActor(
  admin: SupabaseClient,
  actor: Actor,
  applicationId: string,
): Promise<AdmissionDocumentDto[]> {
  const application = await findApplicationById(admin, applicationId);
  if (!application || !canReadApplication(actor, application)) {
    throw AppError.notFound("Admission application not found");
  }
  const rows = await listDocumentsForApplication(admin, applicationId);
  return rows.map(toDocumentDto);
}

export async function createDocumentForActor(
  admin: SupabaseClient,
  actor: Actor,
  applicationId: string,
  input: CreateDocumentInput,
): Promise<AdmissionDocumentDto> {
  const application = await findApplicationById(admin, applicationId);
  if (!application || !isMember(actor, application.institute_id)) {
    throw AppError.notFound("Admission application not found");
  }
  const staff = isWriter(actor, application.institute_id);
  const isOwner = application.applicant_user_id === actor.userId;
  if (!staff && !isOwner) {
    throw AppError.notFound("Admission application not found");
  }
  if (
    !staff &&
    ["approved", "rejected", "withdrawn"].includes(application.status)
  ) {
    throw AppError.conflict("Cannot add documents to a closed application");
  }

  const label = input.label.trim();
  if (!label) {
    throw AppError.validation("Referenced resource is invalid", {
      label: ["Required"],
    });
  }

  const hasFile = Boolean(input.assetPath?.trim() || input.fileName?.trim());
  const row = await insertDocument(admin, {
    instituteId: application.institute_id,
    applicationId,
    docType: input.docType,
    label,
    fileName: input.fileName,
    assetPath: input.assetPath,
    uploadedByUserId: actor.userId,
    status: hasFile ? "uploaded" : "not_uploaded",
  });
  return toDocumentDto(row);
}

export async function updateDocumentForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: UpdateDocumentInput,
): Promise<AdmissionDocumentDto> {
  const existing = await findDocumentById(admin, id);
  if (!existing) throw AppError.notFound("Admission document not found");

  const application = await findApplicationById(admin, existing.application_id);
  if (!application || !isMember(actor, application.institute_id)) {
    throw AppError.notFound("Admission document not found");
  }

  const staff = isWriter(actor, application.institute_id);
  const isOwner = application.applicant_user_id === actor.userId;
  if (!staff && !isOwner) {
    throw AppError.notFound("Admission document not found");
  }

  const patch: Record<string, unknown> = {};
  if (input.status !== undefined) {
    // Status verification transitions are staff-only
    if (
      ["under_review", "verified", "rejected", "resubmission_required"].includes(
        input.status,
      ) &&
      !staff
    ) {
      throw AppError.forbidden("Only staff can verify documents");
    }
    patch.status = input.status;
  }
  if (input.note !== undefined) {
    if (!staff) throw AppError.forbidden("Only staff can set document notes");
    patch.note = input.note?.trim() || null;
  }
  if (input.fileName !== undefined) patch.file_name = input.fileName?.trim() || null;
  if (input.assetPath !== undefined) {
    patch.asset_path = input.assetPath?.trim() || null;
    if (input.assetPath?.trim() && !input.status) {
      patch.status = "uploaded";
    }
  }
  if (Object.keys(patch).length === 0) return toDocumentDto(existing);

  const updated = await updateDocumentFields(admin, id, patch);
  if (!updated) throw AppError.notFound("Admission document not found");

  if (input.status !== undefined && input.status !== existing.status) {
    await emitAdmissionDocumentStatusNotification(admin, actor, {
      application,
      document: updated,
      status: input.status,
    });
  }

  return toDocumentDto(updated);
}

export async function getAdmissionDocumentSignedUrlForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  expiresInSec?: number,
): Promise<import("../assets/service.js").AssetSignedUrlDto> {
  const existing = await findDocumentById(admin, id);
  if (!existing) throw AppError.notFound("Admission document not found");

  const application = await findApplicationById(admin, existing.application_id);
  if (!application || !isMember(actor, application.institute_id)) {
    throw AppError.notFound("Admission document not found");
  }

  if (!existing.asset_path) {
    throw AppError.notFound("Document file not uploaded yet");
  }

  const { resolveLinkedAssetSignedUrl } = await import(
    "../documents/persist-file.js"
  );
  return resolveLinkedAssetSignedUrl(admin, actor, {
    instituteId: application.institute_id,
    linkedEntityKind: "admission_document",
    linkedEntityId: existing.id,
    bucket: "admission-docs",
    objectPath: existing.asset_path,
    expiresInSec,
  });
}

async function emitAdmissionDocumentStatusNotification(
  admin: SupabaseClient,
  actor: Actor,
  input: {
    application: { applicant_user_id: string | null; institute_id: string };
    document: { label: string; doc_type: string };
    status: string;
  },
): Promise<void> {
  const applicantId = input.application.applicant_user_id;
  if (!applicantId) return;

  const { emitNotificationForInstituteSystem } = await import(
    "../notifications/service.js"
  );

  let title: string;
  let body: string;
  if (input.status === "verified") {
    title = "Document verified";
    body = `${input.document.label} was verified for your application.`;
  } else if (input.status === "rejected") {
    title = "Document rejected";
    body = `${input.document.label} was rejected. Check admissions for details.`;
  } else if (input.status === "resubmission_required") {
    title = "Document resubmission required";
    body = `Please re-upload ${input.document.label} for your application.`;
  } else {
    return;
  }

  try {
    await emitNotificationForInstituteSystem(admin, actor.userId, {
      instituteId: input.application.institute_id,
      recipientUserIds: [applicantId],
      category: "admissions",
      priority: "normal",
      title,
      body,
      deepLink: "/admissions/documents",
      dedupeKey: `adm-doc-${input.document.doc_type}-${input.status}-${Date.now()}`,
    });
  } catch {
    /* notification delivery must not block document updates */
  }
}

// ── Inquiries ────────────────────────────────────────────────────

export async function listInquiriesForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
): Promise<AdmissionInquiryDto[]> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  const rows = await listInquiries(admin, instituteId);
  return rows.filter((r) => canReadInquiry(actor, r)).map(toInquiryDto);
}

export async function createInquiryForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateInquiryInput,
): Promise<AdmissionInquiryDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  if (!isMember(actor, instituteId)) {
    throw AppError.forbidden("Insufficient admissions access");
  }
  const subject = input.subject.trim();
  const body = input.body.trim();
  const contactName = input.contactName.trim();
  if (!subject || !body || !contactName) {
    throw AppError.validation("Referenced resource is invalid", {
      subject: ["Required"],
    });
  }
  const row = await insertInquiry(admin, {
    ...input,
    instituteId,
    subject,
    body,
    contactName,
    requestedByUserId: actor.userId,
  });
  return toInquiryDto(row);
}

export async function respondInquiryForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: RespondInquiryInput,
): Promise<AdmissionInquiryDto> {
  const existing = await findInquiryById(admin, id);
  if (!existing || !isMember(actor, existing.institute_id)) {
    throw AppError.notFound("Admission inquiry not found");
  }
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Admission inquiry not found");
  }
  const note = input.responseNote.trim();
  if (!note) {
    throw AppError.validation("Referenced resource is invalid", {
      response_note: ["Required"],
    });
  }
  const updated = await updateInquiryFields(admin, id, {
    status: input.status,
    response_note: note,
    responded_by_user_id: actor.userId,
    responded_at: new Date().toISOString(),
  });
  if (!updated) throw AppError.notFound("Admission inquiry not found");
  return toInquiryDto(updated);
}
