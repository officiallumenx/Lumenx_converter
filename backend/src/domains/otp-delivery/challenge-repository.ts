/**
 * Durable login OTP challenge persistence (Postgres).
 * Phase 1 Step 2 — hashed OTP, atomic upsert, timing-safe verify, attempt cap.
 * Survives restarts and multi-instance deploys (no in-memory Map).
 */

import { createHash, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";

export type LoginOtpPurpose = "parent_login" | "staff_login";
export type LoginOtpChannel = "sms" | "email" | "mobile";

/** Failed verifies allowed before the challenge is destroyed. */
export const LOGIN_OTP_MAX_VERIFY_ATTEMPTS = 5;

export type LoginOtpChallengeRow = {
  id: string;
  purpose: LoginOtpPurpose;
  institute_id: string;
  challenge_key: string;
  channel: LoginOtpChannel;
  destination: string;
  subject_id: string;
  otp_hash: string;
  expires_at: string;
  last_sent_at: string;
  attempt_count: number;
  created_at: string;
  updated_at: string;
};

const COLS =
  "id, purpose, institute_id, challenge_key, channel, destination, subject_id, otp_hash, expires_at, last_sent_at, attempt_count, created_at, updated_at";

const UPSERT_ON_CONFLICT = "purpose,challenge_key";

export function hashLoginOtp(
  purpose: LoginOtpPurpose,
  challengeKey: string,
  otp: string,
): string {
  return createHash("sha256")
    .update(`lumenx-otp|${purpose}|${challengeKey}|${otp.trim()}`)
    .digest("hex");
}

/** Constant-time hex digest compare (rejects length mismatch safely). */
export function otpHashesEqual(a: string, b: string): boolean {
  try {
    const left = Buffer.from(a, "utf8");
    const right = Buffer.from(b, "utf8");
    if (left.length !== right.length) return false;
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

export async function findLoginOtpChallenge(
  admin: SupabaseClient,
  purpose: LoginOtpPurpose,
  challengeKey: string,
): Promise<LoginOtpChallengeRow | null> {
  const result = await admin
    .from("login_otp_challenge")
    .select(COLS)
    .eq("purpose", purpose)
    .eq("challenge_key", challengeKey)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  const row = result.data as LoginOtpChallengeRow | null;
  if (!row) return null;
  return {
    ...row,
    attempt_count: Number(row.attempt_count) || 0,
  };
}

export type UpsertLoginOtpChallengeInput = {
  purpose: LoginOtpPurpose;
  instituteId: string;
  challengeKey: string;
  channel: LoginOtpChannel;
  destination: string;
  subjectId: string;
  otp: string;
  expiresAt: string;
  lastSentAt: string;
};

/**
 * Atomic upsert on (purpose, challenge_key) — safe under concurrent API instances.
 * Resets attempt_count on every successful send/refresh.
 */
export async function upsertLoginOtpChallenge(
  admin: SupabaseClient,
  input: UpsertLoginOtpChallengeInput,
): Promise<LoginOtpChallengeRow> {
  const otpHash = hashLoginOtp(input.purpose, input.challengeKey, input.otp);
  const result = await admin
    .from("login_otp_challenge")
    .upsert(
      {
        purpose: input.purpose,
        institute_id: input.instituteId,
        challenge_key: input.challengeKey,
        channel: input.channel,
        destination: input.destination,
        subject_id: input.subjectId,
        otp_hash: otpHash,
        expires_at: input.expiresAt,
        last_sent_at: input.lastSentAt,
        attempt_count: 0,
      },
      { onConflict: UPSERT_ON_CONFLICT },
    )
    .select(COLS)
    .single();
  const row = ensureDbOk(result) as LoginOtpChallengeRow;
  return {
    ...row,
    attempt_count: Number(row.attempt_count) || 0,
  };
}

export async function deleteLoginOtpChallenge(
  admin: SupabaseClient,
  purpose: LoginOtpPurpose,
  challengeKey: string,
): Promise<void> {
  const result = await admin
    .from("login_otp_challenge")
    .delete()
    .eq("purpose", purpose)
    .eq("challenge_key", challengeKey);
  ensureDbOk(result);
}

export async function deleteLoginOtpChallengesByPurpose(
  admin: SupabaseClient,
  purpose: LoginOtpPurpose,
): Promise<void> {
  const result = await admin
    .from("login_otp_challenge")
    .delete()
    .eq("purpose", purpose);
  ensureDbOk(result);
}

export async function deleteExpiredLoginOtpChallenges(
  admin: SupabaseClient,
  nowIso: string = new Date().toISOString(),
): Promise<number> {
  const result = await admin
    .from("login_otp_challenge")
    .delete()
    .lte("expires_at", nowIso)
    .select("id");
  const rows = (ensureDbOk(result) as Array<{ id: string }> | null) ?? [];
  return rows.length;
}

async function bumpFailedAttempt(
  admin: SupabaseClient,
  row: LoginOtpChallengeRow,
): Promise<void> {
  const next = (Number(row.attempt_count) || 0) + 1;
  if (next >= LOGIN_OTP_MAX_VERIFY_ATTEMPTS) {
    await deleteLoginOtpChallenge(admin, row.purpose, row.challenge_key);
    return;
  }
  const result = await admin
    .from("login_otp_challenge")
    .update({ attempt_count: next })
    .eq("id", row.id)
    .select(COLS)
    .maybeSingle();
  ensureDbOk(result);
}

export type VerifyLoginOtpChallengeInput = {
  purpose: LoginOtpPurpose;
  challengeKey: string;
  otp: string;
  now?: Date;
};

/**
 * Verify hashed OTP. On success deletes the row.
 * Wrong OTP increments attempt_count; max attempts burn the challenge.
 * Expired rows are deleted and treated as miss.
 */
export async function verifyLoginOtpChallenge(
  admin: SupabaseClient,
  input: VerifyLoginOtpChallengeInput,
): Promise<LoginOtpChallengeRow | null> {
  const challenge = await findLoginOtpChallenge(
    admin,
    input.purpose,
    input.challengeKey,
  );
  if (!challenge) return null;

  const now = input.now ?? new Date();
  if (Date.parse(challenge.expires_at) <= now.getTime()) {
    await deleteLoginOtpChallenge(admin, input.purpose, input.challengeKey);
    return null;
  }

  const expected = hashLoginOtp(
    input.purpose,
    input.challengeKey,
    input.otp,
  );
  if (!otpHashesEqual(challenge.otp_hash, expected)) {
    await bumpFailedAttempt(admin, challenge);
    return null;
  }

  await deleteLoginOtpChallenge(admin, input.purpose, input.challengeKey);
  return challenge;
}

/** Best-effort purge of expired rows (call on store paths). */
export async function purgeExpiredLoginOtpChallengesBestEffort(
  admin: SupabaseClient,
): Promise<void> {
  try {
    await deleteExpiredLoginOtpChallenges(admin);
  } catch {
    // never block login on cleanup failure
  }
}
