/**
 * Blocks accidental remote Auth/DB write scripts against a hosted Supabase
 * project unless the operator explicitly acknowledges the target ref.
 *
 * Staging mode (LUMENX_ENV=staging + STAGING_CONFIRMED) already fails closed
 * via assert-staging-env.mjs — this guard applies to the default backend/.env path.
 *
 * Required for hosted (*.supabase.co) targets:
 *   ALLOW_REMOTE_DB_WRITES=I_CONFIRM_REMOTE_DATABASE_WRITES
 *   REMOTE_WRITE_PROJECT_REF=<exact project ref from SUPABASE_URL>
 *
 * Never prints secrets or full URLs with query strings.
 */

import { extractSupabaseProjectRef } from "./assert-staging-env.mjs";

export const REMOTE_WRITE_ACK_PHRASE = "I_CONFIRM_REMOTE_DATABASE_WRITES";

export function looksLikeHostedSupabaseUrl(url) {
  if (!url?.trim()) return false;
  try {
    const host = new URL(url.trim()).hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) {
      return false;
    }
    return (
      host.includes("supabase.co") ||
      host.includes("supabase.in") ||
      host.includes("supabase.com")
    );
  } catch {
    return false;
  }
}

/**
 * @param {Record<string, string | undefined>} [raw]
 * @param {{ purpose?: string }} [opts]
 */
export function assertRemoteWriteAck(raw = process.env, opts = {}) {
  const purpose = opts.purpose?.trim() || "remote write script";
  const lumenxEnv = (raw.LUMENX_ENV ?? "").trim().toLowerCase();
  // Staging already requires STAGING_CONFIRMED + matching ref.
  if (lumenxEnv === "staging") return;

  const url = (raw.SUPABASE_URL ?? "").trim();
  if (!looksLikeHostedSupabaseUrl(url)) return;

  const issues = [];
  if ((raw.ALLOW_REMOTE_DB_WRITES ?? "").trim() !== REMOTE_WRITE_ACK_PHRASE) {
    issues.push(
      `Set ALLOW_REMOTE_DB_WRITES=${REMOTE_WRITE_ACK_PHRASE} in the shell for this run only`,
    );
  }

  const expectedRef = (raw.REMOTE_WRITE_PROJECT_REF ?? "").trim();
  const actualRef = extractSupabaseProjectRef(url);
  if (!expectedRef) {
    issues.push(
      "Set REMOTE_WRITE_PROJECT_REF to the exact Supabase project ref you intend to modify",
    );
  } else if (!actualRef) {
    issues.push("SUPABASE_URL must be https://<project-ref>.supabase.co");
  } else if (expectedRef !== actualRef) {
    issues.push(
      `REMOTE_WRITE_PROJECT_REF (${expectedRef}) does not match SUPABASE_URL project ref (${actualRef})`,
    );
  }

  if (issues.length) {
    throw new Error(
      `Refusing ${purpose} against hosted Supabase:\n${issues
        .map((i) => `  - ${i}`)
        .join("\n")}\nSee backend/DEV_SAFETY.md.`,
    );
  }
}
