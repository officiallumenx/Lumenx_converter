import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  actorHasInstituteRole,
  requireInstituteId,
} from "../../authorization/index.js";
import {
  findApplicationById,
  findCandidateProfile,
  findCandidateProfileById,
  findInquiryById,
  findJobById,
  findSavedItem,
  findSavedItemById,
  findTalentPoolById,
  findTalentPoolEntry,
  insertApplication,
  insertCandidateProfile,
  insertInquiry,
  insertJob,
  insertSavedItem,
  insertTalentPoolEntry,
  listApplications,
  listInquiries,
  listJobs,
  listSavedItems,
  listTalentPool,
  softDeleteJob,
  softDeleteSavedItem,
  softDeleteTalentPoolEntry,
  updateApplicationFields,
  updateCandidateProfileFields,
  updateInquiryFields,
  updateJobFields,
} from "./repository.js";
import type {
  CareerApplicationDto,
  CareerApplicationRow,
  CareerApplicationStatus,
  CareerInquiryDto,
  CareerInquiryRow,
  CareerJobDto,
  CareerJobRow,
  CandidateProfileDto,
  CandidateProfileRow,
  CreateApplicationInput,
  CreateInquiryInput,
  CreateJobInput,
  CreateSavedItemInput,
  CreateTalentPoolInput,
  RespondInquiryInput,
  TalentPoolEntryDto,
  TalentPoolEntryRow,
  TransitionApplicationInput,
  UpdateJobInput,
  UpsertCandidateProfileInput,
  UserSavedItemDto,
  UserSavedItemRow,
} from "./types.js";

export const CAREER_WRITE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "it_admin",
  "staff",
] as const;

export const CAREER_STAFF_READ_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "it_admin",
  "staff",
  "teacher",
  "accountant",
  "admissions_officer",
] as const;

const APP_TRANSITIONS: Record<
  CareerApplicationStatus,
  CareerApplicationStatus[]
> = {
  draft: ["submitted", "withdrawn"],
  submitted: ["under_review", "rejected", "withdrawn", "on_hold"],
  under_review: [
    "shortlisted",
    "rejected",
    "withdrawn",
    "on_hold",
    "assessment",
  ],
  shortlisted: [
    "assessment",
    "demo_class",
    "interview_scheduled",
    "rejected",
    "withdrawn",
    "on_hold",
  ],
  assessment: [
    "demo_class",
    "interview_scheduled",
    "shortlisted",
    "rejected",
    "on_hold",
    "withdrawn",
  ],
  demo_class: [
    "interview_scheduled",
    "interview_completed",
    "rejected",
    "on_hold",
    "withdrawn",
  ],
  interview_scheduled: [
    "interview_completed",
    "rejected",
    "on_hold",
    "withdrawn",
  ],
  interview_completed: [
    "offer_sent",
    "rejected",
    "on_hold",
    "shortlisted",
    "withdrawn",
  ],
  offer_sent: ["offer_accepted", "rejected", "withdrawn", "on_hold"],
  offer_accepted: ["selected", "withdrawn"],
  selected: [],
  rejected: [],
  on_hold: [
    "under_review",
    "shortlisted",
    "rejected",
    "withdrawn",
    "assessment",
  ],
  withdrawn: [],
};

const TERMINAL_APP_STATUSES: CareerApplicationStatus[] = [
  "selected",
  "rejected",
  "withdrawn",
];

export function toJobDto(row: CareerJobRow): CareerJobDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    category: row.category,
    employmentType: row.employment_type,
    workMode: row.work_mode,
    locationLabel: row.location_label,
    openingsCount: row.openings_count,
    status: row.status,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toCandidateProfileDto(
  row: CandidateProfileRow,
): CandidateProfileDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    userProfileId: row.user_profile_id,
    displayName: row.display_name,
    headline: row.headline,
    summary: row.summary,
    phone: row.phone,
    email: row.email,
    payload: row.payload,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toApplicationDto(
  row: CareerApplicationRow,
): CareerApplicationDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    jobId: row.job_id,
    candidateProfileId: row.candidate_profile_id,
    applicantUserId: row.applicant_user_id,
    status: row.status,
    coverLetter: row.cover_letter,
    payload: row.payload,
    decisionNote: row.decision_note,
    convertedTeacherId: row.converted_teacher_id,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toInquiryDto(row: CareerInquiryRow): CareerInquiryDto {
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

export function toTalentPoolDto(row: TalentPoolEntryRow): TalentPoolEntryDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    candidateUserId: row.candidate_user_id,
    candidateProfileId: row.candidate_profile_id,
    notes: row.notes,
    status: row.status,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toSavedItemDto(row: UserSavedItemRow): UserSavedItemDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    userProfileId: row.user_profile_id,
    itemKind: row.item_kind,
    itemId: row.item_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isWriter(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  return CAREER_WRITE_ROLES.some((role) =>
    actorHasInstituteRole(actor, instituteId, role),
  );
}

function isStaffReader(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  return CAREER_STAFF_READ_ROLES.some((role) =>
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

function canReadJob(actor: Actor, row: CareerJobRow): boolean {
  if (!isMember(actor, row.institute_id)) return false;
  if (isStaffReader(actor, row.institute_id)) return true;
  return row.status === "open" || row.status === "closed";
}

function canReadApplication(
  actor: Actor,
  row: CareerApplicationRow,
): boolean {
  if (!isMember(actor, row.institute_id)) return false;
  if (isStaffReader(actor, row.institute_id)) return true;
  return row.applicant_user_id === actor.userId;
}

function canReadInquiry(actor: Actor, row: CareerInquiryRow): boolean {
  if (!isMember(actor, row.institute_id)) return false;
  if (isStaffReader(actor, row.institute_id)) return true;
  return row.requested_by_user_id === actor.userId;
}

function canReadCandidateProfile(
  actor: Actor,
  row: CandidateProfileRow,
): boolean {
  if (!isMember(actor, row.institute_id)) return false;
  if (isStaffReader(actor, row.institute_id)) return true;
  return row.user_profile_id === actor.userId;
}

function canReadTalentPool(actor: Actor, row: TalentPoolEntryRow): boolean {
  if (!isMember(actor, row.institute_id)) return false;
  return isStaffReader(actor, row.institute_id);
}

function canReadSavedItem(actor: Actor, row: UserSavedItemRow): boolean {
  if (!isMember(actor, row.institute_id)) return false;
  return row.user_profile_id === actor.userId;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Jobs ─────────────────────────────────────────────────────────

export async function listJobsForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
): Promise<CareerJobDto[]> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  const rows = await listJobs(admin, instituteId);
  return rows.filter((r) => canReadJob(actor, r)).map(toJobDto);
}

export async function getJobForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<CareerJobDto> {
  const row = await findJobById(admin, id);
  if (!row || !canReadJob(actor, row)) {
    throw AppError.notFound("Career job not found");
  }
  return toJobDto(row);
}

export async function createJobForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateJobInput,
): Promise<CareerJobDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  if (!isWriter(actor, instituteId)) {
    throw AppError.forbidden("Insufficient careers write access");
  }
  const title = input.title.trim();
  const slug = (input.slug?.trim() || slugify(title)).trim();
  if (!title || !slug) {
    throw AppError.validation("Referenced resource is invalid", {
      title: ["Required"],
    });
  }
  const row = await insertJob(admin, {
    ...input,
    instituteId,
    title,
    slug,
    createdByUserId: actor.userId,
    status: input.openNow ? "open" : "draft",
  });
  return toJobDto(row);
}

export async function updateJobForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: UpdateJobInput,
): Promise<CareerJobDto> {
  const existing = await findJobById(admin, id);
  if (!existing || !canReadJob(actor, existing)) {
    throw AppError.notFound("Career job not found");
  }
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Career job not found");
  }
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.slug !== undefined) patch.slug = input.slug.trim();
  if (input.description !== undefined) {
    patch.description = input.description?.trim() || null;
  }
  if (input.category !== undefined) patch.category = input.category;
  if (input.employmentType !== undefined) {
    patch.employment_type = input.employmentType;
  }
  if (input.workMode !== undefined) patch.work_mode = input.workMode;
  if (input.locationLabel !== undefined) {
    patch.location_label = input.locationLabel?.trim() || null;
  }
  if (input.openingsCount !== undefined) {
    patch.openings_count = input.openingsCount;
  }
  if (input.status !== undefined) patch.status = input.status;
  if (Object.keys(patch).length === 0) return toJobDto(existing);
  const updated = await updateJobFields(admin, id, patch);
  if (!updated) throw AppError.notFound("Career job not found");
  return toJobDto(updated);
}

export async function deleteJobForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<void> {
  const existing = await findJobById(admin, id);
  if (!existing || !canReadJob(actor, existing)) {
    throw AppError.notFound("Career job not found");
  }
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Career job not found");
  }
  if (existing.status === "open") {
    throw AppError.conflict("Close job before deleting");
  }
  const deleted = await softDeleteJob(admin, id);
  if (!deleted) throw AppError.notFound("Career job not found");
}

// ── Candidate profiles ───────────────────────────────────────────

export async function getMyCandidateProfileForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
): Promise<CandidateProfileDto | null> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  if (!isMember(actor, instituteId)) {
    throw AppError.forbidden("Insufficient careers access");
  }
  const row = await findCandidateProfile(admin, instituteId, actor.userId);
  if (!row) return null;
  return toCandidateProfileDto(row);
}

export async function getCandidateProfileForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<CandidateProfileDto> {
  const row = await findCandidateProfileById(admin, id);
  if (!row || !canReadCandidateProfile(actor, row)) {
    throw AppError.notFound("Candidate profile not found");
  }
  return toCandidateProfileDto(row);
}

export async function upsertCandidateProfileForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: UpsertCandidateProfileInput,
): Promise<CandidateProfileDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  if (!isMember(actor, instituteId)) {
    throw AppError.forbidden("Insufficient careers access");
  }
  const displayName = input.displayName.trim();
  if (!displayName) {
    throw AppError.validation("Referenced resource is invalid", {
      display_name: ["Required"],
    });
  }

  const existing = await findCandidateProfile(admin, instituteId, actor.userId);
  if (existing) {
    const patch: Record<string, unknown> = {
      display_name: displayName,
    };
    if (input.headline !== undefined) {
      patch.headline = input.headline?.trim() || null;
    }
    if (input.summary !== undefined) {
      patch.summary = input.summary?.trim() || null;
    }
    if (input.phone !== undefined) patch.phone = input.phone?.trim() || null;
    if (input.email !== undefined) patch.email = input.email?.trim() || null;
    if (input.payload !== undefined) patch.payload = input.payload;
    const updated = await updateCandidateProfileFields(admin, existing.id, patch);
    if (!updated) throw AppError.notFound("Candidate profile not found");
    return toCandidateProfileDto(updated);
  }

  const row = await insertCandidateProfile(admin, {
    ...input,
    instituteId,
    displayName,
    userProfileId: actor.userId,
  });
  return toCandidateProfileDto(row);
}

// ── Applications ─────────────────────────────────────────────────

export async function listApplicationsForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
): Promise<CareerApplicationDto[]> {
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
): Promise<CareerApplicationDto> {
  const row = await findApplicationById(admin, id);
  if (!row || !canReadApplication(actor, row)) {
    throw AppError.notFound("Career application not found");
  }
  return toApplicationDto(row);
}

export async function createApplicationForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateApplicationInput,
): Promise<CareerApplicationDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  if (!isMember(actor, instituteId)) {
    throw AppError.forbidden("Insufficient careers access");
  }

  const job = await findJobById(admin, input.jobId);
  if (!job || job.institute_id !== instituteId || !canReadJob(actor, job)) {
    throw AppError.validation("Referenced resource is invalid", {
      job_id: ["Job not found in this institute"],
    });
  }
  if (job.status !== "open") {
    throw AppError.conflict("Applications are only accepted for open jobs");
  }

  const profile = await findCandidateProfile(admin, instituteId, actor.userId);
  const submitNow = input.submitNow === true;
  const row = await insertApplication(admin, {
    instituteId,
    jobId: job.id,
    candidateProfileId: profile?.id ?? null,
    applicantUserId: actor.userId,
    status: submitNow ? "submitted" : "draft",
    coverLetter: input.coverLetter?.trim() || null,
    payload: input.payload ?? {},
    submittedAt: submitNow ? new Date().toISOString() : null,
  });
  return toApplicationDto(row);
}

export async function transitionApplicationForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: TransitionApplicationInput,
): Promise<CareerApplicationDto> {
  const existing = await findApplicationById(admin, id);
  if (!existing || !canReadApplication(actor, existing)) {
    throw AppError.notFound("Career application not found");
  }

  const isOwner = existing.applicant_user_id === actor.userId;
  const staff = isWriter(actor, existing.institute_id);

  if (!staff) {
    if (!isOwner) {
      throw AppError.notFound("Career application not found");
    }
    const ownerOk =
      (existing.status === "draft" && input.status === "submitted") ||
      (input.status === "withdrawn" &&
        !TERMINAL_APP_STATUSES.includes(existing.status));
    if (!ownerOk) {
      throw AppError.notFound("Career application not found");
    }
  }

  const allowed = APP_TRANSITIONS[existing.status] ?? [];
  if (!allowed.includes(input.status)) {
    if (!staff) {
      throw AppError.notFound("Career application not found");
    }
    throw AppError.forbidden("Transition not allowed");
  }

  const patch: Record<string, unknown> = { status: input.status };
  if (input.status === "submitted" && !existing.submitted_at) {
    patch.submitted_at = new Date().toISOString();
  }
  if (input.decisionNote !== undefined) {
    if (!staff) {
      throw AppError.notFound("Career application not found");
    }
    patch.decision_note = input.decisionNote?.trim() || null;
  }

  const updated = await updateApplicationFields(admin, id, patch);
  if (!updated) throw AppError.notFound("Career application not found");
  return toApplicationDto(updated);
}

// ── Inquiries ────────────────────────────────────────────────────

export async function listInquiriesForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
): Promise<CareerInquiryDto[]> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  const rows = await listInquiries(admin, instituteId);
  return rows.filter((r) => canReadInquiry(actor, r)).map(toInquiryDto);
}

export async function createInquiryForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateInquiryInput,
): Promise<CareerInquiryDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  if (!isMember(actor, instituteId)) {
    throw AppError.forbidden("Insufficient careers access");
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
): Promise<CareerInquiryDto> {
  const existing = await findInquiryById(admin, id);
  if (!existing || !canReadInquiry(actor, existing)) {
    throw AppError.notFound("Career inquiry not found");
  }
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Career inquiry not found");
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
  if (!updated) throw AppError.notFound("Career inquiry not found");
  return toInquiryDto(updated);
}

// ── Talent pool (staff-only) ─────────────────────────────────────

export async function listTalentPoolForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
): Promise<TalentPoolEntryDto[]> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  if (!isStaffReader(actor, instituteId)) {
    throw AppError.forbidden("Insufficient careers access");
  }
  const rows = await listTalentPool(admin, instituteId);
  return rows.filter((r) => canReadTalentPool(actor, r)).map(toTalentPoolDto);
}

export async function createTalentPoolEntryForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateTalentPoolInput,
): Promise<TalentPoolEntryDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  if (!isWriter(actor, instituteId)) {
    throw AppError.forbidden("Insufficient careers write access");
  }
  const existing = await findTalentPoolEntry(
    admin,
    instituteId,
    input.candidateUserId,
  );
  if (existing) {
    throw AppError.conflict("Candidate already in talent pool");
  }
  const profile = await findCandidateProfile(
    admin,
    instituteId,
    input.candidateUserId,
  );
  const row = await insertTalentPoolEntry(admin, {
    instituteId,
    candidateUserId: input.candidateUserId,
    candidateProfileId: profile?.id ?? null,
    notes: input.notes?.trim() || null,
    createdByUserId: actor.userId,
    status: "active",
  });
  return toTalentPoolDto(row);
}

export async function deleteTalentPoolEntryForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<void> {
  const existing = await findTalentPoolById(admin, id);
  if (!existing || !canReadTalentPool(actor, existing)) {
    throw AppError.notFound("Talent pool entry not found");
  }
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Talent pool entry not found");
  }
  const deleted = await softDeleteTalentPoolEntry(admin, id);
  if (!deleted) throw AppError.notFound("Talent pool entry not found");
}

// ── Saved items (owner-only) ─────────────────────────────────────

export async function listSavedItemsForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
): Promise<UserSavedItemDto[]> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  if (!isMember(actor, instituteId)) {
    throw AppError.forbidden("Insufficient careers access");
  }
  const rows = await listSavedItems(admin, instituteId, actor.userId);
  return rows.filter((r) => canReadSavedItem(actor, r)).map(toSavedItemDto);
}

export async function createSavedItemForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateSavedItemInput,
): Promise<UserSavedItemDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  if (!isMember(actor, instituteId)) {
    throw AppError.forbidden("Insufficient careers access");
  }
  if (input.itemKind !== "career_job") {
    throw AppError.validation("Referenced resource is invalid", {
      item_kind: ["Unsupported item kind"],
    });
  }
  const job = await findJobById(admin, input.itemId);
  if (!job || job.institute_id !== instituteId || !canReadJob(actor, job)) {
    throw AppError.validation("Referenced resource is invalid", {
      item_id: ["Job not found"],
    });
  }
  const existing = await findSavedItem(
    admin,
    instituteId,
    actor.userId,
    input.itemKind,
    input.itemId,
  );
  if (existing) return toSavedItemDto(existing);

  const row = await insertSavedItem(admin, {
    instituteId,
    userProfileId: actor.userId,
    itemKind: input.itemKind,
    itemId: input.itemId,
  });
  return toSavedItemDto(row);
}

export async function deleteSavedItemForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<void> {
  const existing = await findSavedItemById(admin, id);
  if (!existing || !canReadSavedItem(actor, existing)) {
    throw AppError.notFound("Saved item not found");
  }
  const deleted = await softDeleteSavedItem(admin, id);
  if (!deleted) throw AppError.notFound("Saved item not found");
}
