import { randomInt } from "node:crypto";
import { isOtpDemoMode } from "../otp-delivery/index.js";

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 30 * 1000;

/** Fixed demo OTP for local/dev when delivery mode is demo. */
export const STAFF_LOGIN_DEMO_OTP = "123456";

type OtpChallenge = {
  otp: string;
  expiresAt: number;
  userId: string;
  instituteId: string;
  identifier: string;
  channel: "email" | "mobile";
  lastSentAt: number;
};

const challenges = new Map<string, OtpChallenge>();

function challengeKey(instituteId: string, identifier: string): string {
  return `${instituteId.trim().toLowerCase()}:${identifier.trim().toLowerCase()}`;
}

function generateOtpCode(): string {
  if (isOtpDemoMode()) {
    return STAFF_LOGIN_DEMO_OTP;
  }
  return String(randomInt(100000, 999999));
}

export function maskStaffIdentifier(identifier: string, channel: "email" | "mobile"): string {
  if (channel === "email") {
    const [local, domain] = identifier.split("@");
    if (!domain) return identifier;
    const visible = local.slice(0, 2);
    return `${visible}***@${domain}`;
  }
  const digits = identifier.replace(/\D/g, "");
  if (digits.length < 5) return identifier;
  return `******${digits.slice(-4)}`;
}

export type StoreStaffOtpInput = {
  instituteId: string;
  identifier: string;
  channel: "email" | "mobile";
  userId: string;
};

export type StoreStaffOtpResult = {
  maskedDestination: string;
  channel: "email" | "mobile";
  /** Plain OTP for the delivery layer — never put in HTTP responses. */
  otp: string;
  /** True when a new/refreshed challenge must be delivered. */
  shouldDeliver: boolean;
  /** Present only in demo delivery mode for developer testing. */
  devOtp?: string;
};

export function storeStaffLoginOtp(input: StoreStaffOtpInput): StoreStaffOtpResult {
  const key = challengeKey(input.instituteId, input.identifier);
  const now = Date.now();
  const existing = challenges.get(key);
  const demo = isOtpDemoMode();

  if (existing && now - existing.lastSentAt < OTP_RESEND_COOLDOWN_MS) {
    return {
      maskedDestination: maskStaffIdentifier(input.identifier, input.channel),
      channel: input.channel,
      otp: existing.otp,
      shouldDeliver: false,
      devOtp: demo ? existing.otp : undefined,
    };
  }

  const otp = generateOtpCode();
  challenges.set(key, {
    otp,
    expiresAt: now + OTP_TTL_MS,
    userId: input.userId,
    instituteId: input.instituteId.trim(),
    identifier: input.identifier.trim().toLowerCase(),
    channel: input.channel,
    lastSentAt: now,
  });

  return {
    maskedDestination: maskStaffIdentifier(input.identifier, input.channel),
    channel: input.channel,
    otp,
    shouldDeliver: true,
    devOtp: demo ? otp : undefined,
  };
}

export type VerifyStaffOtpInput = {
  instituteId: string;
  identifier: string;
  otp: string;
};

export type VerifiedStaffOtp = {
  userId: string;
  instituteId: string;
  identifier: string;
};

export function verifyStoredStaffLoginOtp(
  input: VerifyStaffOtpInput,
): VerifiedStaffOtp | null {
  const key = challengeKey(input.instituteId, input.identifier);
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
    userId: challenge.userId,
    instituteId: challenge.instituteId,
    identifier: challenge.identifier,
  };
}

/** Test helper */
export function clearStaffLoginOtpStore(): void {
  challenges.clear();
}
