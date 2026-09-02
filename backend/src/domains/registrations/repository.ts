import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  CreateRegistrationInput,
  InstituteRegistrationPayload,
  InstituteRegistrationRow,
} from "./types.js";

const REGISTRATION_COLS =
  "id, applicant_user_id, applicant_name, email, phone, payload, status, reviewed_by, reviewed_at, rejection_reason, institute_id, created_at, updated_at";

export async function findRegistrationById(
  admin: SupabaseClient,
  id: string,
): Promise<InstituteRegistrationRow | null> {
  const result = await admin
    .from("institute_registration")
    .select(REGISTRATION_COLS)
    .eq("id", id)
    .maybeSingle();

  if (result.error) ensureDbOk(result);
  return (result.data as InstituteRegistrationRow | null) ?? null;
}

export async function listRegistrations(
  admin: SupabaseClient,
  filter?: { status?: InstituteRegistrationRow["status"] },
): Promise<InstituteRegistrationRow[]> {
  let query = admin
    .from("institute_registration")
    .select(REGISTRATION_COLS)
    .order("created_at", { ascending: false });

  if (filter?.status) {
    query = query.eq("status", filter.status);
  }

  const result = await query;
  return ensureDbOk(result) as InstituteRegistrationRow[];
}

export async function updateRegistrationFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<InstituteRegistrationRow | null> {
  const result = await admin
    .from("institute_registration")
    .update(patch)
    .eq("id", id)
    .select(REGISTRATION_COLS)
    .maybeSingle();

  if (result.error) ensureDbOk(result);
  return (result.data as InstituteRegistrationRow | null) ?? null;
}

export async function findActiveMembershipForUserInstitute(
  admin: SupabaseClient,
  userId: string,
  instituteId: string,
): Promise<{ id: string; user_id: string; institute_id: string; status: string } | null> {
  const result = await admin
    .from("membership")
    .select("id, user_id, institute_id, status")
    .eq("user_id", userId)
    .eq("institute_id", instituteId)
    .is("deleted_at", null)
    .maybeSingle();

  if (result.error) ensureDbOk(result);
  return (result.data as {
    id: string;
    user_id: string;
    institute_id: string;
    status: string;
  } | null) ?? null;
}

export async function findRegistrationByApplicantUserId(
  admin: SupabaseClient,
  userId: string,
): Promise<InstituteRegistrationRow | null> {
  const result = await admin
    .from("institute_registration")
    .select(REGISTRATION_COLS)
    .eq("applicant_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (result.error) ensureDbOk(result);
  return (result.data as InstituteRegistrationRow | null) ?? null;
}

export async function findPendingRegistrationByApplicantUserId(
  admin: SupabaseClient,
  userId: string,
): Promise<InstituteRegistrationRow | null> {
  const result = await admin
    .from("institute_registration")
    .select(REGISTRATION_COLS)
    .eq("applicant_user_id", userId)
    .eq("status", "pending")
    .maybeSingle();

  if (result.error) ensureDbOk(result);
  return (result.data as InstituteRegistrationRow | null) ?? null;
}

export async function insertUserProfile(
  admin: SupabaseClient,
  input: {
    id: string;
    displayName: string;
    email: string;
    phone?: string | null;
  },
): Promise<void> {
  const result = await admin.from("user_profile").insert({
    id: input.id,
    display_name: input.displayName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone?.trim() || null,
    status: "active",
  });
  ensureDbOk(result);
}

export async function insertRegistration(
  admin: SupabaseClient,
  input: {
    applicantUserId: string;
    applicantName: string;
    email: string;
    phone?: string | null;
    payload: InstituteRegistrationPayload;
  },
): Promise<InstituteRegistrationRow> {
  const result = await admin
    .from("institute_registration")
    .insert({
      applicant_user_id: input.applicantUserId,
      applicant_name: input.applicantName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || null,
      payload: input.payload,
      status: "pending",
    })
    .select(REGISTRATION_COLS)
    .single();

  return ensureDbOk(result) as InstituteRegistrationRow;
}

export async function isPlatformOperatorUser(
  admin: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const result = await admin
    .from("platform_operator")
    .select("user_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (result.error) ensureDbOk(result);
  return Boolean(result.data);
}

/** Used by service tests — documents expected insert shape. */
export type RegistrationInsertInput = CreateRegistrationInput & {
  applicantUserId: string;
};
