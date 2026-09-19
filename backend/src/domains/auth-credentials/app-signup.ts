import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Auth, UserRecord } from "firebase-admin/auth";
import { AppError } from "../../errors/app-error.js";
import { signInPasswordForUserId } from "../../auth/create-server-session.js";
import { createSupabaseSessionForUserId } from "../firebase-identity/session.js";
import { linkFirebaseIdentityToExistingUser } from "../firebase-identity/service.js";

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
  const requiredDestinations =
    input.app === "admissions" && input.accountType === "parent"
      ? [phone]
      : [email, phone];
  if (requiredDestinations.some((value) => !value)) {
    throw AppError.validation("Verified email and mobile are required for this signup");
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
    throw AppError.conflict("An account with this email already exists");
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

async function getFirebaseUserByUid(auth: Auth, uid: string): Promise<UserRecord | null> {
  try {
    return await auth.getUser(uid);
  } catch (error) {
    if ((error as { code?: string })?.code === "auth/user-not-found") return null;
    throw error;
  }
}

async function getFirebaseUserByEmail(auth: Auth, email: string): Promise<UserRecord | null> {
  try {
    return await auth.getUserByEmail(email);
  } catch (error) {
    if ((error as { code?: string })?.code === "auth/user-not-found") return null;
    throw error;
  }
}

/**
 * Uses the Supabase user id as Firebase uid. This makes an interrupted create
 * distinguishable from an unrelated Firebase account sharing the same email.
 */
export async function ensureOwnedFirebaseIdentity(
  admin: SupabaseClient,
  auth: Auth,
  userId: string,
  input: Pick<AppSignupInput, "email" | "password" | "displayName">,
): Promise<string> {
  const email = normalizeEmail(input.email);
  let firebaseUser = await getFirebaseUserByUid(auth, userId);
  if (firebaseUser && normalizeEmail(firebaseUser.email ?? "") !== email) {
    throw AppError.conflict("Firebase identity belongs to different contact details");
  }
  if (!firebaseUser) {
    const emailOwner = await getFirebaseUserByEmail(auth, email);
    if (emailOwner && emailOwner.uid !== userId) {
      throw AppError.conflict(
        "This email is already attached to a different Firebase identity",
      );
    }
    firebaseUser = emailOwner ?? await auth.createUser({
      uid: userId,
      email,
      password: input.password,
      displayName: input.displayName.trim(),
      emailVerified: true,
    });
  } else {
    firebaseUser = await auth.updateUser(userId, {
      password: input.password,
      displayName: input.displayName.trim(),
      emailVerified: true,
    });
  }
  await linkFirebaseIdentityToExistingUser(admin, {
    userProfileId: userId,
    firebaseUid: firebaseUser.uid,
  });
  return firebaseUser.uid;
}

export async function completeAppSignup(
  admin: SupabaseClient,
  firebaseAuth: Auth,
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
  const firebaseUid = await ensureOwnedFirebaseIdentity(
    admin,
    firebaseAuth,
    userId,
    input,
  );
  const session = await createSupabaseSessionForUserId(admin, userId);
  await consumeVerificationGrants(admin, input);
  return {
    userId,
    firebaseUid,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  };
}
