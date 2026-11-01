import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import { AppError } from "../../errors/app-error.js";
import type {
  CreateRegistrationInput,
  InstituteRegistrationLegalConsentRow,
  InstituteRegistrationPayload,
  InstituteRegistrationRow,
} from "./types.js";
import type { ValidatedRegistrationLegalConsent } from "./legal-consent.js";
import { registrationRowFieldsFromPayload } from "./payload.js";

const REGISTRATION_COLS =
  "id, applicant_user_id, applicant_name, email, phone, payload, status, reviewed_by, reviewed_at, rejection_reason, institute_id, created_at, updated_at, institute_code, institute_type, education_board, school_email, school_phone, applicant_username, admin_designation, country, state, district, city, area, street, landmark, pincode, website";

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

export async function updateRegistrationFieldsIfStatus(
  admin: SupabaseClient,
  id: string,
  expectedStatus: InstituteRegistrationRow["status"],
  patch: Record<string, unknown>,
): Promise<InstituteRegistrationRow | null> {
  const result = await admin
    .from("institute_registration")
    .update(patch)
    .eq("id", id)
    .eq("status", expectedStatus)
    .select(REGISTRATION_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as InstituteRegistrationRow | null) ?? null;
}

export async function beginRegistrationApproval(
  admin: SupabaseClient,
  id: string,
  reviewerUserId: string,
): Promise<InstituteRegistrationRow | null> {
  if (typeof admin.rpc === "function") {
    const rpc = await admin.rpc("begin_institute_registration_approval", {
      p_registration_id: id,
      p_reviewer_user_id: reviewerUserId,
    });
    if (!rpc.error) {
      const rows = (rpc.data ?? []) as InstituteRegistrationRow[];
      return rows[0] ?? null;
    }
    // Deployments may briefly run the API before the migration reaches the DB.
    if (!["42883", "PGRST202"].includes(rpc.error.code ?? "")) ensureDbOk(rpc);
  }

  const claimed = await admin
    .from("institute_registration")
    .update({
      status: "approving",
      reviewed_by: reviewerUserId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq("id", id)
    .eq("status", "pending")
    .select(REGISTRATION_COLS)
    .maybeSingle();
  if (claimed.error) ensureDbOk(claimed);
  return (claimed.data as InstituteRegistrationRow | null)
    ?? findRegistrationById(admin, id);
}

export async function finishRegistrationApproval(
  admin: SupabaseClient,
  id: string,
  instituteId: string,
  reviewerUserId: string,
): Promise<InstituteRegistrationRow | null> {
  if (typeof admin.rpc === "function") {
    const rpc = await admin.rpc("finish_institute_registration_approval", {
      p_registration_id: id,
      p_institute_id: instituteId,
      p_reviewer_user_id: reviewerUserId,
    });
    if (!rpc.error) {
      const rows = (rpc.data ?? []) as InstituteRegistrationRow[];
      return rows[0] ?? null;
    }
    if (!["42883", "PGRST202"].includes(rpc.error.code ?? "")) ensureDbOk(rpc);
  }

  const result = await admin
    .from("institute_registration")
    .update({
      status: "approved",
      institute_id: instituteId,
      reviewed_by: reviewerUserId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq("id", id)
    .in("status", ["approving", "approved"])
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
    username?: string | null;
  },
): Promise<void> {
  const username = input.username?.trim().toLowerCase() || null;
  const result = await admin
    .from("user_profile")
    .upsert(
      {
        id: input.id,
        display_name: input.displayName.trim(),
        email: input.email.trim().toLowerCase(),
        phone: input.phone?.trim() || null,
        ...(username ? { username } : {}),
        status: "active",
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
  ensureDbOk(result);
}

function consentDocumentsJson(consent: ValidatedRegistrationLegalConsent) {
  return consent.documents.map((doc) => ({
    id: doc.id,
    version: doc.version,
  }));
}

function registrationMirrorRpcArgs(payload: InstituteRegistrationPayload) {
  const fields = registrationRowFieldsFromPayload(payload);
  return {
    p_institute_code: fields.institute_code,
    p_institute_type: fields.institute_type,
    p_education_board: fields.education_board,
    p_school_email: fields.school_email,
    p_school_phone: fields.school_phone,
    p_applicant_username: fields.applicant_username,
    p_admin_designation: fields.admin_designation,
    p_country: fields.country,
    p_state: fields.state,
    p_district: fields.district,
    p_city: fields.city,
    p_area: fields.area,
    p_street: fields.street,
    p_landmark: fields.landmark,
    p_pincode: fields.pincode,
    p_website: fields.website,
  };
}

/**
 * Atomically insert pending registration + required legal consent (Postgres RPC).
 * No non-atomic client fallback — missing RPC must fail closed.
 */
export async function insertRegistrationWithLegalConsent(
  admin: SupabaseClient,
  input: {
    applicantUserId: string;
    applicantName: string;
    email: string;
    phone?: string | null;
    payload: InstituteRegistrationPayload;
    consent: ValidatedRegistrationLegalConsent;
  },
): Promise<InstituteRegistrationRow> {
  const rpc = await admin.rpc("create_institute_registration_with_legal_consent", {
    p_applicant_user_id: input.applicantUserId,
    p_applicant_name: input.applicantName.trim(),
    p_email: input.email.trim().toLowerCase(),
    p_phone: input.phone?.trim() || null,
    p_payload: input.payload,
    ...registrationMirrorRpcArgs(input.payload),
    p_consent_documents: consentDocumentsJson(input.consent),
    p_consent_action: input.consent.action,
    p_accepted_at: input.consent.acceptedAt,
  });
  if (rpc.error) ensureDbOk(rpc);
  const row = ((rpc.data ?? []) as InstituteRegistrationRow[])[0];
  if (!row) {
    throw AppError.internal("Registration create returned no row");
  }
  return row;
}

/** @deprecated Prefer insertRegistrationWithLegalConsent — kept for non-consent tooling/tests. */
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
      ...registrationRowFieldsFromPayload(input.payload),
    })
    .select(REGISTRATION_COLS)
    .single();

  return ensureDbOk(result) as InstituteRegistrationRow;
}

export async function listRegistrationLegalConsent(
  admin: SupabaseClient,
  registrationId: string,
): Promise<InstituteRegistrationLegalConsentRow[]> {
  const result = await admin
    .from("institute_registration_legal_consent")
    .select(
      "id, registration_id, document_id, document_version, action, accepted_at, created_at",
    )
    .eq("registration_id", registrationId)
    .order("document_id", { ascending: true });
  return ensureDbOk(result) as InstituteRegistrationLegalConsentRow[];
}

/**
 * Attach/repair consent for an existing registration (pending retry).
 * Single RPC — all consent rows succeed or fail together.
 */
export async function upsertRegistrationLegalConsent(
  admin: SupabaseClient,
  registrationId: string,
  consent: ValidatedRegistrationLegalConsent,
): Promise<void> {
  const rpc = await admin.rpc("upsert_institute_registration_legal_consent", {
    p_registration_id: registrationId,
    p_consent_documents: consentDocumentsJson(consent),
    p_consent_action: consent.action,
    p_accepted_at: consent.acceptedAt,
  });
  if (rpc.error) ensureDbOk(rpc);
}

/**
 * Atomically move rejected → pending and upsert legal consent.
 */
export async function resubmitRegistrationWithLegalConsent(
  admin: SupabaseClient,
  input: {
    registrationId: string;
    applicantUserId: string;
    applicantName: string;
    phone?: string | null;
    payload: InstituteRegistrationPayload;
    consent: ValidatedRegistrationLegalConsent;
  },
): Promise<InstituteRegistrationRow | null> {
  const rpc = await admin.rpc("resubmit_institute_registration_with_legal_consent", {
    p_registration_id: input.registrationId,
    p_applicant_user_id: input.applicantUserId,
    p_applicant_name: input.applicantName.trim(),
    p_phone: input.phone,
    p_payload: input.payload,
    ...registrationMirrorRpcArgs(input.payload),
    p_consent_documents: consentDocumentsJson(input.consent),
    p_accepted_at: input.consent.acceptedAt,
  });
  if (rpc.error) ensureDbOk(rpc);
  const row = ((rpc.data ?? []) as InstituteRegistrationRow[])[0];
  return row ?? null;
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
