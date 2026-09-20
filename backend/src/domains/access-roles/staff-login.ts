/**
 * Admin staff / root login (exact notebook workflows):
 *   First login: identifier → mobile OTP → email OTP → password → PIN → modules
 *   Returning:   identifier → password → PIN → modules
 * Recovery:
 *   forgot password → mobile+email OTPs → set password → PIN
 *   forgot PIN → mobile+email OTPs → set PIN → dashboard
 * Mobile OTP grant alone may skip email OTP (server StartMessaging path).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import {
  findInstituteById,
  listActiveInstitutesForLogin,
  listMemberships,
  listRolesForMemberships,
} from "../identity/repository.js";
import { findAccessAssignmentForUserInstitute } from "./repository.js";
import {
  maskStaffIdentifier,
  verifyStoredStaffLoginOtp,
} from "./staff-otp.js";
import { deliverLoginOtp } from "../otp-delivery/index.js";
import {
  assertPinMatches,
  assertValidPin,
  assertValidUsername,
  findCredentialByUserId,
  findCredentialByUsername,
  upsertUserAuthCredential,
  workflowFlagsFromCredential,
} from "../auth-credentials/repository.js";
import {
  maskWorkflowDestination,
  storeWorkflowOtp,
  verifyWorkflowOtp,
} from "../auth-credentials/workflow-otp.js";
import {
  consumeAuthVerificationGrant,
  issueAuthVerificationGrant,
} from "../auth-credentials/verification-grant.js";
import { createServerAuthSessionForEmail, verifyPasswordWithoutPoisoning } from "../../auth/create-server-session.js";
import { loadEnv } from "../../config/env.js";

const INSTITUTE_WIDE_ROLES = new Set([
  "institute_admin",
  "principal",
  "vice_principal",
  "it_admin",
]);

export type StaffLoginInstituteDto = {
  id: string;
  name: string;
  code: string;
  kind: string;
};

export async function listInstitutesForStaffLogin(
  admin: SupabaseClient,
): Promise<StaffLoginInstituteDto[]> {
  const rows = await listActiveInstitutesForLogin(admin);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    kind: row.kind,
  }));
}

export type ResolveStaffLoginModeInput = {
  instituteId: string;
  identifier: string;
};

export type StaffLoginModeResult = {
  requiresOtp: boolean;
  requiresDualOtp: boolean;
  requiresPin: boolean;
  firstLogin: boolean;
  hasUsername: boolean;
  hasPin: boolean;
  isAssigned: boolean;
  isInstituteRoot: boolean;
  displayName: string;
};

export async function resolveStaffLoginMode(
  admin: SupabaseClient,
  input: ResolveStaffLoginModeInput,
): Promise<StaffLoginModeResult> {
  const resolved = await resolveStaffLoginUser(
    admin,
    input.instituteId.trim(),
    input.identifier,
    { allowInstituteWide: true },
  );
  const cred = await findCredentialByUserId(admin, resolved.userId);
  // Assignees need first-login OTP; institute-wide admin uses password + PIN only.
  const flags = workflowFlagsFromCredential(cred, {
    dualOtpOnFirstLogin: true,
    pinAlways: true,
  });
  const requiresOtp = resolved.isAssigned && flags.firstLogin;
  return {
    requiresOtp,
    requiresDualOtp: requiresOtp,
    requiresPin: true,
    firstLogin: flags.firstLogin,
    hasUsername: flags.hasUsername,
    hasPin: flags.hasPin,
    isAssigned: resolved.isAssigned,
    isInstituteRoot: resolved.isInstituteRoot,
    displayName: resolved.displayName,
  };
}

function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, "").slice(-10);
}

export type RequestStaffOtpInput = {
  instituteId: string;
  identifier: string;
  channel?: "email" | "mobile";
};

export type RequestStaffOtpResult = {
  maskedDestination: string;
  channel: "email" | "mobile";
  displayName: string;
  devOtp?: string;
};

type StaffProfile = {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  phone_digits?: string | null;
};

/**
 * When mobile login hits an orphan profile (no institute membership) but the
 * institute has exactly one institute-wide Admin with no other mobile, move
 * the number onto that Admin so email/mobile resolve to the same account.
 */
async function tryRehomeOrphanPhoneToSoleInstituteAdmin(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    orphanProfile: StaffProfile;
    phoneDigits: string;
  },
): Promise<StaffProfile | null> {
  const instituteMemberships = await listMemberships(admin, {
    instituteId: input.instituteId,
  });
  const active = instituteMemberships.filter((m) => m.status !== "ended");
  if (active.length === 0) return null;

  const candidates: StaffProfile[] = [];
  for (const membership of active) {
    const roleRows = await listRolesForMemberships(admin, [membership.id]);
    const codes = roleRows.map((r) => r.role_code);
    if (!codes.some((c) => INSTITUTE_WIDE_ROLES.has(c))) continue;

    const { data, error } = await admin
      .from("user_profile")
      .select("id, display_name, email, phone, phone_digits, status")
      .eq("id", membership.user_id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    const row = data as StaffProfile | null;
    if (!row || row.status === "disabled") continue;
    if (row.id === input.orphanProfile.id) continue;

    const existingDigits =
      (row.phone_digits && /^\d{10}$/.test(row.phone_digits)
        ? row.phone_digits
        : null) ??
      (row.phone ? normalizePhoneDigits(row.phone) : "");
    if (existingDigits && existingDigits !== input.phoneDigits) continue;

    candidates.push(row);
  }

  if (candidates.length !== 1) return null;
  const target = candidates[0]!;

  const { error: clearOrphanError } = await admin
    .from("user_profile")
    .update({ phone: null, phone_digits: null })
    .eq("id", input.orphanProfile.id);
  if (clearOrphanError) throw clearOrphanError;

  const { data: otherHolders, error: holdersError } = await admin
    .from("user_profile")
    .select("id")
    .eq("phone_digits", input.phoneDigits)
    .neq("id", target.id)
    .is("deleted_at", null);
  if (holdersError) throw holdersError;
  if (otherHolders && otherHolders.length > 0) {
    const { error: clearOthersError } = await admin
      .from("user_profile")
      .update({ phone: null, phone_digits: null })
      .in(
        "id",
        otherHolders.map((row) => row.id as string),
      );
    if (clearOthersError) throw clearOthersError;
  }

  const { error: setError } = await admin
    .from("user_profile")
    .update({
      phone: input.phoneDigits,
      phone_digits: input.phoneDigits,
    })
    .eq("id", target.id);
  if (setError) throw setError;

  return {
    ...target,
    phone: input.phoneDigits,
    phone_digits: input.phoneDigits,
  };
}

async function resolveStaffLoginUser(
  admin: SupabaseClient,
  instituteId: string,
  identifier: string,
  opts?: { allowInstituteWide?: boolean },
): Promise<{
  userId: string;
  displayName: string;
  authEmail: string;
  channel: "email" | "mobile";
  destination: string;
  isAssigned: boolean;
  isInstituteRoot: boolean;
  requiresOtp: boolean;
  phone: string | null;
  email: string | null;
}> {
  const institute = await findInstituteById(admin, instituteId);
  if (!institute || institute.status !== "active") {
    throw AppError.notFound(
      "This institute is not available for login. Contact support.",
    );
  }

  const trimmed = identifier.trim();
  const isEmail = trimmed.includes("@");
  const phoneDigits = normalizePhoneDigits(trimmed);
  const looksLikePhone = !isEmail && phoneDigits.length === 10 && /^\d+$/.test(trimmed.replace(/\D/g, ""));

  let profile: StaffProfile | null = null;
  let channel: "email" | "mobile" = isEmail ? "email" : "mobile";

  if (isEmail) {
    const email = trimmed.toLowerCase();
    const { data, error } = await admin
      .from("user_profile")
      .select("id, display_name, email, phone, status")
      .ilike("email", email)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    profile = (data as StaffProfile | null) ?? null;
  } else if (looksLikePhone) {
    const { data, error } = await admin
      .from("user_profile")
      .select("id, display_name, email, phone, status")
      .eq("phone_digits", phoneDigits)
      .is("deleted_at", null);
    if (error) throw error;
    let candidates = (data ?? []) as StaffProfile[];

    // Canonical-phone backfill deliberately leaves legacy collisions NULL so
    // the unique index can be enabled safely. Also recover when phone_digits is
    // missing/out of sync but `phone` still holds +91 / spaced forms.
    if (candidates.length === 0) {
      const nullDigits = await admin
        .from("user_profile")
        .select("id, display_name, email, phone, status")
        .is("phone_digits", null)
        .is("deleted_at", null);
      if (nullDigits.error) throw nullDigits.error;
      candidates = ((nullDigits.data ?? []) as StaffProfile[]).filter(
        (candidate) =>
          candidate.phone != null &&
          normalizePhoneDigits(candidate.phone) === phoneDigits,
      );
    }
    if (candidates.length === 0) {
      const byPhone = await admin
        .from("user_profile")
        .select("id, display_name, email, phone, status")
        .is("deleted_at", null)
        .not("phone", "is", null);
      if (byPhone.error) throw byPhone.error;
      candidates = ((byPhone.data ?? []) as StaffProfile[]).filter(
        (candidate) =>
          candidate.phone != null &&
          normalizePhoneDigits(candidate.phone) === phoneDigits,
      );
    }

    // Prefer profiles that already have membership in the selected institute.
    // Phone can land on an orphan profile while email login uses another row.
    const instituteMatches: StaffProfile[] = [];
    for (const candidate of candidates) {
      const candidateMemberships = await listMemberships(admin, {
        instituteId,
        userId: candidate.id,
      });
      if (candidateMemberships.some((m) => m.status !== "ended")) {
        instituteMatches.push(candidate);
      }
    }
    if (instituteMatches.length > 1) {
      throw AppError.conflict(
        "Multiple Admin accounts use this mobile number in the selected institute. Use email or username.",
      );
    }
    profile = instituteMatches[0] ?? candidates[0] ?? null;
  } else {
    const cred = await findCredentialByUsername(admin, trimmed);
    if (cred) {
      const { data, error } = await admin
        .from("user_profile")
        .select("id, display_name, email, phone, status")
        .eq("id", cred.user_id)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      profile = (data as StaffProfile | null) ?? null;
      channel = profile?.email ? "email" : "mobile";
    }
  }

  if (!profile) {
    throw AppError.notFound(
      looksLikePhone
        ? "No Admin user matched this mobile number. Use email, or set user_profile.phone and phone_digits to your 10-digit number."
        : isEmail
          ? "No Admin user matched this email for the selected institute."
          : "No Admin user matched this username. Check the institute and identifier.",
    );
  }
  if (profile.status === "disabled") {
    throw AppError.forbidden("This Admin account is disabled. Contact support.");
  }

  let memberships = await listMemberships(admin, {
    instituteId,
    userId: profile.id,
  });
  let membership =
    memberships.find((m) => m.status === "active") ??
    memberships.find((m) => m.status !== "ended") ??
    null;

  if (!membership && looksLikePhone) {
    const rehomed = await tryRehomeOrphanPhoneToSoleInstituteAdmin(admin, {
      instituteId,
      orphanProfile: profile,
      phoneDigits,
    });
    if (rehomed) {
      profile = rehomed;
      memberships = await listMemberships(admin, {
        instituteId,
        userId: profile.id,
      });
      membership =
        memberships.find((m) => m.status === "active") ??
        memberships.find((m) => m.status !== "ended") ??
        null;
    }
  }

  if (!membership) {
    throw AppError.notFound(
      looksLikePhone
        ? "This mobile is linked to a different user than your Admin email account. Move phone/phone_digits onto the email Admin profile (or use email login)."
        : "This user exists but has no active membership in the selected institute.",
    );
  }
  if (membership.status === "suspended") {
    throw AppError.forbidden("This account is suspended. Contact your administrator.");
  }

  const assignment = await findAccessAssignmentForUserInstitute(
    admin,
    profile.id,
    instituteId,
  );
  const roleRows = await listRolesForMemberships(admin, [membership.id]);
  const codes = roleRows.map((r) => r.role_code);
  const instituteWide = codes.some((c) => INSTITUTE_WIDE_ROLES.has(c));
  const isAssigned = Boolean(assignment);
  const isInstituteRoot = !assignment && instituteWide;

  if (!assignment && !instituteWide) {
    throw AppError.notFound(
      "No Admin account found for this institute. Contact your administrator.",
    );
  }
  if (!assignment && instituteWide && !opts?.allowInstituteWide) {
    throw AppError.notFound(
      "No Admin account found for this institute. Contact your administrator.",
    );
  }

  const cred = await findCredentialByUserId(admin, profile.id);
  const firstLogin = !cred?.first_login_completed_at;
  // Assignees: OTP on first login only. Institute-wide admin/root: password + PIN.
  const requiresOtp = isAssigned && firstLogin;

  const authEmail = profile.email?.trim().toLowerCase();
  if (!authEmail) {
    throw AppError.validation("Account is missing a login email. Contact your administrator.");
  }

  return {
    userId: profile.id,
    displayName: profile.display_name,
    authEmail,
    channel,
    destination: channel === "email" ? authEmail : (profile.phone ?? trimmed),
    isAssigned,
    isInstituteRoot,
    requiresOtp,
    phone: profile.phone,
    email: authEmail,
  };
}

export async function requestStaffLoginOtp(
  admin: SupabaseClient,
  input: RequestStaffOtpInput,
): Promise<RequestStaffOtpResult> {
  const resolved = await resolveStaffLoginUser(
    admin,
    input.instituteId.trim(),
    input.identifier,
    { allowInstituteWide: true },
  );
  const cred = await findCredentialByUserId(admin, resolved.userId);
  const firstLogin = !cred?.first_login_completed_at;

  if (!resolved.isAssigned) {
    throw AppError.validation(
      "OTP is not required for this account. Use password and PIN.",
    );
  }
  if (!firstLogin) {
    throw AppError.validation(
      "OTP is only required on first login. Use password and PIN for returning sign-in.",
    );
  }

  const channel = input.channel ?? "mobile";
  const destination =
    channel === "email" ? resolved.email : resolved.phone;
  if (!destination) {
    throw AppError.validation(
      channel === "email"
        ? "Account email is missing."
        : "Account mobile number is missing.",
    );
  }

  if (channel === "email") {
    const env = loadEnv();
    if (env.OTP_EMAIL_PROVIDER === "none") {
      throw AppError.validation(
        "Email OTP is not configured. Use the mobile OTP, then password and PIN.",
      );
    }
  }

  // Dual-channel first login uses workflow OTP keys so email + mobile can coexist.
  const stored = await storeWorkflowOtp(admin, {
    purpose: "staff_login",
    challengeKey: `staff:${channel}:${input.instituteId.trim()}:${resolved.userId}`,
    instituteId: input.instituteId.trim(),
    channel,
    destination,
    subjectId: resolved.userId,
  });

  if (stored.shouldDeliver) {
    await deliverLoginOtp({
      channel: channel === "email" ? "email" : "sms",
      destination,
      otp: stored.otp,
      purpose: "staff_login",
    });
  }

  return {
    maskedDestination:
      stored.maskedDestination ||
      maskStaffIdentifier(destination, channel),
    channel,
    displayName: resolved.displayName,
    devOtp: stored.devOtp,
  };
}

export type VerifyStaffLoginInput = {
  instituteId: string;
  identifier: string;
  otp?: string;
  mobileOtp?: string;
  emailOtp?: string;
  /** One-use grants from verifyStaffChannelOtp (preferred over re-submitting OTPs). */
  mobileOtpGrant?: string;
  emailOtpGrant?: string;
  password: string;
  pin: string;
};

export type VerifyStaffPasswordLoginInput = {
  instituteId: string;
  identifier: string;
  password: string;
  pin: string;
};

export type StaffLoginSession = {
  accessToken: string;
  refreshToken: string;
  instituteId: string;
  displayName: string;
};

async function createAuthSessionForEmail(
  admin: SupabaseClient,
  email: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  return createServerAuthSessionForEmail(admin, email, "staff session");
}

async function assertPasswordForUser(
  admin: SupabaseClient,
  userId: string,
  password: string,
  fallbackEmail?: string | null,
): Promise<string> {
  const candidates: string[] = [];
  const push = (value: string | null | undefined) => {
    const email = value?.trim().toLowerCase();
    if (email && !candidates.includes(email)) candidates.push(email);
  };

  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (!error) push(data.user?.email ?? null);
  push(fallbackEmail);

  if (candidates.length === 0) {
    throw AppError.validation(
      "Account is missing a login email. Contact your administrator.",
    );
  }

  for (const email of candidates) {
    const ok = await verifyPasswordWithoutPoisoning(admin, email, password);
    if (ok) return email;
  }

  throw AppError.validation("Incorrect password. Please try again.", {
    password: ["Invalid"],
  });
}

export async function verifyStaffPasswordLogin(
  admin: SupabaseClient,
  input: VerifyStaffPasswordLoginInput,
): Promise<StaffLoginSession> {
  if (!input.password || input.password.length < 1) {
    throw AppError.validation("password is required", { password: ["Required"] });
  }

  const resolved = await resolveStaffLoginUser(
    admin,
    input.instituteId.trim(),
    input.identifier,
    { allowInstituteWide: true },
  );
  const cred = await findCredentialByUserId(admin, resolved.userId);
  const firstLogin = !cred?.first_login_completed_at;

  if (firstLogin && resolved.isAssigned) {
    throw AppError.validation(
      "This account requires OTP verification on first login.",
    );
  }

  const sessionEmail = await assertPasswordForUser(
    admin,
    resolved.userId,
    input.password,
    resolved.authEmail,
  );

  if (firstLogin) {
    // First login (or principal signup): set/confirm PIN.
    assertValidPin(input.pin);
    if (cred?.pin_hash) {
      assertPinMatches(cred, input.pin, { required: true });
    } else {
      await upsertUserAuthCredential(admin, {
        userId: resolved.userId,
        pin: input.pin,
        markFirstLoginCompleted: true,
      });
    }
    if (cred?.pin_hash) {
      await upsertUserAuthCredential(admin, {
        userId: resolved.userId,
        markFirstLoginCompleted: true,
      });
    }
  } else {
    assertPinMatches(cred, input.pin, { required: true });
  }

  const session = await createAuthSessionForEmail(admin, sessionEmail);

  return {
    ...session,
    instituteId: input.instituteId.trim(),
    displayName: resolved.displayName,
  };
}

export async function verifyStaffLogin(
  admin: SupabaseClient,
  input: VerifyStaffLoginInput,
): Promise<StaffLoginSession> {
  if (!input.password || input.password.length < 1) {
    throw AppError.validation("password is required", { password: ["Required"] });
  }

  const resolved = await resolveStaffLoginUser(
    admin,
    input.instituteId.trim(),
    input.identifier,
    { allowInstituteWide: true },
  );
  if (!resolved.requiresOtp) {
    throw AppError.validation(
      "OTP login is only for first-time Admin sign-in. Use password + PIN.",
    );
  }

  const cred = await findCredentialByUserId(admin, resolved.userId);
  const firstLogin = !cred?.first_login_completed_at;
  if (!firstLogin) {
    throw AppError.validation("Use password + PIN login for returning Admin users.");
  }

  let mobileVerified = false;
  let usedMobileGrant = false;
  if (input.mobileOtpGrant?.trim()) {
    await consumeAuthVerificationGrant(admin, {
      purpose: "staff_login",
      grant: input.mobileOtpGrant.trim(),
      subjectId: resolved.userId,
      metadata: { channel: "mobile" },
    });
    mobileVerified = true;
    usedMobileGrant = true;
  } else {
    const mobileOtp = input.mobileOtp ?? input.otp;
    if (!mobileOtp || mobileOtp.length !== 6) {
      throw AppError.validation("Mobile OTP is required.", { mobile_otp: ["Required"] });
    }
    const mobileOk = await verifyWorkflowOtp(admin, {
      purpose: "staff_login",
      challengeKey: `staff:mobile:${input.instituteId.trim()}:${resolved.userId}`,
      otp: mobileOtp,
    });
    mobileVerified =
      Boolean(mobileOk) && mobileOk!.subjectId === resolved.userId;
    if (!mobileVerified && input.otp) {
      const legacy = await verifyStoredStaffLoginOtp(admin, {
        instituteId: input.instituteId,
        identifier: input.identifier,
        otp: input.otp,
      });
      mobileVerified = Boolean(legacy) && legacy!.userId === resolved.userId;
    }
  }
  if (!mobileVerified) {
    throw AppError.validation("Incorrect or expired mobile OTP.");
  }

  // Email OTP required unless mobile was already proven via a server mobile grant.
  if (!usedMobileGrant) {
    if (input.emailOtpGrant?.trim()) {
      await consumeAuthVerificationGrant(admin, {
        purpose: "staff_login",
        grant: input.emailOtpGrant.trim(),
        subjectId: resolved.userId,
        metadata: { channel: "email" },
      });
    } else {
      const emailOtp = input.emailOtp;
      if (!emailOtp || emailOtp.length !== 6) {
        throw AppError.validation("Email OTP is required.", { email_otp: ["Required"] });
      }
      const emailOk = await verifyWorkflowOtp(admin, {
        purpose: "staff_login",
        challengeKey: `staff:email:${input.instituteId.trim()}:${resolved.userId}`,
        otp: emailOtp,
      });
      if (!emailOk || emailOk.subjectId !== resolved.userId) {
        throw AppError.validation("Incorrect or expired email OTP.");
      }
    }
  }

  // Notebook: password is always required after OTP.
  // Verify against Auth user id — profile.email can diverge from auth.users.email.
  const sessionEmail = await assertPasswordForUser(
    admin,
    resolved.userId,
    input.password,
    resolved.authEmail,
  );

  assertValidPin(input.pin);
  if (cred?.pin_hash) {
    assertPinMatches(cred, input.pin, { required: true });
    await upsertUserAuthCredential(admin, {
      userId: resolved.userId,
      markFirstLoginCompleted: true,
      markPhoneVerified: true,
      markEmailVerified: !usedMobileGrant,
    });
  } else {
    await upsertUserAuthCredential(admin, {
      userId: resolved.userId,
      pin: input.pin,
      markFirstLoginCompleted: true,
      markPhoneVerified: true,
      markEmailVerified: true,
    });
  }

  const session = await createAuthSessionForEmail(admin, sessionEmail);

  return {
    ...session,
    instituteId: input.instituteId.trim(),
    displayName: resolved.displayName,
  };
}

async function requestStaffRecoveryOtp(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    identifier: string;
    channel: "email" | "mobile";
    purpose: "password_reset" | "pin_reset";
  },
) {
  const resolved = await resolveStaffLoginUser(
    admin,
    input.instituteId.trim(),
    input.identifier,
    { allowInstituteWide: true },
  );
  const destination =
    input.channel === "email" ? resolved.email : resolved.phone;
  if (!destination) {
    throw AppError.validation(
      input.channel === "email"
        ? "Account email is missing."
        : "Account mobile number is missing.",
    );
  }

  if (input.channel === "email") {
    const env = loadEnv();
    if (env.OTP_EMAIL_PROVIDER === "none") {
      throw AppError.validation(
        "Email OTP is not configured. Complete recovery with the mobile OTP only.",
      );
    }
  }

  const stored = await storeWorkflowOtp(admin, {
    purpose: input.purpose,
    challengeKey: `staff:${input.purpose}:${input.channel}:${input.instituteId.trim()}:${resolved.userId}`,
    instituteId: input.instituteId.trim(),
    channel: input.channel,
    destination,
    subjectId: resolved.userId,
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
    maskedDestination:
      stored.maskedDestination ||
      maskWorkflowDestination(destination, input.channel),
    channel: input.channel,
    displayName: resolved.displayName,
    devOtp: stored.devOtp,
  };
}

async function verifyStaffRecoveryOtp(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    identifier: string;
    channel: "email" | "mobile";
    otp: string;
    purpose: "password_reset" | "pin_reset" | "staff_login";
  },
) {
  const resolved = await resolveStaffLoginUser(
    admin,
    input.instituteId.trim(),
    input.identifier,
    { allowInstituteWide: true },
  );
  const verified = await verifyWorkflowOtp(admin, {
    purpose: input.purpose,
    challengeKey:
      input.purpose === "staff_login"
        ? `staff:${input.channel}:${input.instituteId.trim()}:${resolved.userId}`
        : `staff:${input.purpose}:${input.channel}:${input.instituteId.trim()}:${resolved.userId}`,
    otp: input.otp,
  });
  if (!verified || verified.subjectId !== resolved.userId) {
    throw AppError.validation("Incorrect or expired code. Try again or request a new OTP.");
  }
  const issued = await issueAuthVerificationGrant(admin, {
    purpose: input.purpose,
    subjectId: resolved.userId,
    destination: verified.destination,
    metadata: {
      channel: input.channel,
      instituteId: input.instituteId.trim(),
    },
    ttlMs: 10 * 60 * 1000,
  });
  return { ok: true as const, channel: input.channel, ...issued };
}

export async function verifyStaffChannelOtp(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    identifier: string;
    channel: "email" | "mobile";
    otp: string;
  },
) {
  return verifyStaffRecoveryOtp(admin, { ...input, purpose: "staff_login" });
}

export async function requestStaffPasswordResetOtp(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    identifier: string;
    channel: "email" | "mobile";
  },
) {
  return requestStaffRecoveryOtp(admin, { ...input, purpose: "password_reset" });
}

export async function verifyStaffPasswordResetOtp(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    identifier: string;
    channel: "email" | "mobile";
    otp: string;
  },
) {
  return verifyStaffRecoveryOtp(admin, { ...input, purpose: "password_reset" });
}

export async function completeStaffPasswordReset(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    identifier: string;
    mobileOtpGrant: string;
    /** Optional when mobile OTP alone proved the account (no numeric email OTP). */
    emailOtpGrant?: string;
    newPassword: string;
  },
) {
  if (!input.newPassword || input.newPassword.length < 8) {
    throw AppError.validation("Password must be at least 8 characters.", {
      new_password: ["Too short"],
    });
  }
  const resolved = await resolveStaffLoginUser(
    admin,
    input.instituteId.trim(),
    input.identifier,
    { allowInstituteWide: true },
  );
  await consumeAuthVerificationGrant(admin, {
    purpose: "password_reset",
    grant: input.mobileOtpGrant,
    subjectId: resolved.userId,
    metadata: { channel: "mobile" },
  });
  const emailGrant = input.emailOtpGrant?.trim();
  if (emailGrant) {
    await consumeAuthVerificationGrant(admin, {
      purpose: "password_reset",
      grant: emailGrant,
      subjectId: resolved.userId,
      metadata: { channel: "email" },
    });
  }
  const { error } = await admin.auth.admin.updateUserById(resolved.userId, {
    password: input.newPassword,
  });
  if (error) throw AppError.internal("Unable to update password.");
  return {
    ok: true as const,
    userId: resolved.userId,
    email: resolved.authEmail,
  };
}

export async function requestStaffPinResetOtp(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    identifier: string;
    channel: "email" | "mobile";
  },
) {
  return requestStaffRecoveryOtp(admin, { ...input, purpose: "pin_reset" });
}

export async function verifyStaffPinResetOtp(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    identifier: string;
    channel: "email" | "mobile";
    otp: string;
  },
) {
  return verifyStaffRecoveryOtp(admin, { ...input, purpose: "pin_reset" });
}

export async function completeStaffPinReset(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    identifier: string;
    mobileOtpGrant: string;
    /** Optional when mobile OTP alone proved the account. */
    emailOtpGrant?: string;
    newPin: string;
  },
) {
  const pin = assertValidPin(input.newPin);
  const resolved = await resolveStaffLoginUser(
    admin,
    input.instituteId.trim(),
    input.identifier,
    { allowInstituteWide: true },
  );
  await consumeAuthVerificationGrant(admin, {
    purpose: "pin_reset",
    grant: input.mobileOtpGrant,
    subjectId: resolved.userId,
    metadata: { channel: "mobile" },
  });
  const emailGrant = input.emailOtpGrant?.trim();
  if (emailGrant) {
    await consumeAuthVerificationGrant(admin, {
      purpose: "pin_reset",
      grant: emailGrant,
      subjectId: resolved.userId,
      metadata: { channel: "email" },
    });
  }
  const cred = await findCredentialByUserId(admin, resolved.userId);
  await upsertUserAuthCredential(admin, {
    userId: resolved.userId,
    username:
      cred?.username ||
      resolved.email?.split("@")[0] ||
      assertValidUsername("operator"),
    pin,
    markFirstLoginCompleted: true,
  });
  return { ok: true as const };
}
