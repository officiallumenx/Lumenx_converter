import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import { signInPasswordForUserId } from "../../auth/create-server-session.js";
import {
  findCredentialByUsername,
  upsertUserAuthCredential,
} from "../auth-credentials/repository.js";
import { findInstituteByCode, findProfileById } from "../identity/repository.js";
import {
  findPendingRegistrationByApplicantUserId,
  findRegistrationByApplicantUserId,
  insertRegistration,
  insertUserProfile,
  isPlatformOperatorUser,
  updateRegistrationFields,
} from "./repository.js";
import {
  normalizeInstituteCode,
  normalizeRegistrationPayload,
  normalizeUsername,
  registrationRowFieldsFromPayload,
  validateRegistrationApplication,
} from "./payload.js";
import type {
  CreateRegistrationInput,
  InstituteRegistrationDto,
  InstituteRegistrationRow,
  ResubmitRegistrationInput,
} from "./types.js";

export { normalizeInstituteCode } from "./payload.js";

export function toRegistrationDto(
  row: InstituteRegistrationRow,
): InstituteRegistrationDto {
  return {
    id: row.id,
    applicantUserId: row.applicant_user_id,
    applicantName: row.applicant_name,
    email: row.email,
    phone: row.phone,
    payload: row.payload,
    // "approving" is an internal resumable state; clients continue to see the
    // request as pending until all provisioning has completed.
    status: row.status === "approving" ? "pending" : row.status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    rejectionReason: row.rejection_reason,
    instituteId: row.institute_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function assertInstituteCodeAvailable(
  admin: SupabaseClient,
  code: string,
): Promise<void> {
  const existing = await findInstituteByCode(admin, code);
  if (existing) {
    throw AppError.conflict("This institute code is already in use. Choose another.");
  }
}

async function assertUsernameAvailable(
  admin: SupabaseClient,
  username: string,
  exceptUserId?: string,
): Promise<void> {
  const normalized = normalizeUsername(username);
  if (!normalized) return;
  const taken = await findCredentialByUsername(admin, normalized);
  if (taken && taken.user_id !== exceptUserId) {
    throw AppError.conflict("This username is already taken. Choose another.");
  }
}

async function provisionAuthUser(
  admin: SupabaseClient,
  email: string,
  password: string,
): Promise<string> {
  const normalized = normalizeEmail(email);
  // email_confirm: true until production SMTP + enable_confirmations are configured.
  // See apps/admin/src/auth/auth-email-verification-policy.ts for rollout steps.
  const { data, error } = await admin.auth.admin.createUser({
    email: normalized,
    password,
    email_confirm: true,
  });

  if (error || !data.user?.id) {
    const message = error?.message?.toLowerCase() ?? "";
    if (
      message.includes("already") ||
      message.includes("registered") ||
      message.includes("exists")
    ) {
      // A previous registration request may have created Auth successfully before
      // a downstream provider/session step failed. Verify the submitted password
      // so retrying the same form can safely resume instead of becoming a duplicate.
      const existingUserId = await signInPasswordForUserId(admin, normalized, password);
      if (existingUserId) return existingUserId;
      throw AppError.conflict(
        "An account with this email already exists. Sign in or use a different email.",
      );
    }
    throw AppError.validation("Unable to create account. Check your details and try again.");
  }

  return data.user.id;
}

async function ensureApplicantProfile(
  admin: SupabaseClient,
  input: {
    userId: string;
    applicantName: string;
    email: string;
    phone?: string | null;
    username?: string | null;
  },
): Promise<void> {
  const existing = await findProfileById(admin, input.userId);
  if (existing) {
    if (existing.status === "disabled") {
      throw AppError.forbidden("Profile is unavailable");
    }
    return;
  }

  await insertUserProfile(admin, {
    id: input.userId,
    displayName: input.applicantName,
    email: input.email,
    phone: input.phone,
    username: input.username,
  });
}

/**
 * Public institute registration — creates Supabase Auth user + user_profile +
 * pending institute_registration. Never creates institute or privileged roles.
 */
export async function createRegistration(
  admin: SupabaseClient,
  input: CreateRegistrationInput,
): Promise<InstituteRegistrationDto> {
  if (!input.email.trim() || !input.email.includes("@")) {
    throw AppError.validation("A valid email is required", {
      email: ["Invalid email"],
    });
  }

  const email = normalizeEmail(input.email);
  const payload = normalizeRegistrationPayload(
    input.payload,
    email,
    input.applicantName.trim(),
  );

  validateRegistrationApplication({
    applicantName: input.applicantName,
    payload,
    requireApplicantName: true,
    requirePassword: true,
    password: input.password,
    requireFullApplication: true,
  });

  await assertInstituteCodeAvailable(admin, payload.instituteCode!);
  await assertUsernameAvailable(admin, payload.username!);

  const userId = await provisionAuthUser(admin, email, input.password);

  if (await isPlatformOperatorUser(admin, userId)) {
    throw AppError.forbidden("Platform operators cannot submit institute registrations");
  }

  const pending = await findPendingRegistrationByApplicantUserId(admin, userId);
  if (pending) {
    return toRegistrationDto(pending);
  }
  const existing = await findRegistrationByApplicantUserId(admin, userId);
  if (existing?.status === "approved") {
    throw AppError.conflict(
      "This account already has an approved institute registration. Sign in instead.",
    );
  }
  if (existing?.status === "rejected") {
    throw AppError.conflict(
      "This registration was returned for changes. Sign in to review and resubmit it.",
    );
  }

  await ensureApplicantProfile(admin, {
    userId,
    applicantName: input.applicantName,
    email,
    phone: input.phone ?? payload.principalMobile,
    username: payload.username,
  });

  // Username + PIN belong on the applicant profile (Admin login factors).
  await upsertUserAuthCredential(admin, {
    userId,
    username: payload.username,
    pin: input.pin?.trim() || null,
    markPhoneVerified: false,
    markEmailVerified: false,
  });

  const row = await insertRegistration(admin, {
    applicantUserId: userId,
    applicantName: input.applicantName,
    email,
    phone: input.phone ?? payload.principalMobile,
    payload,
  });

  return toRegistrationDto(row);
}

/**
 * Authenticated resubmit — rejected registration returns to pending review.
 * Reuses the same auth account; does not create a new Supabase user.
 */
export async function resubmitRegistrationForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: ResubmitRegistrationInput,
): Promise<InstituteRegistrationDto> {
  const row = await findRegistrationByApplicantUserId(admin, actor.userId);
  if (!row) {
    throw AppError.notFound("Registration not found");
  }
  if (row.status !== "rejected") {
    throw AppError.conflict("Only rejected registrations can be resubmitted");
  }

  const pending = await findPendingRegistrationByApplicantUserId(admin, actor.userId);
  if (pending) {
    throw AppError.conflict("A pending registration already exists for this account");
  }

  const payload = normalizeRegistrationPayload(
    input.payload,
    row.email,
    input.applicantName?.trim() || row.applicant_name,
  );

  validateRegistrationApplication({
    applicantName: input.applicantName,
    payload,
    requireApplicantName: false,
    requireFullApplication: true,
  });

  await assertInstituteCodeAvailable(admin, payload.instituteCode!);
  await assertUsernameAvailable(admin, payload.username!, actor.userId);

  if (payload.username) {
    await upsertUserAuthCredential(admin, {
      userId: actor.userId,
      username: payload.username,
    });
  }

  const updated = await updateRegistrationFields(admin, row.id, {
    applicant_name: input.applicantName?.trim() || row.applicant_name,
    phone:
      input.phone !== undefined
        ? input.phone?.trim() || null
        : row.phone,
    payload,
    status: "pending",
    rejection_reason: null,
    reviewed_by: null,
    reviewed_at: null,
    institute_id: null,
    ...registrationRowFieldsFromPayload(payload),
  });

  if (!updated) {
    throw AppError.notFound("Registration not found");
  }

  return toRegistrationDto(updated);
}

/** Authenticated applicant reads their most recent registration only. */
export async function getOwnRegistrationForActor(
  admin: SupabaseClient,
  actor: Actor,
): Promise<InstituteRegistrationDto> {
  const row = await findRegistrationByApplicantUserId(admin, actor.userId);
  if (!row) {
    throw AppError.notFound("Registration not found");
  }
  return toRegistrationDto(row);
}
