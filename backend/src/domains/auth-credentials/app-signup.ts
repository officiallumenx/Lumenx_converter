import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import {
  createSupabaseSessionForUserId,
  signInPasswordForUserId,
} from "../../auth/create-server-session.js";
import { deliverLoginOtp, isOtpDemoMode } from "../otp-delivery/index.js";
import {
  consumeAuthVerificationGrant,
  issueAuthVerificationGrant,
} from "./verification-grant.js";
import {
  maskWorkflowDestination,
  storeWorkflowOtp,
  verifyWorkflowOtp,
} from "./workflow-otp.js";

export type AppSignupInput = {
  app: "admissions" | "careers";
  accountType: "parent" | "institute_admin" | "job_seeker" | "recruiter";
  email: string;
  password: string;
  displayName: string;
  phone?: string | null;
  verificationGrants: string[];
  metadata?: Record<string, unknown>;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function phoneDigits(value?: string | null): string | null {
  const digits = value?.replace(/\D/g, "").slice(-10) ?? "";
  return digits.length === 10 ? digits : null;
}

function allowedAccountType(app: AppSignupInput["app"], type: string): boolean {
  return app === "admissions"
    ? type === "parent" || type === "institute_admin"
    : type === "job_seeker" || type === "recruiter";
}

function verificationGrantParams(
  input: AppSignupInput,
) {
  const email = normalizeEmail(input.email);
  const phone = phoneDigits(input.phone);
  // Careers + Admissions collect email for the account, but only mobile OTP is required.
  // (Supabase confirms email at provision time; no email OTP challenge.)
  const requiredDestinations = [phone];
  if (!email || requiredDestinations.some((value) => !value)) {
    throw AppError.validation("Email and a verified mobile number are required for this signup");
  }
  return {
    p_token_hashes: [...new Set(input.verificationGrants.map((grant) =>
      createHash("sha256").update(grant.trim()).digest("hex"),
    ))],
    p_subject_key: email,
    p_required_destinations: requiredDestinations,
  };
}

async function assertVerificationGrants(
  admin: SupabaseClient,
  input: AppSignupInput,
): Promise<void> {
  const { data, error } = await admin.rpc(
    "validate_signup_verification_grants",
    verificationGrantParams(input),
  );
  if (error || data !== true) {
    throw AppError.validation(
      "Signup verification expired or does not match these contact details. Verify again.",
    );
  }
}

async function consumeVerificationGrants(
  admin: SupabaseClient,
  input: AppSignupInput,
): Promise<void> {
  const { data, error } = await admin.rpc(
    "consume_signup_verification_grants",
    verificationGrantParams(input),
  );
  if (error || data !== true) {
    throw AppError.conflict("Signup verification grant was already used");
  }
}

async function provisionSupabaseUser(
  admin: SupabaseClient,
  input: AppSignupInput,
): Promise<string> {
  const email = normalizeEmail(input.email);
  const created = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      display_name: input.displayName.trim(),
      signup_app: input.app,
      account_type: input.accountType,
    },
  });
  if (!created.error && created.data.user?.id) return created.data.user.id;

  const message = created.error?.message.toLowerCase() ?? "";
  if (!message.includes("already") && !message.includes("registered") && !message.includes("exists")) {
    throw AppError.internal("Unable to create account");
  }
  const userId = await signInPasswordForUserId(admin, email, input.password);
  if (!userId) {
    throw AppError.conflict(
      "An account with this email already exists. Sign in with your LumenX password instead.",
    );
  }
  return userId;
}

async function ensureProfileAndAppIdentity(
  admin: SupabaseClient,
  userId: string,
  input: AppSignupInput,
): Promise<void> {
  const profile = await admin.from("user_profile").upsert({
    id: userId,
    display_name: input.displayName.trim(),
    email: normalizeEmail(input.email),
    phone: input.phone?.trim() || null,
    status: "active",
    email_verified_at: new Date().toISOString(),
    phone_verified_at: phoneDigits(input.phone) ? new Date().toISOString() : null,
  }, { onConflict: "id", ignoreDuplicates: true });
  if (profile.error) throw AppError.internal("Unable to provision account profile");

  const identity = await admin.from("app_user_identity").upsert({
    user_id: userId,
    app: input.app,
    account_type: input.accountType,
    metadata: input.metadata ?? {},
  }, { onConflict: "user_id,app" });
  if (identity.error) throw AppError.internal("Unable to provision application identity");
}

export async function completeAppSignup(
  admin: SupabaseClient,
  input: AppSignupInput,
) {
  if (!allowedAccountType(input.app, input.accountType)) {
    throw AppError.validation("Account type is not valid for this application");
  }
  if (input.password.length < 8) {
    throw AppError.validation("Password must be at least 8 characters");
  }
  await assertVerificationGrants(admin, input);
  const userId = await provisionSupabaseUser(admin, input);
  await ensureProfileAndAppIdentity(admin, userId, input);
  const session = await createSupabaseSessionForUserId(admin, userId);
  await consumeVerificationGrants(admin, input);
  return {
    userId,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  };
}

type AppLoginApp = AppSignupInput["app"];
type AppLoginAccountType = AppSignupInput["accountType"];

async function findProfileByMobile(
  admin: SupabaseClient,
  phone: string,
): Promise<{ id: string; email: string | null; phone: string | null; status: string } | null> {
  const digits = phoneDigits(phone);
  if (!digits) {
    throw AppError.validation("Enter a valid 10-digit mobile number");
  }

  const byDigits = await admin
    .from("user_profile")
    .select("id, email, phone, status")
    .eq("phone_digits", digits)
    .is("deleted_at", null)
    .maybeSingle();
  if (byDigits.error) throw AppError.internal("Unable to look up account");
  if (byDigits.data) {
    return byDigits.data as {
      id: string;
      email: string | null;
      phone: string | null;
      status: string;
    };
  }

  // Fallback when phone_digits is out of sync but phone text still matches.
  const { data, error } = await admin
    .from("user_profile")
    .select("id, email, phone, status, phone_digits")
    .is("deleted_at", null)
    .not("phone", "is", null)
    .limit(800);
  if (error) throw AppError.internal("Unable to look up account");
  const matches = ((data ?? []) as Array<{
    id: string;
    email: string | null;
    phone: string | null;
    status: string;
    phone_digits?: string | null;
  }>).filter((row) => phoneDigits(row.phone) === digits || row.phone_digits === digits);
  if (matches.length > 1) {
    throw AppError.conflict("Multiple accounts match this mobile. Contact support.");
  }
  return matches[0] ?? null;
}

/**
 * Mobile + password login for Admissions / Careers.
 * Email remains on the profile for recovery/details; auth identity is the phone.
 */
export async function loginAppWithMobilePassword(
  admin: SupabaseClient,
  input: {
    app: AppLoginApp;
    phone: string;
    password: string;
    accountType?: AppLoginAccountType;
  },
) {
  const profile = await findProfileByMobile(admin, input.phone);
  if (!profile || profile.status !== "active") {
    throw AppError.unauthenticated("Invalid mobile number or password");
  }

  const identity = await admin
    .from("app_user_identity")
    .select("account_type")
    .eq("user_id", profile.id)
    .eq("app", input.app)
    .maybeSingle();
  if (identity.error) throw AppError.internal("Unable to verify application access");
  if (!identity.data) {
    throw AppError.forbidden(
      input.app === "admissions"
        ? "No Admissions account for this mobile. Create an account first."
        : "No Careers account for this mobile. Create an account first.",
    );
  }
  if (
    input.accountType &&
    identity.data.account_type &&
    identity.data.account_type !== input.accountType
  ) {
    throw AppError.forbidden(
      `This account is not registered as ${input.accountType.replace(/_/g, " ")}.`,
    );
  }

  const authUser = await admin.auth.admin.getUserById(profile.id);
  const email =
    authUser.data.user?.email?.trim().toLowerCase() ||
    profile.email?.trim().toLowerCase() ||
    "";
  if (!email) {
    throw AppError.internal("Account is missing a recovery email");
  }

  const userId = await signInPasswordForUserId(admin, email, input.password);
  if (!userId || userId !== profile.id) {
    throw AppError.unauthenticated("Invalid mobile number or password");
  }

  const session = await createSupabaseSessionForUserId(admin, profile.id);
  return {
    userId: profile.id,
    accountType: String(identity.data.account_type ?? ""),
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  };
}

async function requireAppProfileByMobile(
  admin: SupabaseClient,
  input: { app: AppLoginApp; phone: string },
) {
  const digits = phoneDigits(input.phone);
  if (!digits) {
    throw AppError.validation("Enter a valid 10-digit mobile number");
  }
  const profile = await findProfileByMobile(admin, digits);
  if (!profile || profile.status !== "active") {
    throw AppError.validation("No account found for this mobile number.");
  }
  const identity = await admin
    .from("app_user_identity")
    .select("user_id")
    .eq("user_id", profile.id)
    .eq("app", input.app)
    .maybeSingle();
  if (identity.error) throw AppError.internal("Unable to verify application access");
  if (!identity.data) {
    throw AppError.validation(
      input.app === "admissions"
        ? "No Admissions account for this mobile."
        : "No Careers account for this mobile.",
    );
  }
  return { profile, digits };
}

function passwordResetChallengeKey(app: AppLoginApp, digits: string): string {
  return `app-password-reset:${app}:${digits}`;
}

/** Request mobile OTP to reset Admissions / Careers password. */
export async function requestAppPasswordResetOtp(
  admin: SupabaseClient,
  input: { app: AppLoginApp; phone: string },
) {
  const { profile, digits } = await requireAppProfileByMobile(admin, input);
  const stored = await storeWorkflowOtp(admin, {
    purpose: "password_reset",
    challengeKey: passwordResetChallengeKey(input.app, digits),
    channel: "mobile",
    destination: digits,
    subjectId: profile.id,
  });
  if (stored.shouldDeliver) {
    await deliverLoginOtp({
      channel: "sms",
      destination: digits,
      otp: stored.otp,
      purpose: "password_reset",
    });
  }
  return {
    maskedDestination: stored.maskedDestination,
    channel: "mobile" as const,
    skipped: false as const,
    devOtp: stored.devOtp ?? (isOtpDemoMode() ? stored.otp || undefined : undefined),
  };
}

/** Verify mobile OTP and issue a one-time password-reset grant. */
export async function verifyAppPasswordResetOtp(
  admin: SupabaseClient,
  input: { app: AppLoginApp; phone: string; otp: string },
) {
  const { profile, digits } = await requireAppProfileByMobile(admin, input);
  const verified = await verifyWorkflowOtp(admin, {
    purpose: "password_reset",
    challengeKey: passwordResetChallengeKey(input.app, digits),
    otp: input.otp,
  });
  if (!verified) {
    throw AppError.validation("Incorrect or expired code.");
  }
  const issued = await issueAuthVerificationGrant(admin, {
    purpose: "password_reset",
    subjectId: profile.id,
    destination: digits,
    metadata: { channel: "mobile", app: input.app },
  });
  return {
    ok: true as const,
    grant: issued.grant,
    expiresAt: issued.expiresAt,
  };
}

/** Complete password reset after mobile OTP grant. */
export async function completeAppPasswordReset(
  admin: SupabaseClient,
  input: {
    app: AppLoginApp;
    phone: string;
    mobileOtpGrant: string;
    newPassword: string;
  },
) {
  if (!input.newPassword || input.newPassword.length < 8) {
    throw AppError.validation("Password must be at least 8 characters.", {
      new_password: ["Too short"],
    });
  }
  const { profile, digits } = await requireAppProfileByMobile(admin, input);
  await consumeAuthVerificationGrant(admin, {
    purpose: "password_reset",
    grant: input.mobileOtpGrant,
    subjectId: profile.id,
    metadata: { channel: "mobile", app: input.app },
  });
  void digits;
  const { error } = await admin.auth.admin.updateUserById(profile.id, {
    password: input.newPassword,
  });
  if (error) throw AppError.internal("Unable to update password.");
  return { ok: true as const };
}
