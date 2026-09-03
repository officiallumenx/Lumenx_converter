import { randomInt } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
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
export const STAFF_LOGIN_DEMO_OTP = "123456";

const PURPOSE = "staff_login" as const;

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

export async function storeStaffLoginOtp(
  admin: SupabaseClient,
  input: StoreStaffOtpInput,
): Promise<StoreStaffOtpResult> {
  await purgeExpiredLoginOtpChallengesBestEffort(admin);

  const key = challengeKey(input.instituteId, input.identifier);
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
      return {
        maskedDestination: maskStaffIdentifier(input.identifier, input.channel),
        channel: input.channel,
        otp: demo ? STAFF_LOGIN_DEMO_OTP : "",
        shouldDeliver: false,
        devOtp: demo ? STAFF_LOGIN_DEMO_OTP : undefined,
      };
    }
  }

  const otp = generateOtpCode();
  const destination =
    input.channel === "email"
      ? input.identifier.trim().toLowerCase()
      : input.identifier.replace(/\D/g, "").slice(-10);

  await upsertLoginOtpChallenge(admin, {
    purpose: PURPOSE,
    instituteId: input.instituteId.trim(),
    challengeKey: key,
    channel: input.channel,
    destination,
    subjectId: input.userId,
    otp,
    expiresAt: new Date(now + OTP_TTL_MS).toISOString(),
    lastSentAt: new Date(now).toISOString(),
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

export async function verifyStoredStaffLoginOtp(
  admin: SupabaseClient,
  input: VerifyStaffOtpInput,
): Promise<VerifiedStaffOtp | null> {
  const key = challengeKey(input.instituteId, input.identifier);
  const challenge = await verifyLoginOtpChallenge(admin, {
    purpose: PURPOSE,
    challengeKey: key,
    otp: input.otp,
  });
  if (!challenge) return null;

  return {
    userId: challenge.subject_id,
    instituteId: challenge.institute_id,
    identifier:
      challenge.challenge_key.split(":").slice(1).join(":") ||
      challenge.destination,
  };
}

/** Test helper — clears durable staff OTP rows for the admin client. */
export async function clearStaffLoginOtpStore(
  admin: SupabaseClient,
): Promise<void> {
  await deleteLoginOtpChallengesByPurpose(admin, PURPOSE);
}
