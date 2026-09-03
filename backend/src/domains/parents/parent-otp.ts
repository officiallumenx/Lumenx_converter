import { randomInt } from "node:crypto";
import { normalizeParentPhoneDigits } from "./portal-auth-email.js";
import { isOtpDemoMode } from "../otp-delivery/index.js";

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 30 * 1000;

/** Fixed demo OTP for local/dev when delivery mode is demo. */
export const PARENT_LOGIN_DEMO_OTP = "123456";

type OtpChallenge = {
  otp: string;
  expiresAt: number;
  parentId: string;
  instituteId: string;
  phone: string;
  lastSentAt: number;
};

const challenges = new Map<string, OtpChallenge>();

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

export function storeParentLoginOtp(input: StoreParentOtpInput): StoreParentOtpResult {
  const phone = normalizeParentPhoneDigits(input.phone);
  const key = challengeKey(input.instituteId, phone);
  const now = Date.now();
  const existing = challenges.get(key);
  const demo = isOtpDemoMode();

  if (existing && now - existing.lastSentAt < OTP_RESEND_COOLDOWN_MS) {
    return {
      maskedPhone: maskParentPhone(phone),
      otp: existing.otp,
      shouldDeliver: false,
      devOtp: demo ? existing.otp : undefined,
    };
  }

  const otp = generateOtpCode();
  challenges.set(key, {
    otp,
    expiresAt: now + OTP_TTL_MS,
    parentId: input.parentId,
    instituteId: input.instituteId.trim(),
    phone,
    lastSentAt: now,
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

export function verifyStoredParentLoginOtp(
  input: VerifyParentOtpInput,
): VerifiedParentOtp | null {
  const phone = normalizeParentPhoneDigits(input.phone);
  const key = challengeKey(input.instituteId, phone);
  const challenge = challenges.get(key);
  if (!challenge) return null;

  if (Date.now() > challenge.expiresAt) {
    challenges.delete(key);
    return null;
  }

  if (challenge.otp !== input.otp.trim()) {
    return null;
  }

  challenges.delete(key);
  return {
    parentId: challenge.parentId,
    instituteId: challenge.instituteId,
    phone: challenge.phone,
  };
}

/** Test helper */
export function clearParentLoginOtpStore(): void {
  challenges.clear();
}
