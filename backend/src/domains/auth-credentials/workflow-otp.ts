/**
 * Shared channel OTP store for multi-purpose login / signup / recovery flows.
 */

import { randomInt } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isOtpDemoMode } from "../otp-delivery/index.js";
import {
  findLoginOtpChallenge,
  purgeExpiredLoginOtpChallengesBestEffort,
  upsertLoginOtpChallenge,
  verifyLoginOtpChallenge,
  type LoginOtpPurpose,
} from "../otp-delivery/challenge-repository.js";

export const WORKFLOW_OTP_TTL_MS = 5 * 60 * 1000;
export const WORKFLOW_OTP_RESEND_COOLDOWN_MS = 30 * 1000;
export const WORKFLOW_DEMO_OTP = "123456";

export type WorkflowOtpChannel = "email" | "mobile";

function generateOtpCode(): string {
  if (isOtpDemoMode()) return WORKFLOW_DEMO_OTP;
  return String(randomInt(100000, 999999));
}

export function maskWorkflowDestination(
  destination: string,
  channel: WorkflowOtpChannel,
): string {
  if (channel === "email") {
    const [local, domain] = destination.split("@");
    if (!domain) return destination;
    return `${local.slice(0, 2)}***@${domain}`;
  }
  const digits = destination.replace(/\D/g, "");
  if (digits.length < 5) return destination;
  return `******${digits.slice(-4)}`;
}

export type StoreWorkflowOtpInput = {
  purpose: LoginOtpPurpose;
  challengeKey: string;
  instituteId?: string | null;
  channel: WorkflowOtpChannel;
  destination: string;
  subjectId: string;
};

export type StoreWorkflowOtpResult = {
  maskedDestination: string;
  channel: WorkflowOtpChannel;
  otp: string;
  shouldDeliver: boolean;
  devOtp?: string;
};

export async function storeWorkflowOtp(
  admin: SupabaseClient,
  input: StoreWorkflowOtpInput,
): Promise<StoreWorkflowOtpResult> {
  await purgeExpiredLoginOtpChallengesBestEffort(admin);

  const key = input.challengeKey.trim().toLowerCase();
  const now = Date.now();
  const demo = isOtpDemoMode();
  const existing = await findLoginOtpChallenge(admin, input.purpose, key);

  if (existing) {
    const lastSentMs = Date.parse(existing.last_sent_at);
    if (
      Number.isFinite(lastSentMs) &&
      now - lastSentMs < WORKFLOW_OTP_RESEND_COOLDOWN_MS &&
      Date.parse(existing.expires_at) > now
    ) {
      return {
        maskedDestination: maskWorkflowDestination(input.destination, input.channel),
        channel: input.channel,
        otp: demo ? WORKFLOW_DEMO_OTP : "",
        shouldDeliver: false,
        devOtp: demo ? WORKFLOW_DEMO_OTP : undefined,
      };
    }
  }

  const otp = generateOtpCode();
  const destination =
    input.channel === "email"
      ? input.destination.trim().toLowerCase()
      : input.destination.replace(/\D/g, "").slice(-10);

  await upsertLoginOtpChallenge(admin, {
    purpose: input.purpose,
    instituteId: input.instituteId ?? null,
    challengeKey: key,
    channel: input.channel,
    destination,
    subjectId: input.subjectId,
    otp,
    expiresAt: new Date(now + WORKFLOW_OTP_TTL_MS).toISOString(),
    lastSentAt: new Date(now).toISOString(),
  });

  return {
    maskedDestination: maskWorkflowDestination(destination, input.channel),
    channel: input.channel,
    otp,
    shouldDeliver: true,
    devOtp: demo ? otp : undefined,
  };
}

export async function verifyWorkflowOtp(
  admin: SupabaseClient,
  input: {
    purpose: LoginOtpPurpose;
    challengeKey: string;
    otp: string;
  },
): Promise<{ subjectId: string; destination: string; channel: string } | null> {
  const challenge = await verifyLoginOtpChallenge(admin, {
    purpose: input.purpose,
    challengeKey: input.challengeKey.trim().toLowerCase(),
    otp: input.otp,
  });
  if (!challenge) return null;
  return {
    subjectId: challenge.subject_id,
    destination: challenge.destination,
    channel: challenge.channel,
  };
}
