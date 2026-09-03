/** Durable login OTP challenge persistence (Postgres). */

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";

export type LoginOtpPurpose = "parent_login" | "staff_login";
export type LoginOtpChannel = "sms" | "email" | "mobile";

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
  created_at: string;
  updated_at: string;
};

const COLS =
  "id, purpose, institute_id, challenge_key, channel, destination, subject_id, otp_hash, expires_at, last_sent_at, created_at, updated_at";

export function hashLoginOtp(
  purpose: LoginOtpPurpose,
  challengeKey: string,
  otp: string,
): string {
  return createHash("sha256")
    .update(`lumenx-otp|${purpose}|${challengeKey}|${otp.trim()}`)
    .digest("hex");
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
  return (result.data as LoginOtpChallengeRow | null) ?? null;
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

export async function upsertLoginOtpChallenge(
  admin: SupabaseClient,
  input: UpsertLoginOtpChallengeInput,
): Promise<LoginOtpChallengeRow> {
  const otpHash = hashLoginOtp(input.purpose, input.challengeKey, input.otp);
  const existing = await findLoginOtpChallenge(
    admin,
    input.purpose,
    input.challengeKey,
  );

  if (existing) {
    const result = await admin
      .from("login_otp_challenge")
      .update({
        institute_id: input.instituteId,
        channel: input.channel,
        destination: input.destination,
        subject_id: input.subjectId,
        otp_hash: otpHash,
        expires_at: input.expiresAt,
        last_sent_at: input.lastSentAt,
      })
      .eq("id", existing.id)
      .select(COLS)
      .maybeSingle();
    const row = ensureDbOk(result) as LoginOtpChallengeRow | null;
    if (!row) throw new Error("Failed to update login OTP challenge");
    return row;
  }

  const result = await admin
    .from("login_otp_challenge")
    .insert({
      purpose: input.purpose,
      institute_id: input.instituteId,
      challenge_key: input.challengeKey,
      channel: input.channel,
      destination: input.destination,
      subject_id: input.subjectId,
      otp_hash: otpHash,
      expires_at: input.expiresAt,
      last_sent_at: input.lastSentAt,
    })
    .select(COLS)
    .single();
  return ensureDbOk(result) as LoginOtpChallengeRow;
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
): Promise<void> {
  const result = await admin
    .from("login_otp_challenge")
    .delete()
    .lte("expires_at", nowIso);
  ensureDbOk(result);
}
