import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import { findProfileById } from "../identity/repository.js";
import {
  findPendingRegistrationByApplicantUserId,
  findRegistrationByApplicantUserId,
  insertRegistration,
  insertUserProfile,
  isPlatformOperatorUser,
  updateRegistrationFields,
} from "./repository.js";
import type {
  CreateRegistrationInput,
  InstituteRegistrationDto,
  InstituteRegistrationPayload,
  InstituteRegistrationRow,
  ResubmitRegistrationInput,
} from "./types.js";

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
    status: row.status,
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

function normalizePayload(
  input: InstituteRegistrationPayload,
  fallbackEmail: string,
  fallbackName: string,
): InstituteRegistrationPayload {
  const normalized: InstituteRegistrationPayload = {
    ...input,
    instituteName: input.instituteName.trim(),
    principalEmail:
      input.principalEmail?.trim().toLowerCase() || fallbackEmail,
    principalName: input.principalName?.trim() || fallbackName,
  };
  if (input.logoPreview !== undefined) {
    normalized.logoPreview = input.logoPreview.trim() || undefined;
  }
  return normalized;
}

function validatePayloadInstitute(input: {
  applicantName?: string;
  payload: InstituteRegistrationPayload;
  requireApplicantName?: boolean;
  requirePassword?: boolean;
  password?: string;
}): void {
  const instituteName = input.payload.instituteName?.trim();
  if (!instituteName) {
    throw AppError.validation("payload.instituteName is required", {
      "payload.instituteName": ["Required"],
    });
  }
  if (input.requireApplicantName && !input.applicantName?.trim()) {
    throw AppError.validation("applicant_name is required", {
      applicant_name: ["Required"],
    });
  }
  if (input.requirePassword) {
    if (!input.password || input.password.length < 8) {
      throw AppError.validation("password must be at least 8 characters", {
        password: ["Too short"],
      });
    }
  }
  const logo = input.payload.logoPreview;
  if (logo && logo.length > 200_000) {
    throw AppError.validation("payload.logoPreview is too large", {
      "payload.logoPreview": ["Too large"],
    });
  }
}

function validatePayload(input: CreateRegistrationInput): void {
  if (!input.email.trim() || !input.email.includes("@")) {
    throw AppError.validation("A valid email is required", {
      email: ["Invalid email"],
    });
  }
  validatePayloadInstitute({
    applicantName: input.applicantName,
    payload: input.payload,
    requireApplicantName: true,
    requirePassword: true,
    password: input.password,
  });
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
  validatePayload(input);

  const email = normalizeEmail(input.email);
  const payload = normalizePayload(
    input.payload,
    email,
    input.applicantName.trim(),
  );

  const userId = await provisionAuthUser(admin, email, input.password);

  if (await isPlatformOperatorUser(admin, userId)) {
    throw AppError.forbidden("Platform operators cannot submit institute registrations");
  }

  const pending = await findPendingRegistrationByApplicantUserId(admin, userId);
  if (pending) {
    throw AppError.conflict("A pending registration already exists for this account");
  }

  await ensureApplicantProfile(admin, {
    userId,
    applicantName: input.applicantName,
    email,
    phone: input.phone,
  });

  const row = await insertRegistration(admin, {
    applicantUserId: userId,
    applicantName: input.applicantName,
    email,
    phone: input.phone,
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
  validatePayloadInstitute({
    applicantName: input.applicantName,
    payload: input.payload,
    requireApplicantName: false,
  });

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

  const payload = normalizePayload(
    input.payload,
    row.email,
    input.applicantName?.trim() || row.applicant_name,
  );

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
