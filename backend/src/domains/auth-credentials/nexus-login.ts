/**
 * Nexus platform operator login:
 *   identifier (mobile|email|username) → mobile OTP → password → PIN → home
 * Recovery:
 *   forgot password → mobile OTP → set password → PIN
 *   forgot PIN → mobile OTP → set PIN → enter PIN → home
 * Email OTP is not required (SMS OTP only).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import { deliverLoginOtp } from "../otp-delivery/index.js";
import {
  assertPinMatches,
  assertValidPin,
  assertValidUsername,
  findCredentialByUserId,
  upsertUserAuthCredential,
  workflowFlagsFromCredential,
} from "./repository.js";
import {
  maskWorkflowDestination,
  storeWorkflowOtp,
  verifyWorkflowOtp,
} from "./workflow-otp.js";
import {
  consumeAuthVerificationGrant,
  issueAuthVerificationGrant,
} from "./verification-grant.js";
import { createServerAuthSessionForEmail, verifyPasswordWithoutPoisoning } from "../../auth/create-server-session.js";
import { loadEnv } from "../../config/env.js";

type OperatorProfile = {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  status: string;
};

type PlatformOperatorRow = {
  user_id: string;
  handle: string | null;
  display_name: string;
  status: string;
  role_code: string;
};

function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, "").slice(-10);
}

async function createAuthSessionForEmail(
  admin: SupabaseClient,
  email: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  return createServerAuthSessionForEmail(admin, email, "Nexus session");
}

/**
 * Dev/open-access: issue a Nexus operator session without OTP/password/PIN.
 * Gated by NEXUS_OPEN_ACCESS and blocked in production.
 */
export async function openNexusOpenAccessSession(admin: SupabaseClient) {
  const env = loadEnv();
  if (env.NODE_ENV === "production" || !env.NEXUS_OPEN_ACCESS) {
    throw AppError.forbidden("Nexus open access is disabled.");
  }
  const email =
    env.NEXUS_BOOTSTRAP_EMAIL?.trim().toLowerCase() ||
    "nexus.root@lumenx.local";
  const { profile, operator } = await resolveOperatorByIdentifier(admin, email);
  const session = await createAuthSessionForEmail(admin, email);
  return {
    ...session,
    displayName: operator.display_name || profile.display_name,
    firstLoginCompleted: true,
    isRoot: operator.role_code === "nexus_root",
  };
}

async function loadActiveOperator(
  admin: SupabaseClient,
  userId: string,
): Promise<PlatformOperatorRow | null> {
  const { data, error } = await admin
    .from("platform_operator")
    .select("user_id, handle, display_name, status, role_code")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  const row = data as PlatformOperatorRow | null;
  if (!row || (row.status !== "active" && row.status !== "invited")) {
    return null;
  }
  return row;
}

async function findProfilesMatchingPhone(
  admin: SupabaseClient,
  phone: string,
): Promise<OperatorProfile[]> {
  const selectProfile =
    "id, display_name, email, phone, status" as const;
  const byId = new Map<string, OperatorProfile>();

  const { data: byDigits, error: digitsError } = await admin
    .from("user_profile")
    .select(selectProfile)
    .eq("phone_digits", phone)
    .is("deleted_at", null);
  if (digitsError) throw digitsError;
  for (const row of (byDigits ?? []) as OperatorProfile[]) {
    if (row.status !== "disabled") byId.set(row.id, row);
  }

  // Also match phone column (root may still have phone after phone_digits was cleared).
  const { data: byPhone, error: phoneError } = await admin
    .from("user_profile")
    .select(selectProfile)
    .is("deleted_at", null)
    .or(`phone.eq.${phone},phone.eq.+91${phone},phone.ilike.%${phone}%`);
  if (phoneError) throw phoneError;
  for (const row of (byPhone ?? []) as OperatorProfile[]) {
    if (
      row.status !== "disabled" &&
      normalizePhoneDigits(row.phone ?? "") === phone
    ) {
      byId.set(row.id, row);
    }
  }

  return [...byId.values()];
}

/**
 * Prefer Nexus root/operator profiles over Admin (or other) profiles that
 * happen to hold the same contact after a phone rehome.
 */
async function pickOperatorFromPhoneProfiles(
  admin: SupabaseClient,
  profiles: OperatorProfile[],
): Promise<{ profile: OperatorProfile; operator: PlatformOperatorRow } | null> {
  // Prefer nexus_root when multiple Nexus accounts somehow match.
  const scored: Array<{
    profile: OperatorProfile;
    operator: PlatformOperatorRow;
    rank: number;
  }> = [];
  for (const profile of profiles) {
    const operator = await loadActiveOperator(admin, profile.id);
    if (!operator) continue;
    const rank = operator.role_code === "nexus_root" ? 0 : 1;
    scored.push({ profile, operator, rank });
  }
  if (scored.length === 0) return null;
  scored.sort((a, b) => a.rank - b.rank);
  return { profile: scored[0]!.profile, operator: scored[0]!.operator };
}

/**
 * Phone may sit on an Admin profile after a prior rehome while platform_operator
 * (including nexus_root) points at another profile with the same email.
 */
async function recoverOperatorBySharedEmail(
  admin: SupabaseClient,
  phoneHoldingProfile: OperatorProfile,
): Promise<{ profile: OperatorProfile; operator: PlatformOperatorRow } | null> {
  const email = phoneHoldingProfile.email?.trim().toLowerCase();
  if (!email) return null;

  const { data, error } = await admin
    .from("platform_operator")
    .select("user_id, handle, display_name, status, role_code")
    .in("status", ["active", "invited"]);
  if (error) throw error;
  const operators = (data ?? []) as PlatformOperatorRow[];

  const matches: Array<{
    profile: OperatorProfile;
    operator: PlatformOperatorRow;
    rank: number;
  }> = [];
  for (const operator of operators) {
    if (operator.user_id === phoneHoldingProfile.id) continue;
    const candidate = await loadProfile(admin, operator.user_id);
    if (candidate.email?.trim().toLowerCase() === email) {
      matches.push({
        profile: candidate,
        operator,
        rank: operator.role_code === "nexus_root" ? 0 : 1,
      });
    }
  }
  if (matches.length === 0) return null;
  matches.sort((a, b) => a.rank - b.rank);
  return { profile: matches[0]!.profile, operator: matches[0]!.operator };
}

async function loadProfile(
  admin: SupabaseClient,
  userId: string,
): Promise<OperatorProfile> {
  const { data, error } = await admin
    .from("user_profile")
    .select("id, display_name, email, phone, status")
    .eq("id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  const profile = data as OperatorProfile | null;
  if (!profile || profile.status === "disabled") {
    throw AppError.notFound("Nexus profile not found.");
  }
  return profile;
}

async function resolveOperatorByIdentifier(
  admin: SupabaseClient,
  identifier: string,
): Promise<{ profile: OperatorProfile; operator: PlatformOperatorRow }> {
  const trimmed = identifier.trim();
  if (!trimmed) {
    throw AppError.notFound("No Nexus account found for this identifier.");
  }

  let profile: OperatorProfile | null = null;

  const selectProfile =
    "id, display_name, email, phone, status" as const;

  // 1) Email — prefer a profile that is an active Nexus root/operator
  if (trimmed.includes("@")) {
    const { data, error } = await admin
      .from("user_profile")
      .select(selectProfile)
      .ilike("email", trimmed.toLowerCase())
      .is("deleted_at", null);
    if (error) throw error;
    const emailProfiles = ((data ?? []) as OperatorProfile[]).filter(
      (row) => row.status !== "disabled",
    );
    const viaEmail = await pickOperatorFromPhoneProfiles(admin, emailProfiles);
    if (viaEmail) return viaEmail;
    profile = emailProfiles[0] ?? null;
  }

  // 2) Phone — collect all matches; prefer Nexus root/operator over Admin holder
  if (!profile) {
    const phone = normalizePhoneDigits(trimmed);
    if (/^\d{10}$/.test(phone)) {
      const phoneProfiles = await findProfilesMatchingPhone(admin, phone);
      const viaPhone = await pickOperatorFromPhoneProfiles(admin, phoneProfiles);
      if (viaPhone) return viaPhone;
      profile = phoneProfiles[0] ?? null;
    }
  }

  // 3) Username
  if (!profile) {
    const { data, error } = await admin
      .from("user_profile")
      .select(selectProfile)
      .ilike("username", trimmed.toLowerCase())
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    profile = (data as OperatorProfile | null) ?? null;
  }

  // 4) Operator / root handle
  if (!profile) {
    const { data: op, error } = await admin
      .from("platform_operator")
      .select("user_id, handle, display_name, status, role_code")
      .ilike("handle", trimmed.toLowerCase())
      .maybeSingle();
    if (error) throw error;
    const operator = op as PlatformOperatorRow | null;
    if (
      operator &&
      (operator.status === "active" || operator.status === "invited")
    ) {
      profile = await loadProfile(admin, operator.user_id);
      return { profile, operator };
    }
  }

  if (!profile) {
    throw AppError.notFound("No Nexus account found for this identifier.");
  }

  const direct = await loadActiveOperator(admin, profile.id);
  if (direct) {
    return { profile, operator: direct };
  }

  const recovered = await recoverOperatorBySharedEmail(admin, profile);
  if (recovered) {
    return recovered;
  }

  throw AppError.forbidden(
    "No active Nexus root/operator account for this user. If this mobile was moved to Admin, sign in with the Nexus account email/handle, or restore phone on the Nexus root profile.",
  );
}

function mobileOtpDestination(
  identifier: string,
  profile: OperatorProfile,
): string {
  const fromProfile = profile.phone?.trim() ?? "";
  if (fromProfile) return fromProfile;
  const digits = normalizePhoneDigits(identifier);
  return /^\d{10}$/.test(digits) ? digits : "";
}

function nexusWorkflowFlags(
  cred: Awaited<ReturnType<typeof findCredentialByUserId>>,
) {
  return workflowFlagsFromCredential(cred, {
    dualOtpAlways: false,
    pinAlways: true,
  });
}

export async function resolveNexusLoginMode(
  admin: SupabaseClient,
  identifier: string,
) {
  const { profile, operator } = await resolveOperatorByIdentifier(admin, identifier);
  const cred = await findCredentialByUserId(admin, profile.id);
  const flags = nexusWorkflowFlags(cred);
  return {
    displayName: operator.display_name || profile.display_name,
    handle: operator.handle,
    roleCode: operator.role_code,
    isRoot: operator.role_code === "nexus_root",
    ...flags,
  };
}

async function requestChannelOtp(
  admin: SupabaseClient,
  input: {
    identifier: string;
    channel: "email" | "mobile";
    purpose: "nexus_login" | "password_reset" | "pin_reset";
  },
) {
  const { profile, operator } = await resolveOperatorByIdentifier(
    admin,
    input.identifier,
  );
  const destination =
    input.channel === "email"
      ? profile.email?.trim().toLowerCase()
      : mobileOtpDestination(input.identifier, profile);
  if (!destination) {
    throw AppError.validation(
      input.channel === "email"
        ? "Operator email is missing."
        : "Operator mobile number is missing.",
    );
  }

  const stored = await storeWorkflowOtp(admin, {
    purpose: input.purpose,
    challengeKey: `nexus:${input.purpose}:${input.channel}:${profile.id}`,
    instituteId: null,
    channel: input.channel,
    destination,
    subjectId: profile.id,
  });

  if (stored.shouldDeliver) {
    await deliverLoginOtp({
      channel: input.channel === "email" ? "email" : "sms",
      destination,
      otp: stored.otp,
      purpose: input.purpose,
    });
  }

  return {
    maskedDestination: stored.maskedDestination,
    channel: input.channel,
    displayName: operator.display_name || profile.display_name,
    devOtp: stored.devOtp,
  };
}

async function verifyChannelOtp(
  admin: SupabaseClient,
  input: {
    identifier: string;
    channel: "email" | "mobile";
    otp: string;
    purpose: "nexus_login" | "password_reset" | "pin_reset";
  },
) {
  const { profile } = await resolveOperatorByIdentifier(admin, input.identifier);
  const verified = await verifyWorkflowOtp(admin, {
    purpose: input.purpose,
    challengeKey: `nexus:${input.purpose}:${input.channel}:${profile.id}`,
    otp: input.otp,
  });
  if (!verified || verified.subjectId !== profile.id) {
    throw AppError.validation("Incorrect or expired code. Try again or request a new OTP.");
  }
  const issued = await issueAuthVerificationGrant(admin, {
    purpose: input.purpose,
    subjectId: profile.id,
    destination: verified.destination,
    metadata: { channel: input.channel },
    ttlMs: 10 * 60 * 1000,
  });
  return { ok: true as const, channel: input.channel, ...issued };
}

export async function requestNexusLoginOtp(
  admin: SupabaseClient,
  input: {
    identifier: string;
    channel: "email" | "mobile";
  },
) {
  return requestChannelOtp(admin, { ...input, purpose: "nexus_login" });
}

export async function verifyNexusChannelOtp(
  admin: SupabaseClient,
  input: { identifier: string; channel: "email" | "mobile"; otp: string },
) {
  return verifyChannelOtp(admin, { ...input, purpose: "nexus_login" });
}

export type CompleteNexusLoginInput = {
  identifier: string;
  pin: string;
  password: string;
  mobileOtpGrant: string;
  /** @deprecated Email OTP skipped — accepted if present for older clients. */
  emailOtpGrant?: string;
};

export async function completeNexusLogin(
  admin: SupabaseClient,
  input: CompleteNexusLoginInput,
) {
  const { profile, operator } = await resolveOperatorByIdentifier(
    admin,
    input.identifier,
  );
  const cred = await findCredentialByUserId(admin, profile.id);

  if (!input.mobileOtpGrant) {
    throw AppError.validation("Verify mobile OTP before completing login.");
  }

  const profileEmail = profile.email?.trim().toLowerCase();
  const { data: authUser } = await admin.auth.admin.getUserById(profile.id);
  const authEmail =
    authUser.user?.email?.trim().toLowerCase() || profileEmail || null;
  if (!authEmail) {
    throw AppError.validation("Operator account is missing an email.");
  }

  const ok = await verifyPasswordWithoutPoisoning(admin, authEmail, input.password);
  if (!ok) {
    throw AppError.validation("Incorrect password.", { password: ["Invalid"] });
  }

  await consumeAuthVerificationGrant(admin, {
    purpose: "nexus_login",
    grant: input.mobileOtpGrant,
    subjectId: profile.id,
    metadata: { channel: "mobile" },
  });
  if (input.emailOtpGrant) {
    await consumeAuthVerificationGrant(admin, {
      purpose: "nexus_login",
      grant: input.emailOtpGrant,
      subjectId: profile.id,
      metadata: { channel: "email" },
    });
  }

  if (cred?.pin_hash) {
    assertPinMatches(cred, input.pin, { required: true });
  } else {
    assertValidPin(input.pin);
    await upsertUserAuthCredential(admin, {
      userId: profile.id,
      username: cred?.username || operator.handle || authEmail.split("@")[0],
      pin: input.pin,
      markFirstLoginCompleted: true,
      markPhoneVerified: true,
      markEmailVerified: true,
    });
  }

  if (!cred?.first_login_completed_at) {
    await upsertUserAuthCredential(admin, {
      userId: profile.id,
      markFirstLoginCompleted: true,
      markPhoneVerified: true,
      markEmailVerified: true,
    });
  }

  // Activate invited operators on successful login.
  if (operator.status === "invited") {
    const activated = await admin
      .from("platform_operator")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("user_id", profile.id);
    if (activated.error) throw activated.error;
  }

  const session = await createAuthSessionForEmail(admin, authEmail);
  return {
    ...session,
    displayName: operator.display_name || profile.display_name,
    firstLoginCompleted: true,
    isRoot: operator.role_code === "nexus_root",
  };
}

export async function requestNexusPasswordResetOtp(
  admin: SupabaseClient,
  input: { identifier: string; channel: "email" | "mobile" },
) {
  return requestChannelOtp(admin, { ...input, purpose: "password_reset" });
}

export async function verifyNexusPasswordResetOtp(
  admin: SupabaseClient,
  input: { identifier: string; channel: "email" | "mobile"; otp: string },
) {
  return verifyChannelOtp(admin, { ...input, purpose: "password_reset" });
}

export async function completeNexusPasswordReset(
  admin: SupabaseClient,
  input: {
    identifier: string;
    mobileOtpGrant: string;
    /** @deprecated Email OTP skipped — accepted if present for older clients. */
    emailOtpGrant?: string;
    newPassword: string;
  },
) {
  if (!input.newPassword || input.newPassword.length < 8) {
    throw AppError.validation("Password must be at least 8 characters.", {
      new_password: ["Too short"],
    });
  }
  if (!input.mobileOtpGrant) {
    throw AppError.validation("Verify mobile OTP before resetting password.");
  }
  const { profile } = await resolveOperatorByIdentifier(admin, input.identifier);
  await consumeAuthVerificationGrant(admin, {
    purpose: "password_reset",
    grant: input.mobileOtpGrant,
    subjectId: profile.id,
    metadata: { channel: "mobile" },
  });
  if (input.emailOtpGrant) {
    await consumeAuthVerificationGrant(admin, {
      purpose: "password_reset",
      grant: input.emailOtpGrant,
      subjectId: profile.id,
      metadata: { channel: "email" },
    });
  }
  const { error } = await admin.auth.admin.updateUserById(profile.id, {
    password: input.newPassword,
  });
  if (error) throw AppError.internal("Unable to update password.");
  return { ok: true as const };
}

export async function requestNexusPinResetOtp(
  admin: SupabaseClient,
  input: { identifier: string; channel: "email" | "mobile" },
) {
  return requestChannelOtp(admin, { ...input, purpose: "pin_reset" });
}

export async function verifyNexusPinResetOtp(
  admin: SupabaseClient,
  input: { identifier: string; channel: "email" | "mobile"; otp: string },
) {
  return verifyChannelOtp(admin, { ...input, purpose: "pin_reset" });
}

export async function completeNexusPinReset(
  admin: SupabaseClient,
  input: {
    identifier: string;
    mobileOtpGrant: string;
    /** @deprecated Email OTP skipped — accepted if present for older clients. */
    emailOtpGrant?: string;
    newPin: string;
  },
) {
  const pin = assertValidPin(input.newPin);
  if (!input.mobileOtpGrant) {
    throw AppError.validation("Verify mobile OTP before resetting PIN.");
  }
  const { profile, operator } = await resolveOperatorByIdentifier(
    admin,
    input.identifier,
  );
  await consumeAuthVerificationGrant(admin, {
    purpose: "pin_reset",
    grant: input.mobileOtpGrant,
    subjectId: profile.id,
    metadata: { channel: "mobile" },
  });
  if (input.emailOtpGrant) {
    await consumeAuthVerificationGrant(admin, {
      purpose: "pin_reset",
      grant: input.emailOtpGrant,
      subjectId: profile.id,
      metadata: { channel: "email" },
    });
  }
  const cred = await findCredentialByUserId(admin, profile.id);
  await upsertUserAuthCredential(admin, {
    userId: profile.id,
    username:
      cred?.username ||
      operator.handle ||
      profile.email?.split("@")[0] ||
      assertValidUsername("operator"),
    pin,
    markFirstLoginCompleted: true,
  });
  return { ok: true as const };
}
