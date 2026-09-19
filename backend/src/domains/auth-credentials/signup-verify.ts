/**
 * Signup dual-OTP verification (Admin principal / Admissions / Careers).
 * Issues SMS + email codes before or after auth user creation.
 */

import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import { deliverLoginOtp } from "../otp-delivery/index.js";
import {
  assertValidPin,
  upsertUserAuthCredential,
} from "./repository.js";
import { storeWorkflowOtp, verifyWorkflowOtp } from "./workflow-otp.js";

function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, "").slice(-10);
}

/** Deterministic UUID from key (stable challenge subject before Auth user exists). */
function subjectUuidFromKey(key: string): string {
  const hash = createHash("sha256").update(`lumenx-signup|${key}`).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function requestSignupVerifyOtp(
  admin: SupabaseClient,
  input: {
    subjectKey: string;
    channel: "email" | "mobile";
    destination: string;
    instituteId?: string | null;
  },
) {
  const subjectId = input.subjectKey.trim().toLowerCase();
  if (subjectId.length < 3) {
    throw AppError.validation("subject_key is required");
  }
  const destination =
    input.channel === "email"
      ? input.destination.trim().toLowerCase()
      : normalizePhoneDigits(input.destination);
  if (input.channel === "email" && !destination.includes("@")) {
    throw AppError.validation("A valid email is required.", { destination: ["Invalid"] });
  }
  if (input.channel === "mobile" && destination.length !== 10) {
    throw AppError.validation("A valid 10-digit mobile is required.", {
      destination: ["Invalid"],
    });
  }

  const stored = await storeWorkflowOtp(admin, {
    purpose: "signup_verify",
    challengeKey: `signup:${input.channel}:${subjectId}`,
    instituteId: input.instituteId ?? null,
    channel: input.channel,
    destination,
    subjectId: subjectUuidFromKey(subjectId),
  });

  if (stored.shouldDeliver) {
    await deliverLoginOtp({
      channel: input.channel === "email" ? "email" : "sms",
      destination,
      otp: stored.otp,
      purpose: "signup_verify",
    });
  }

  return {
    maskedDestination: stored.maskedDestination,
    channel: input.channel,
    devOtp: stored.devOtp,
  };
}

export async function verifySignupChannelOtp(
  admin: SupabaseClient,
  input: { subjectKey: string; channel: "email" | "mobile"; otp: string },
) {
  const subjectId = input.subjectKey.trim().toLowerCase();
  const verified = await verifyWorkflowOtp(admin, {
    purpose: "signup_verify",
    challengeKey: `signup:${input.channel}:${subjectId}`,
    otp: input.otp,
  });
  if (!verified) {
    throw AppError.validation("Incorrect or expired code.");
  }
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const inserted = await admin.from("auth_verification_grant").insert({
    token_hash: tokenHash,
    purpose: "signup_verify",
    subject_id: verified.subjectId,
    destination: verified.destination,
    metadata: {
      channel: input.channel,
      subject_key: subjectId,
    },
    expires_at: expiresAt,
  });
  if (inserted.error) {
    throw AppError.internal("Unable to issue signup verification grant");
  }
  return {
    ok: true as const,
    channel: input.channel,
    grant: token,
    expiresAt,
  };
}

export async function bindSignupPinToUser(
  admin: SupabaseClient,
  input: { userId: string; pin: string; username?: string | null },
) {
  assertValidPin(input.pin);
  await upsertUserAuthCredential(admin, {
    userId: input.userId,
    pin: input.pin,
    username: input.username ?? undefined,
  });
  return { ok: true as const };
}
