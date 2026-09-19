/**
 * Nexus platform operator login (exact notebook workflow):
 *   identifier (mobile|email) → mobile OTP → email OTP → password → PIN → home
 * Recovery:
 *   forgot password → mobile+email → both OTPs → set password → PIN
 *   forgot PIN → mobile+email → both OTPs → set PIN → enter PIN → home
 * Dual OTP is required on every login (root and operators).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { FirebaseIdentity } from "../../auth/firebase-identity.js";
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
import {
  linkFirebaseIdentityToExistingUser,
  resolveLumenXUserFromFirebaseIdentity,
} from "../firebase-identity/service.js";

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
): Promise<PlatformOperatorRow> {
  const { data, error } = await admin
    .from("platform_operator")
    .select("user_id, handle, display_name, status, role_code")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  const row = data as PlatformOperatorRow | null;
  if (!row || (row.status !== "active" && row.status !== "invited")) {
    throw AppError.forbidden("No active Nexus operator account for this user.");
  }
  return row;
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
    throw AppError.notFound("Operator profile not found.");
  }
  return profile;
}

async function resolveOperatorByIdentifier(
  admin: SupabaseClient,
  identifier: string,
): Promise<{ profile: OperatorProfile; operator: PlatformOperatorRow }> {
  const trimmed = identifier.trim();
  let profile: OperatorProfile | null = null;

  if (trimmed.includes("@")) {
    const { data, error } = await admin
      .from("user_profile")
      .select("id, display_name, email, phone, status")
      .ilike("email", trimmed.toLowerCase())
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    profile = (data as OperatorProfile | null) ?? null;
  } else if (/^\d{10}$/.test(normalizePhoneDigits(trimmed)) && !trimmed.includes(".")) {
    const phone = normalizePhoneDigits(trimmed);
    const { data, error } = await admin
      .from("user_profile")
      .select("id, display_name, email, phone, status")
      .eq("phone_digits", phone)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    profile = (data as OperatorProfile | null) ?? null;
  } else {
    const { data: byUsername, error: usernameError } = await admin
      .from("user_profile")
      .select("id, display_name, email, phone, status")
      .ilike("username", trimmed.toLowerCase())
      .is("deleted_at", null)
      .maybeSingle();
    if (usernameError) throw usernameError;
    profile = (byUsername as OperatorProfile | null) ?? null;
    if (!profile) {
      const { data: op, error } = await admin
        .from("platform_operator")
        .select("user_id, handle, display_name, status, role_code")
        .ilike("handle", trimmed.toLowerCase())
        .maybeSingle();
      if (error) throw error;
      const operator = op as PlatformOperatorRow | null;
      if (operator) {
        profile = await loadProfile(admin, operator.user_id);
        return { profile, operator };
      }
    }
  }

  if (!profile) {
    throw AppError.notFound("No Nexus operator found for this identifier.");
  }
  const operator = await loadActiveOperator(admin, profile.id);
  return { profile, operator };
}

function nexusWorkflowFlags(
  cred: Awaited<ReturnType<typeof findCredentialByUserId>>,
) {
  return workflowFlagsFromCredential(cred, {
    dualOtpAlways: true,
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
      : profile.phone ?? "";
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
    /** `firebase_client` = return phone for Firebase SMS; do not send Twilio OTP. */
    delivery?: "server" | "firebase_client";
  },
) {
  if (input.delivery === "firebase_client") {
    if (input.channel !== "mobile") {
      throw AppError.validation(
        "Firebase client delivery is only supported for the mobile channel.",
      );
    }
    const { profile, operator } = await resolveOperatorByIdentifier(
      admin,
      input.identifier,
    );
    const destination = profile.phone?.trim() ?? "";
    if (!destination) {
      throw AppError.validation("Operator mobile number is missing for Firebase OTP.");
    }
    const digits = normalizePhoneDigits(destination);
    const phoneE164 = destination.startsWith("+")
      ? destination.replace(/\s+/g, "")
      : `+91${digits}`;
    return {
      maskedDestination: maskWorkflowDestination(destination, "mobile"),
      channel: "mobile" as const,
      displayName: operator.display_name || profile.display_name,
      phoneE164,
    };
  }
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
  emailOtpGrant: string;
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
  if (!input.emailOtpGrant) {
    throw AppError.validation("Verify email OTP before completing login.");
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
  await consumeAuthVerificationGrant(admin, {
    purpose: "nexus_login",
    grant: input.emailOtpGrant,
    subjectId: profile.id,
    metadata: { channel: "email" },
  });

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

function firebaseSignInProvider(identity: FirebaseIdentity): string {
  const firebase = identity.claims.firebase;
  return firebase && typeof firebase.sign_in_provider === "string"
    ? firebase.sign_in_provider
    : "";
}

/**
 * Firebase bridge for Nexus.
 * Phone SMS OTP is verified by Firebase (id token). Numeric email OTP is not a
 * Firebase Auth feature — email factor is Firebase email/password + PIN.
 */
export async function completeNexusFirebaseLogin(
  admin: SupabaseClient,
  identity: FirebaseIdentity,
  input: {
    provider: "password" | "phone";
    pin: string;
    /** Required after Firebase phone OTP — password is always a login factor. */
    password?: string;
    mobileOtpGrant?: string;
    emailOtpGrant?: string;
  },
) {
  const actualProvider = firebaseSignInProvider(identity);
  if (actualProvider !== input.provider) {
    throw AppError.validation("Firebase sign-in provider does not match the declared factor.");
  }
  if (input.provider === "password" && !identity.email) {
    throw AppError.validation("Firebase email/password identity is required.");
  }
  if (input.provider === "phone" && !identity.phoneNumber) {
    throw AppError.validation("Firebase phone verification is required.");
  }

  const mapping = await resolveLumenXUserFromFirebaseIdentity(admin, identity, {
    allowCandidateLookup: true,
  });
  const profile = await loadProfile(admin, mapping.userProfileId);
  const operator = await loadActiveOperator(admin, profile.id);
  const { data: authUser } = await admin.auth.admin.getUserById(profile.id);
  const authEmail =
    authUser.user?.email?.trim().toLowerCase() ||
    profile.email?.trim().toLowerCase() ||
    null;
  if (!authEmail) throw AppError.validation("Operator account is missing an email.");

  if (
    input.provider === "password" &&
    identity.email &&
    identity.email.trim().toLowerCase() !== authEmail
  ) {
    throw AppError.validation("Firebase email does not match this Nexus operator.");
  }
  if (
    input.provider === "phone" &&
    normalizePhoneDigits(profile.phone ?? "") !==
      normalizePhoneDigits(identity.phoneNumber ?? "")
  ) {
    throw AppError.validation("Firebase phone does not match this Nexus operator.");
  }

  // Notebook: password is always required (including after Firebase phone OTP).
  if (input.provider === "phone") {
    if (!input.password || input.password.length < 1) {
      throw AppError.validation("Password is required after mobile OTP.", {
        password: ["Required"],
      });
    }
    const ok = await verifyPasswordWithoutPoisoning(admin, authEmail, input.password);
    if (!ok) {
      throw AppError.validation("Incorrect password.", { password: ["Invalid"] });
    }
  }

  // Optional legacy grants (Twilio/Resend dual-OTP). Firebase token already proves the channel.
  if (input.mobileOtpGrant) {
    await consumeAuthVerificationGrant(admin, {
      purpose: "nexus_login",
      grant: input.mobileOtpGrant,
      subjectId: profile.id,
      metadata: { channel: "mobile" },
    });
  }
  if (input.emailOtpGrant) {
    await consumeAuthVerificationGrant(admin, {
      purpose: "nexus_login",
      grant: input.emailOtpGrant,
      subjectId: profile.id,
      metadata: { channel: "email" },
    });
  }

  const cred = await findCredentialByUserId(admin, profile.id);
  if (cred?.pin_hash) {
    assertPinMatches(cred, input.pin, { required: true });
  } else {
    assertValidPin(input.pin);
    await upsertUserAuthCredential(admin, {
      userId: profile.id,
      username: cred?.username || operator.handle || profile.email?.split("@")[0],
      pin: input.pin,
      markFirstLoginCompleted: true,
      markEmailVerified: true,
      markPhoneVerified: true,
    });
  }

  await linkFirebaseIdentityToExistingUser(admin, {
    userProfileId: profile.id,
    firebaseUid: identity.uid,
  });

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
    emailOtpGrant: string;
    newPassword: string;
  },
) {
  if (!input.newPassword || input.newPassword.length < 8) {
    throw AppError.validation("Password must be at least 8 characters.", {
      new_password: ["Too short"],
    });
  }
  const { profile } = await resolveOperatorByIdentifier(admin, input.identifier);
  await consumeAuthVerificationGrant(admin, {
    purpose: "password_reset",
    grant: input.mobileOtpGrant,
    subjectId: profile.id,
    metadata: { channel: "mobile" },
  });
  await consumeAuthVerificationGrant(admin, {
    purpose: "password_reset",
    grant: input.emailOtpGrant,
    subjectId: profile.id,
    metadata: { channel: "email" },
  });
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
    emailOtpGrant: string;
    newPin: string;
  },
) {
  const pin = assertValidPin(input.newPin);
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
  await consumeAuthVerificationGrant(admin, {
    purpose: "pin_reset",
    grant: input.emailOtpGrant,
    subjectId: profile.id,
    metadata: { channel: "email" },
  });
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
