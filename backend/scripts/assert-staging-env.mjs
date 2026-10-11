/**
 * Mirrors backend/src/config/staging.ts for plain Node smoke scripts.
 * Keep confirmation phrase and rules aligned with that module.
 */

export const STAGING_CONFIRMATION_PHRASE =
  "I_CONFIRM_THIS_IS_NON_PRODUCTION";

export function extractSupabaseProjectRef(supabaseUrl) {
  const raw = supabaseUrl?.trim();
  if (!raw) return null;
  try {
    const host = new URL(raw).hostname.toLowerCase();
    const m = /^([a-z0-9-]+)\.supabase\.co$/.exec(host);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

export function assertStagingEnv(raw = process.env) {
  const lumenxEnv = (raw.LUMENX_ENV ?? "").trim().toLowerCase();
  if (lumenxEnv !== "staging") return;

  const issues = [];
  if ((raw.STAGING_CONFIRMED ?? "").trim() !== STAGING_CONFIRMATION_PHRASE) {
    issues.push(
      `STAGING_CONFIRMED must be exactly ${STAGING_CONFIRMATION_PHRASE}`,
    );
  }
  const expectedRef = (raw.STAGING_SUPABASE_PROJECT_REF ?? "").trim();
  if (!expectedRef) {
    issues.push("STAGING_SUPABASE_PROJECT_REF is required");
  }
  const url = (raw.SUPABASE_URL ?? "").trim();
  const actualRef = extractSupabaseProjectRef(url);
  if (!url || !actualRef) {
    issues.push("SUPABASE_URL must be https://<ref>.supabase.co");
  }
  if (expectedRef && actualRef && expectedRef !== actualRef) {
    issues.push("STAGING_SUPABASE_PROJECT_REF does not match SUPABASE_URL");
  }
  const denylist = (raw.PRODUCTION_SUPABASE_PROJECT_REF_DENYLIST ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (actualRef && denylist.includes(actualRef)) {
    issues.push(
      "SUPABASE_URL ref is in PRODUCTION_SUPABASE_PROJECT_REF_DENYLIST",
    );
  }
  if (!(raw.SUPABASE_ANON_KEY ?? "").trim()) {
    issues.push("SUPABASE_ANON_KEY is required");
  }
  if (!(raw.SUPABASE_SERVICE_ROLE_KEY ?? "").trim()) {
    issues.push("SUPABASE_SERVICE_ROLE_KEY is required");
  }
  if (issues.length) {
    throw new Error(
      `Staging smoke refused:\n${issues.map((i) => `  - ${i}`).join("\n")}\nSee backend/STAGING.md.`,
    );
  }
}
