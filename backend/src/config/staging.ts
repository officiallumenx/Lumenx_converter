/**
 * Staging fail-closed checks so a laptop never points the API or smokes
 * at production Supabase by accident.
 *
 * Active only when LUMENX_ENV=staging (set via backend/.env.staging or
 * `node --env-file=.env.staging`).
 */

export type StagingEnvIssue = {
  code: string;
  message: string;
};

/** Phrase operators must copy verbatim into STAGING_CONFIRMED. */
export const STAGING_CONFIRMATION_PHRASE =
  "I_CONFIRM_THIS_IS_NON_PRODUCTION" as const;

/** Extract `<ref>` from `https://<ref>.supabase.co` (or similar). */
export function extractSupabaseProjectRef(
  supabaseUrl: string | undefined,
): string | null {
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

export function collectStagingEnvIssues(
  raw: Record<string, string | undefined>,
): StagingEnvIssue[] {
  const lumenxEnv = (raw.LUMENX_ENV ?? "").trim().toLowerCase();
  if (lumenxEnv !== "staging") return [];

  const issues: StagingEnvIssue[] = [];

  const confirmed = (raw.STAGING_CONFIRMED ?? "").trim();
  if (confirmed !== STAGING_CONFIRMATION_PHRASE) {
    issues.push({
      code: "STAGING_CONFIRMED",
      message: `Set STAGING_CONFIRMED=${STAGING_CONFIRMATION_PHRASE} only after an owner verifies this Supabase project is non-production`,
    });
  }

  const expectedRef = (raw.STAGING_SUPABASE_PROJECT_REF ?? "").trim();
  if (!expectedRef) {
    issues.push({
      code: "STAGING_SUPABASE_PROJECT_REF",
      message:
        "STAGING_SUPABASE_PROJECT_REF is required when LUMENX_ENV=staging (Supabase project ref only, not the full URL)",
    });
  }

  const url = (raw.SUPABASE_URL ?? "").trim();
  if (!url) {
    issues.push({
      code: "SUPABASE_URL",
      message: "SUPABASE_URL is required when LUMENX_ENV=staging",
    });
  }

  const actualRef = extractSupabaseProjectRef(url);
  if (url && !actualRef) {
    issues.push({
      code: "SUPABASE_URL",
      message:
        "SUPABASE_URL must be a https://<project-ref>.supabase.co URL so the staging ref can be verified",
    });
  }

  if (expectedRef && actualRef && expectedRef !== actualRef) {
    issues.push({
      code: "STAGING_SUPABASE_PROJECT_REF_MISMATCH",
      message:
        "STAGING_SUPABASE_PROJECT_REF does not match the project ref in SUPABASE_URL — refusing to start",
    });
  }

  const denylist = (raw.PRODUCTION_SUPABASE_PROJECT_REF_DENYLIST ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (actualRef && denylist.includes(actualRef)) {
    issues.push({
      code: "PRODUCTION_SUPABASE_PROJECT_REF_DENYLIST",
      message:
        "SUPABASE_URL project ref is listed in PRODUCTION_SUPABASE_PROJECT_REF_DENYLIST — refusing to treat it as staging",
    });
  }

  if (!(raw.SUPABASE_ANON_KEY ?? "").trim()) {
    issues.push({
      code: "SUPABASE_ANON_KEY",
      message: "SUPABASE_ANON_KEY is required when LUMENX_ENV=staging",
    });
  }
  if (!(raw.SUPABASE_SERVICE_ROLE_KEY ?? "").trim()) {
    issues.push({
      code: "SUPABASE_SERVICE_ROLE_KEY",
      message: "SUPABASE_SERVICE_ROLE_KEY is required when LUMENX_ENV=staging",
    });
  }

  return issues;
}

/** Throws when LUMENX_ENV=staging and staging safety checks fail. */
export function assertStagingEnv(
  raw: Record<string, string | undefined> = process.env as Record<
    string,
    string | undefined
  >,
): void {
  const issues = collectStagingEnvIssues(raw);
  if (issues.length === 0) return;
  const body = issues.map((i) => `  [${i.code}] ${i.message}`).join("\n");
  throw new Error(
    `Staging environment refused to start:\n${body}\nSee backend/STAGING.md.`,
  );
}
