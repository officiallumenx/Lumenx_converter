import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import { assertPlatformRoles } from "../../authorization/index.js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import { findProfileById } from "../identity/repository.js";
import {
  insertInstitute,
  insertInstituteSettings,
  insertMembership,
  replaceMembershipRoles,
} from "../identity/repository.js";
import type { InstituteKind } from "../identity/types.js";
import { recordPlatformAuditForActor } from "../audit/service.js";
import { ensureDefaultAccessRoles } from "../access-roles/service.js";
import {
  findSubscriptionByInstituteId,
  insertSubscription,
} from "../nexus/repository.js";
import {
  findActiveMembershipForUserInstitute,
  findRegistrationById,
  insertUserProfile,
  listRegistrations,
  updateRegistrationFields,
} from "./repository.js";
import {
  INSTITUTE_PUBLIC_PROFILE_KEY,
  mergeInstituteSettingsJson,
  publicProfileFromRegistrationPayload,
} from "../identity/institute-public-profile.js";
import { toRegistrationDto } from "./service.js";
import type {
  InstituteRegistrationDto,
  InstituteRegistrationRow,
  InstituteRegistrationStatus,
} from "./types.js";

/** Platform roles permitted to review institute registration requests. */
export const NEXUS_REGISTRATION_REVIEW_ROLES = [
  "nexus_root",
  "operations",
] as const;

function assertRegistrationReviewer(actor: Actor): void {
  assertPlatformRoles(actor, [...NEXUS_REGISTRATION_REVIEW_ROLES]);
}

function operatorAuditLabel(actor: Actor): string {
  return actor.platformRoleCode?.trim() || actor.displayName?.trim() || actor.userId.slice(0, 8);
}

function assertNotSelfReview(
  actor: Actor,
  registration: InstituteRegistrationRow,
): void {
  if (registration.applicant_user_id === actor.userId) {
    throw AppError.forbidden("Applicants cannot review their own registration");
  }
}

function mapInstituteKind(instituteType?: string): InstituteKind {
  const normalized = (instituteType ?? "").trim().toLowerCase();
  if (normalized.includes("junior")) return "junior_college";
  if (normalized.includes("degree")) return "degree_college";
  if (normalized.includes("engineering")) return "engineering";
  if (normalized.includes("university")) return "university";
  return "school";
}

function deriveInstituteCode(name: string, registrationId: string): string {
  const base = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  const suffix = registrationId.replace(/-/g, "").slice(0, 8).toUpperCase();
  const code = `${base || "INST"}-${suffix}`;
  return code.slice(0, 50);
}

/** Match demo Nexus — 60-day trial at ₹12/student on approval. */
const DEFAULT_TRIAL_DAYS = 60;
const DEFAULT_GRACE_DAYS = 7;
const DEFAULT_PER_STUDENT_RATE_INR = 12;

function addUtcDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

async function ensureTrialSubscriptionOnApproval(
  admin: SupabaseClient,
  instituteId: string,
): Promise<void> {
  const existing = await findSubscriptionByInstituteId(admin, instituteId);
  if (existing) return;

  const trialStartAt = new Date().toISOString();
  const trialEndAt = addUtcDays(trialStartAt, DEFAULT_TRIAL_DAYS);
  const graceEndsAt = addUtcDays(trialEndAt, DEFAULT_GRACE_DAYS);

  await insertSubscription(admin, {
    instituteId,
    lifecycleStatus: "trial_active",
    assignedRateInr: DEFAULT_PER_STUDENT_RATE_INR,
    activeStudentCount: 0,
    trialStartAt,
    trialEndAt,
    graceEndsAt,
  });
}

async function ensureApplicantProfile(
  admin: SupabaseClient,
  registration: InstituteRegistrationRow,
): Promise<void> {
  const existing = await findProfileById(admin, registration.applicant_user_id);
  if (existing) {
    if (existing.status === "disabled") {
      throw AppError.forbidden("Applicant profile is unavailable");
    }
    return;
  }

  await insertUserProfile(admin, {
    id: registration.applicant_user_id,
    displayName: registration.applicant_name,
    email: registration.email,
    phone: registration.phone,
  });
}

async function ensureInstituteAdminMembership(
  admin: SupabaseClient,
  input: { userId: string; instituteId: string },
): Promise<void> {
  let membership = await findActiveMembershipForUserInstitute(
    admin,
    input.userId,
    input.instituteId,
  );

  if (!membership) {
    const row = await insertMembership(admin, {
      userId: input.userId,
      instituteId: input.instituteId,
      status: "active",
      roles: ["institute_admin"],
    });
    await replaceMembershipRoles(admin, row.id, ["institute_admin"]);
    return;
  }

  const rolesResult = await admin
    .from("membership_role")
    .select("role_code")
    .eq("membership_id", membership.id);

  const existingRoles = ensureDbOk(rolesResult) as Array<{ role_code: string }>;
  const roleCodes = new Set(existingRoles.map((r) => r.role_code));
  if (!roleCodes.has("institute_admin")) {
    roleCodes.add("institute_admin");
    await replaceMembershipRoles(admin, membership.id, [...roleCodes]);
  }
}

async function markRegistrationApproved(
  admin: SupabaseClient,
  input: {
    registrationId: string;
    instituteId: string;
    reviewerUserId: string;
  },
): Promise<InstituteRegistrationRow> {
  const reviewedAt = new Date().toISOString();
  const updated = await updateRegistrationFields(admin, input.registrationId, {
    status: "approved",
    institute_id: input.instituteId,
    reviewed_by: input.reviewerUserId,
    reviewed_at: reviewedAt,
    rejection_reason: null,
  });
  if (!updated) {
    throw AppError.notFound("Registration not found");
  }
  return updated;
}

export async function listRegistrationsForReviewer(
  admin: SupabaseClient,
  actor: Actor,
  filter?: { status?: InstituteRegistrationStatus },
): Promise<InstituteRegistrationDto[]> {
  assertRegistrationReviewer(actor);
  const rows = await listRegistrations(admin, filter);
  return rows.map(toRegistrationDto);
}

/**
 * Approve a pending registration — idempotent when already approved with institute linked.
 */
export async function approveRegistrationForReviewer(
  admin: SupabaseClient,
  actor: Actor,
  registrationId: string,
): Promise<InstituteRegistrationDto> {
  const registration = await findRegistrationById(admin, registrationId);
  if (!registration) {
    throw AppError.notFound("Registration not found");
  }

  assertNotSelfReview(actor, registration);
  assertRegistrationReviewer(actor);

  if (registration.status === "approved" && registration.institute_id) {
    await ensureTrialSubscriptionOnApproval(admin, registration.institute_id);
    return toRegistrationDto(registration);
  }

  if (registration.status === "rejected") {
    throw AppError.conflict("Registration was already rejected");
  }

  if (registration.status !== "pending") {
    throw AppError.conflict("Registration is not pending approval");
  }

  await ensureApplicantProfile(admin, registration);

  const instituteName = registration.payload.instituteName.trim();
  if (!instituteName) {
    throw AppError.validation("Registration payload is missing instituteName");
  }

  const institute = await insertInstitute(admin, {
    code: deriveInstituteCode(instituteName, registration.id),
    name: instituteName,
    kind: mapInstituteKind(registration.payload.instituteType),
    status: "active",
    timezone: "Asia/Kolkata",
    locale: "en-IN",
  });

  await insertInstituteSettings(admin, {
    instituteId: institute.id,
    timezone: "Asia/Kolkata",
    locale: "en-IN",
    settings: mergeInstituteSettingsJson({}, {
      [INSTITUTE_PUBLIC_PROFILE_KEY]: publicProfileFromRegistrationPayload(
        instituteName,
        registration.payload,
      ),
    }),
  });

  await ensureDefaultAccessRoles(admin, institute.id);

  await ensureInstituteAdminMembership(admin, {
    userId: registration.applicant_user_id,
    instituteId: institute.id,
  });

  await ensureTrialSubscriptionOnApproval(admin, institute.id);

  const approved = await markRegistrationApproved(admin, {
    registrationId: registration.id,
    instituteId: institute.id,
    reviewerUserId: actor.userId,
  });

  await recordPlatformAuditForActor(admin, actor, {
    action: "registration_approved",
    entityType: "institute",
    entityId: institute.id,
    metadata: {
      operator: operatorAuditLabel(actor),
      targetLabel: instituteName,
      instituteId: institute.id,
      registrationId: registration.id,
      before: "Pending",
      after: "Approved",
      summary: "Registration approved · institute onboarded",
    },
  });

  return toRegistrationDto(approved);
}

export async function rejectRegistrationForReviewer(
  admin: SupabaseClient,
  actor: Actor,
  registrationId: string,
  reason: string,
): Promise<InstituteRegistrationDto> {
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    throw AppError.validation("rejection reason is required", {
      reason: ["Required"],
    });
  }

  const registration = await findRegistrationById(admin, registrationId);
  if (!registration) {
    throw AppError.notFound("Registration not found");
  }

  assertNotSelfReview(actor, registration);
  assertRegistrationReviewer(actor);

  if (registration.status === "rejected") {
    return toRegistrationDto(registration);
  }

  if (registration.status === "approved") {
    throw AppError.conflict("Registration was already approved");
  }

  if (registration.status !== "pending") {
    throw AppError.conflict("Registration is not pending approval");
  }

  const reviewedAt = new Date().toISOString();
  const updated = await updateRegistrationFields(admin, registrationId, {
    status: "rejected",
    rejection_reason: trimmedReason,
    reviewed_by: actor.userId,
    reviewed_at: reviewedAt,
    institute_id: null,
  });

  if (!updated) {
    throw AppError.notFound("Registration not found");
  }

  const instituteName =
    registration.payload.instituteName?.trim() || "Registration application";

  await recordPlatformAuditForActor(admin, actor, {
    action: "registration_rejected",
    entityType: "registration",
    entityId: registration.id,
    metadata: {
      operator: operatorAuditLabel(actor),
      targetLabel: instituteName,
      registrationId: registration.id,
      before: "Pending",
      after: "Rejected",
      summary: trimmedReason,
    },
  });

  return toRegistrationDto(updated);
}
