import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  CareerApplicationRow,
  CareerApplicationStatus,
  CareerInquiryRow,
  CareerInquiryStatus,
  CareerJobRow,
  CareerJobStatus,
  CandidateProfileRow,
  CreateInquiryInput,
  CreateJobInput,
  SavedItemKind,
  TalentPoolEntryRow,
  TalentPoolStatus,
  UpsertCandidateProfileInput,
  UserSavedItemRow,
} from "./types.js";

export const JOB_COLS =
  "id, institute_id, title, slug, description, category, employment_type, work_mode, location_label, openings_count, status, created_by_user_id, created_at, updated_at, deleted_at";
export const PROFILE_COLS =
  "id, institute_id, user_profile_id, display_name, headline, summary, phone, email, payload, created_at, updated_at, deleted_at";
export const APPLICATION_COLS =
  "id, institute_id, job_id, candidate_profile_id, applicant_user_id, status, cover_letter, payload, decision_note, converted_teacher_id, submitted_at, created_at, updated_at, deleted_at";
export const INQUIRY_COLS =
  "id, institute_id, category, subject, body, contact_name, contact_email, contact_phone, status, response_note, requested_by_user_id, responded_by_user_id, responded_at, created_at, updated_at, deleted_at";
export const TALENT_COLS =
  "id, institute_id, candidate_user_id, candidate_profile_id, notes, status, created_by_user_id, created_at, updated_at, deleted_at";
export const SAVED_COLS =
  "id, institute_id, user_profile_id, item_kind, item_id, created_at, updated_at, deleted_at";

export async function listJobs(
  admin: SupabaseClient,
  instituteId: string,
): Promise<CareerJobRow[]> {
  const result = await admin
    .from("career_job")
    .select(JOB_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  return ensureDbOk(result) as CareerJobRow[];
}

export async function findJobById(
  admin: SupabaseClient,
  id: string,
): Promise<CareerJobRow | null> {
  const result = await admin
    .from("career_job")
    .select(JOB_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as CareerJobRow | null) ?? null;
}

export async function insertJob(
  admin: SupabaseClient,
  input: CreateJobInput & {
    createdByUserId: string;
    status: CareerJobStatus;
  },
): Promise<CareerJobRow> {
  const result = await admin
    .from("career_job")
    .insert({
      institute_id: input.instituteId,
      title: input.title.trim(),
      slug: input.slug.trim(),
      description: input.description?.trim() || null,
      category: input.category ?? "academic_faculty",
      employment_type: input.employmentType ?? "full_time",
      work_mode: input.workMode ?? "onsite",
      location_label: input.locationLabel?.trim() || null,
      openings_count: input.openingsCount ?? 1,
      status: input.status,
      created_by_user_id: input.createdByUserId,
    })
    .select(JOB_COLS)
    .single();
  return ensureDbOk(result) as CareerJobRow;
}

export async function updateJobFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<CareerJobRow | null> {
  const result = await admin
    .from("career_job")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(JOB_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as CareerJobRow | null) ?? null;
}

export async function softDeleteJob(
  admin: SupabaseClient,
  id: string,
): Promise<CareerJobRow | null> {
  const result = await admin
    .from("career_job")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(JOB_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as CareerJobRow | null) ?? null;
}

export async function findCandidateProfile(
  admin: SupabaseClient,
  instituteId: string,
  userProfileId: string,
): Promise<CandidateProfileRow | null> {
  const result = await admin
    .from("candidate_profile")
    .select(PROFILE_COLS)
    .eq("institute_id", instituteId)
    .eq("user_profile_id", userProfileId)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as CandidateProfileRow | null) ?? null;
}

export async function findCandidateProfileById(
  admin: SupabaseClient,
  id: string,
): Promise<CandidateProfileRow | null> {
  const result = await admin
    .from("candidate_profile")
    .select(PROFILE_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as CandidateProfileRow | null) ?? null;
}

export async function insertCandidateProfile(
  admin: SupabaseClient,
  input: UpsertCandidateProfileInput & { userProfileId: string },
): Promise<CandidateProfileRow> {
  const result = await admin
    .from("candidate_profile")
    .insert({
      institute_id: input.instituteId,
      user_profile_id: input.userProfileId,
      display_name: input.displayName.trim(),
      headline: input.headline?.trim() || null,
      summary: input.summary?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      payload: input.payload ?? {},
    })
    .select(PROFILE_COLS)
    .single();
  return ensureDbOk(result) as CandidateProfileRow;
}

export async function updateCandidateProfileFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<CandidateProfileRow | null> {
  const result = await admin
    .from("candidate_profile")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(PROFILE_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as CandidateProfileRow | null) ?? null;
}

export async function listApplications(
  admin: SupabaseClient,
  instituteId: string,
): Promise<CareerApplicationRow[]> {
  const result = await admin
    .from("career_application")
    .select(APPLICATION_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  return ensureDbOk(result) as CareerApplicationRow[];
}

export async function findApplicationById(
  admin: SupabaseClient,
  id: string,
): Promise<CareerApplicationRow | null> {
  const result = await admin
    .from("career_application")
    .select(APPLICATION_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as CareerApplicationRow | null) ?? null;
}

export async function insertApplication(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    jobId: string;
    candidateProfileId: string | null;
    applicantUserId: string;
    status: CareerApplicationStatus;
    coverLetter: string | null;
    payload: unknown;
    submittedAt: string | null;
  },
): Promise<CareerApplicationRow> {
  const result = await admin
    .from("career_application")
    .insert({
      institute_id: input.instituteId,
      job_id: input.jobId,
      candidate_profile_id: input.candidateProfileId,
      applicant_user_id: input.applicantUserId,
      status: input.status,
      cover_letter: input.coverLetter,
      payload: input.payload ?? {},
      decision_note: null,
      converted_teacher_id: null,
      submitted_at: input.submittedAt,
    })
    .select(APPLICATION_COLS)
    .single();
  return ensureDbOk(result) as CareerApplicationRow;
}

export async function updateApplicationFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<CareerApplicationRow | null> {
  const result = await admin
    .from("career_application")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(APPLICATION_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as CareerApplicationRow | null) ?? null;
}

export async function listInquiries(
  admin: SupabaseClient,
  instituteId: string,
): Promise<CareerInquiryRow[]> {
  const result = await admin
    .from("career_inquiry")
    .select(INQUIRY_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  return ensureDbOk(result) as CareerInquiryRow[];
}

export async function findInquiryById(
  admin: SupabaseClient,
  id: string,
): Promise<CareerInquiryRow | null> {
  const result = await admin
    .from("career_inquiry")
    .select(INQUIRY_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as CareerInquiryRow | null) ?? null;
}

export async function insertInquiry(
  admin: SupabaseClient,
  input: CreateInquiryInput & { requestedByUserId: string },
): Promise<CareerInquiryRow> {
  const result = await admin
    .from("career_inquiry")
    .insert({
      institute_id: input.instituteId,
      category: input.category ?? "general",
      subject: input.subject.trim(),
      body: input.body.trim(),
      contact_name: input.contactName.trim(),
      contact_email: input.contactEmail?.trim() || null,
      contact_phone: input.contactPhone?.trim() || null,
      status: "open" satisfies CareerInquiryStatus,
      response_note: null,
      requested_by_user_id: input.requestedByUserId,
      responded_by_user_id: null,
      responded_at: null,
    })
    .select(INQUIRY_COLS)
    .single();
  return ensureDbOk(result) as CareerInquiryRow;
}

export async function updateInquiryFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<CareerInquiryRow | null> {
  const result = await admin
    .from("career_inquiry")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(INQUIRY_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as CareerInquiryRow | null) ?? null;
}

export async function listTalentPool(
  admin: SupabaseClient,
  instituteId: string,
): Promise<TalentPoolEntryRow[]> {
  const result = await admin
    .from("talent_pool_entry")
    .select(TALENT_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  return ensureDbOk(result) as TalentPoolEntryRow[];
}

export async function findTalentPoolEntry(
  admin: SupabaseClient,
  instituteId: string,
  candidateUserId: string,
): Promise<TalentPoolEntryRow | null> {
  const result = await admin
    .from("talent_pool_entry")
    .select(TALENT_COLS)
    .eq("institute_id", instituteId)
    .eq("candidate_user_id", candidateUserId)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as TalentPoolEntryRow | null) ?? null;
}

export async function insertTalentPoolEntry(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    candidateUserId: string;
    candidateProfileId: string | null;
    notes: string | null;
    createdByUserId: string;
    status: TalentPoolStatus;
  },
): Promise<TalentPoolEntryRow> {
  const result = await admin
    .from("talent_pool_entry")
    .insert({
      institute_id: input.instituteId,
      candidate_user_id: input.candidateUserId,
      candidate_profile_id: input.candidateProfileId,
      notes: input.notes,
      status: input.status,
      created_by_user_id: input.createdByUserId,
    })
    .select(TALENT_COLS)
    .single();
  return ensureDbOk(result) as TalentPoolEntryRow;
}

export async function softDeleteTalentPoolEntry(
  admin: SupabaseClient,
  id: string,
): Promise<TalentPoolEntryRow | null> {
  const result = await admin
    .from("talent_pool_entry")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(TALENT_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as TalentPoolEntryRow | null) ?? null;
}

export async function findTalentPoolById(
  admin: SupabaseClient,
  id: string,
): Promise<TalentPoolEntryRow | null> {
  const result = await admin
    .from("talent_pool_entry")
    .select(TALENT_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as TalentPoolEntryRow | null) ?? null;
}

export async function listSavedItems(
  admin: SupabaseClient,
  instituteId: string,
  userProfileId: string,
): Promise<UserSavedItemRow[]> {
  const result = await admin
    .from("user_saved_item")
    .select(SAVED_COLS)
    .eq("institute_id", instituteId)
    .eq("user_profile_id", userProfileId)
    .is("deleted_at", null);
  return ensureDbOk(result) as UserSavedItemRow[];
}

export async function findSavedItem(
  admin: SupabaseClient,
  instituteId: string,
  userProfileId: string,
  itemKind: SavedItemKind,
  itemId: string,
): Promise<UserSavedItemRow | null> {
  const result = await admin
    .from("user_saved_item")
    .select(SAVED_COLS)
    .eq("institute_id", instituteId)
    .eq("user_profile_id", userProfileId)
    .eq("item_kind", itemKind)
    .eq("item_id", itemId)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as UserSavedItemRow | null) ?? null;
}

export async function insertSavedItem(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    userProfileId: string;
    itemKind: SavedItemKind;
    itemId: string;
  },
): Promise<UserSavedItemRow> {
  const result = await admin
    .from("user_saved_item")
    .insert({
      institute_id: input.instituteId,
      user_profile_id: input.userProfileId,
      item_kind: input.itemKind,
      item_id: input.itemId,
    })
    .select(SAVED_COLS)
    .single();
  return ensureDbOk(result) as UserSavedItemRow;
}

export async function softDeleteSavedItem(
  admin: SupabaseClient,
  id: string,
): Promise<UserSavedItemRow | null> {
  const result = await admin
    .from("user_saved_item")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(SAVED_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as UserSavedItemRow | null) ?? null;
}

export async function findSavedItemById(
  admin: SupabaseClient,
  id: string,
): Promise<UserSavedItemRow | null> {
  const result = await admin
    .from("user_saved_item")
    .select(SAVED_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as UserSavedItemRow | null) ?? null;
}
