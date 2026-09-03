import { randomInt } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeParentPhoneDigits } from "./portal-auth-email.js";
import { isOtpDemoMode } from "../otp-delivery/index.js";
import {
  deleteLoginOtpChallengesByPurpose,
  findLoginOtpChallenge,
  purgeExpiredLoginOtpChallengesBestEffort,
  upsertLoginOtpChallenge,
  verifyLoginOtpChallenge,
} from "../otp-delivery/challenge-repository.js";

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_RESEND_COOLDOWN_MS = 30 * 1000;

/** Fixed demo OTP for local/dev when delivery mode is demo. */
export const PARENT_LOGIN_DEMO_OTP = "123456";

const PURPOSE = "parent_login" as const;

function challengeKey(instituteId: string, phone: string): string {
  return `${instituteId.trim().toLowerCase()}:${normalizeParentPhoneDigits(phone)}`;
}

function generateOtpCode(): string {
  if (isOtpDemoMode()) {
    return PARENT_LOGIN_DEMO_OTP;
  }
  return String(randomInt(100000, 999999));
}

export function maskParentPhone(phone: string): string {
  const digits = normalizeParentPhoneDigits(phone);
  if (digits.length < 5) return phone;
  return `******${digits.slice(-4)}`;
}

export type StoreParentOtpInput = {
  instituteId: string;
  phone: string;
  parentId: string;
};

export type StoreParentOtpResult = {
  maskedPhone: string;
  /** Plain OTP for the delivery layer — never put in HTTP responses. */
  otp: string;
  /** True when a new/refreshed challenge must be delivered. */
  shouldDeliver: boolean;
  /** Present only in demo delivery mode for developer testing. */
  devOtp?: string;
};

export async function storeParentLoginOtp(
  admin: SupabaseClient,
  input: StoreParentOtpInput,
): Promise<StoreParentOtpResult> {
  await purgeExpiredLoginOtpChallengesBestEffort(admin);

  const phone = normalizeParentPhoneDigits(input.phone);
  const key = challengeKey(input.instituteId, phone);
  const now = Date.now();
  const demo = isOtpDemoMode();
  const existing = await findLoginOtpChallenge(admin, PURPOSE, key);

  if (existing) {
    const lastSentMs = Date.parse(existing.last_sent_at);
    if (
      Number.isFinite(lastSentMs) &&
      now - lastSentMs < OTP_RESEND_COOLDOWN_MS &&
      Date.parse(existing.expires_at) > now
    ) {
      const cooldownOtp = demo ? PARENT_LOGIN_DEMO_OTP : "";
      return {
        maskedPhone: maskParentPhone(phone),
        otp: cooldownOtp,
        shouldDeliver: false,
        devOtp: demo ? PARENT_LOGIN_DEMO_OTP : undefined,
      };
    }
  }

  const otp = generateOtpCode();
  await upsertLoginOtpChallenge(admin, {
    purpose: PURPOSE,
    instituteId: input.instituteId.trim(),
    challengeKey: key,
    channel: "sms",
    destination: phone,
    subjectId: input.parentId,
    otp,
    expiresAt: new Date(now + OTP_TTL_MS).toISOString(),
    lastSentAt: new Date(now).toISOString(),
  });

  return {
    maskedPhone: maskParentPhone(phone),
    otp,
    shouldDeliver: true,
    devOtp: demo ? otp : undefined,
  };
}

export type VerifyParentOtpInput = {
  instituteId: string;
  phone: string;
  otp: string;
};

export type VerifiedParentOtp = {
  parentId: string;
  instituteId: string;
  phone: string;
};

export async function verifyStoredParentLoginOtp(
  admin: SupabaseClient,
  input: VerifyParentOtpInput,
): Promise<VerifiedParentOtp | null> {
  const phone = normalizeParentPhoneDigits(input.phone);
  const key = challengeKey(input.instituteId, phone);
  const challenge = await verifyLoginOtpChallenge(admin, {
    purpose: PURPOSE,
    challengeKey: key,
    otp: input.otp,
  });
  if (!challenge) return null;

  return {
    parentId: challenge.subject_id,
    instituteId: challenge.institute_id,
    phone: challenge.destination,
  };
}

/** Test helper — clears durable parent OTP rows for the admin client. */
export async function clearParentLoginOtpStore(
  admin: SupabaseClient,
): Promise<void> {
  await deleteLoginOtpChallengesByPurpose(admin, PURPOSE);
}
