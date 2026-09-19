import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";

export type AuthVerificationGrantPurpose =
  | "signup_verify"
  | "nexus_login"
  | "staff_login"
  | "password_reset"
  | "pin_reset";

function hashGrant(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

export async function issueAuthVerificationGrant(
  admin: SupabaseClient,
  input: {
    purpose: AuthVerificationGrantPurpose;
    subjectId: string;
    destination?: string | null;
    metadata?: Record<string, unknown>;
    ttlMs?: number;
  },
): Promise<{ grant: string; expiresAt: string }> {
  const grant = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + (input.ttlMs ?? 10 * 60 * 1000)).toISOString();
  const inserted = await admin.from("auth_verification_grant").insert({
    token_hash: hashGrant(grant),
    purpose: input.purpose,
    subject_id: input.subjectId,
    destination: input.destination ?? null,
    metadata: input.metadata ?? {},
    expires_at: expiresAt,
  });
  if (inserted.error) {
    throw AppError.internal("Unable to issue authentication verification grant");
  }
  return { grant, expiresAt };
}

export async function consumeAuthVerificationGrant(
  admin: SupabaseClient,
  input: {
    purpose: AuthVerificationGrantPurpose;
    grant: string;
    subjectId: string;
    metadata?: Record<string, string>;
  },
): Promise<{ metadata: Record<string, unknown> }> {
  const token = input.grant.trim();
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    throw AppError.validation("Invalid or expired verification grant.");
  }
  const { data, error } = await admin.rpc("consume_auth_verification_grant", {
    p_token_hash: hashGrant(token),
    p_purpose: input.purpose,
    p_now: new Date().toISOString(),
  });
  const row = Array.isArray(data) ? data[0] : null;
  const metadata =
    row?.metadata && typeof row.metadata === "object"
      ? (row.metadata as Record<string, unknown>)
      : {};
  const metadataMatches = Object.entries(input.metadata ?? {}).every(
    ([key, value]) => metadata[key] === value,
  );
  if (error || !row || row.subject_id !== input.subjectId || !metadataMatches) {
    throw AppError.validation("Invalid or expired verification grant.");
  }
  return { metadata };
}
