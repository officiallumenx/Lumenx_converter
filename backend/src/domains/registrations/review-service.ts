import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import { assertPlatformRoles } from "../../authorization/index.js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import { findProfileById } from "../identity/repository.js";
import {
  findInstituteByCode,
  findInstituteSettings,
  insertInstitute,
  insertInstituteSettings,
  updateInstituteSettingsFields,
} from "../identity/repository.js";
import type { InstituteKind } from "../identity/types.js";
import { recordPlatformAuditForActor } from "../audit/service.js";
import { ensureDefaultAccessRoles } from "../access-roles/service.js";
import {
  findSubscriptionByInstituteId,
  insertSubscription,
} from "../nexus/repository.js";
import {
  beginRegistrationApproval,
  findActiveMembershipForUserInstitute,
  findRegistrationById,
  finishRegistrationApproval,
  insertUserProfile,
  listRegistrations,
  updateRegistrationFieldsIfStatus,
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
  if (
    registration.applicant_user_id === actor.userId &&
    actor.platformRoleCode !== "nexus_root"
  ) {
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
    // Partial unique index (user_id, institute_id) WHERE deleted_at IS NULL cannot be
    // targeted by PostgREST onConflict upsert — insert + conflict recovery instead.
    const existingAny = await admin
      .from("membership")
      .select("id, user_id, institute_id, status, deleted_at")
      .eq("user_id", input.userId)
      .eq("institute_id", input.instituteId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingAny.error) ensureDbOk(existingAny);

    const row = existingAny.data as {
      id: string;
      user_id: string;
      institute_id: string;
      status: string;
      deleted_at: string | null;
    } | null;

    if (row?.deleted_at) {
      const revived = await admin
        .from("membership")
        .update({ deleted_at: null, status: "active" })
        .eq("id", row.id)
        .select("id, user_id, institute_id, status")
        .single();
      membership = ensureDbOk(revived) as {
        id: string;
        user_id: string;
        institute_id: string;
        status: string;
      };
    } else if (row) {
      membership = {
        id: row.id,
        user_id: row.user_id,
        institute_id: row.institute_id,
        status: row.status,
      };
    } else {
      const inserted = await admin
        .from("membership")
        .insert({
          user_id: input.userId,
          institute_id: input.instituteId,
          status: "active",
          deleted_at: null,
        })
        .select("id, user_id, institute_id, status")
        .single();
      if (inserted.error?.code === "23505") {
        membership = await findActiveMembershipForUserInstitute(
          admin,
          input.userId,
          input.instituteId,
        );
        if (!membership) ensureDbOk(inserted);
      } else {
        membership = ensureDbOk(inserted) as {
          id: string;
          user_id: string;
          institute_id: string;
          status: string;
        };
      }
    }
  }

  if (!membership) {
    throw AppError.internal("Unable to create institute admin membership");
  }

  const roleResult = await admin
    .from("membership_role")
    .upsert(
      {
        membership_id: membership.id,
        role_code: "institute_admin",
      },
      { onConflict: "membership_id,role_code" },
    );
  ensureDbOk(roleResult);
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
    // Approval may have been interrupted after the registration state changed,
    // or imported from an older workflow. Re-running approval must repair the
    // owner's identity and institute-wide access, not merely return success.
    await ensureApplicantProfile(admin, registration);
    await ensureDefaultAccessRoles(admin, registration.institute_id);
    await ensureInstituteAdminMembership(admin, {
      userId: registration.applicant_user_id,
      instituteId: registration.institute_id,
    });
    await ensureTrialSubscriptionOnApproval(admin, registration.institute_id);
    return toRegistrationDto(registration);
  }

  if (registration.status === "rejected") {
    throw AppError.conflict("Registration was already rejected");
  }

  if (registration.status !== "pending" && registration.status !== "approving") {
    throw AppError.conflict("Registration is not pending approval");
  }

  const claimed = await beginRegistrationApproval(admin, registration.id, actor.userId);
  if (!claimed) throw AppError.conflict("Registration is no longer pending approval");
  if (claimed.status === "rejected") {
    throw AppError.conflict("Registration was already rejected");
  }
  if (claimed.status === "approved" && claimed.institute_id) {
    await ensureTrialSubscriptionOnApproval(admin, claimed.institute_id);
    return toRegistrationDto(claimed);
  }

  await ensureApplicantProfile(admin, claimed);

  const instituteName = claimed.payload.instituteName.trim();
  if (!instituteName) {
    throw AppError.validation("Registration payload is missing instituteName");
  }

  const publicProfile = publicProfileFromRegistrationPayload(
    instituteName,
    claimed.payload,
  );
  const instituteCode = deriveInstituteCode(instituteName, claimed.id);
  const institute =
    (await findInstituteByCode(admin, instituteCode)) ??
    (await insertInstitute(admin, {
      code: instituteCode,
      name: instituteName,
      kind: mapInstituteKind(claimed.payload.instituteType),
      status: "active",
      timezone: "Asia/Kolkata",
      locale: "en-IN",
    }));

  const existingSettings = await findInstituteSettings(admin, institute.id);
  if (!existingSettings) {
    await insertInstituteSettings(admin, {
      instituteId: institute.id,
      timezone: "Asia/Kolkata",
      locale: "en-IN",
      settings: mergeInstituteSettingsJson({}, {
        [INSTITUTE_PUBLIC_PROFILE_KEY]: publicProfile,
      }),
    });
  } else if (!existingSettings.settings[INSTITUTE_PUBLIC_PROFILE_KEY]) {
    await updateInstituteSettingsFields(admin, institute.id, {
      settings: mergeInstituteSettingsJson(existingSettings.settings, {
        [INSTITUTE_PUBLIC_PROFILE_KEY]: publicProfile,
      }),
    });
  }

  await ensureDefaultAccessRoles(admin, institute.id);

  await ensureInstituteAdminMembership(admin, {
    userId: claimed.applicant_user_id,
    instituteId: institute.id,
  });

  await ensureTrialSubscriptionOnApproval(admin, institute.id);

  const approved = await finishRegistrationApproval(
    admin,
    claimed.id,
    institute.id,
    actor.userId,
  );
  if (!approved) throw AppError.conflict("Registration approval state changed");

  await recordPlatformAuditForActor(admin, actor, {
    action: "registration_approved",
    entityType: "institute",
    entityId: institute.id,
    metadata: {
      operator: operatorAuditLabel(actor),
      targetLabel: instituteName,
      instituteId: institute.id,
      registrationId: claimed.id,
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
  const updated = await updateRegistrationFieldsIfStatus(admin, registrationId, "pending", {
    status: "rejected",
    rejection_reason: trimmedReason,
    reviewed_by: actor.userId,
    reviewed_at: reviewedAt,
    institute_id: null,
  });

  if (!updated) throw AppError.conflict("Registration review state changed");

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
