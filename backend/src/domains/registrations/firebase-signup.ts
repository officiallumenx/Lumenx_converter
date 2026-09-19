import type { SupabaseClient } from "@supabase/supabase-js";
import type { Auth, DecodedIdToken, UserRecord } from "firebase-admin/auth";
import { AppError } from "../../errors/app-error.js";
import { linkFirebaseIdentityToExistingUser } from "../firebase-identity/service.js";

const MAX_PHONE_AUTH_AGE_SECONDS = 5 * 60;
const MAX_CLOCK_SKEW_SECONDS = 60;

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string): string | null {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  if (trimmed.startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}

async function getUserByEmail(auth: Auth, email: string): Promise<UserRecord | null> {
  try {
    return await auth.getUserByEmail(email);
  } catch (error) {
    if ((error as { code?: string })?.code === "auth/user-not-found") return null;
    throw error;
  }
}

function assertFreshPhoneToken(
  decoded: DecodedIdToken,
  submittedPhone: string,
  nowSeconds: number,
): void {
  const provider = decoded.firebase?.sign_in_provider;
  if (provider !== "phone") {
    throw AppError.unauthenticated("A fresh Firebase phone verification is required");
  }

  const tokenPhone = normalizePhone(decoded.phone_number ?? "");
  const expectedPhone = normalizePhone(submittedPhone);
  if (!tokenPhone || !expectedPhone || tokenPhone !== expectedPhone) {
    throw AppError.validation(
      "Firebase phone verification does not match the submitted phone number",
    );
  }

  const authAge = nowSeconds - decoded.auth_time;
  if (
    !Number.isFinite(decoded.auth_time) ||
    authAge < -MAX_CLOCK_SKEW_SECONDS ||
    authAge > MAX_PHONE_AUTH_AGE_SECONDS
  ) {
    throw AppError.unauthenticated(
      "Firebase phone verification expired. Verify the phone number again.",
    );
  }
}

/**
 * Verifies a recent phone sign-in and prepares the same Firebase user for
 * email/password login. All identity values come from Admin-verified claims.
 */
export async function verifyFirebasePhoneSignup(
  auth: Auth,
  input: {
    idToken: string;
    phone: string;
    email: string;
    nowSeconds?: number;
  },
): Promise<{ firebaseUid: string }> {
  let decoded: DecodedIdToken;
  try {
    decoded = await auth.verifyIdToken(input.idToken.trim(), true);
  } catch {
    throw AppError.unauthenticated(
      "Firebase phone verification is invalid or expired. Verify again.",
    );
  }

  assertFreshPhoneToken(
    decoded,
    input.phone,
    input.nowSeconds ?? Math.floor(Date.now() / 1000),
  );

  const emailOwner = await getUserByEmail(auth, normalizeEmail(input.email));
  if (emailOwner && emailOwner.uid !== decoded.uid) {
    throw AppError.conflict(
      "This email is already attached to a different Firebase identity",
    );
  }
  return { firebaseUid: decoded.uid };
}

export async function completeFirebasePhoneSignup(
  admin: SupabaseClient,
  auth: Auth,
  input: {
    firebaseUid: string;
    applicantUserId: string;
    applicantName: string;
    email: string;
    password: string;
  },
): Promise<void> {
  // Link first so an unrelated existing profile cannot be overwritten.
  await linkFirebaseIdentityToExistingUser(admin, {
    userProfileId: input.applicantUserId,
    firebaseUid: input.firebaseUid,
  });
  await auth.updateUser(input.firebaseUid, {
    email: normalizeEmail(input.email),
    password: input.password,
    displayName: input.applicantName.trim(),
  });
}
