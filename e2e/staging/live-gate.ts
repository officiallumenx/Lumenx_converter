/**
 * Gate for hosted staging Playwright. Never prints secrets.
 * Requires STAGING_E2E=1 plus backend/.env.staging identity checks.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const EXPECTED_REF = "yveadybpntziyryxsrsu";
const DENIED_REF = "kmpzflsurepjwqnfqyld";

export type StagingLiveGate = {
  ok: boolean;
  reasons: string[];
  projectRef: string | null;
  apiBaseUrl: string;
  adminBaseUrl: string;
  connectBaseUrl: string;
};

function parseEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

function extractRef(url: string | undefined): string | null {
  if (!url?.trim()) return null;
  try {
    const host = new URL(url.trim()).hostname.toLowerCase();
    const m = /^([a-z0-9-]+)\.supabase\.co$/.exec(host);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

export function evaluateStagingLiveGate(
  env: NodeJS.ProcessEnv = process.env,
): StagingLiveGate {
  const reasons: string[] = [];
  const stagingPath = resolve(process.cwd(), "backend/.env.staging");
  const fileEnv = parseEnvFile(stagingPath);
  const merged = { ...fileEnv, ...env };

  if ((merged.STAGING_E2E ?? env.STAGING_E2E ?? "").trim() !== "1") {
    reasons.push("STAGING_E2E=1 is required to run hosted staging browser E2E");
  }
  if ((merged.LUMENX_ENV ?? "").trim().toLowerCase() !== "staging") {
    reasons.push("LUMENX_ENV must be staging in backend/.env.staging");
  }
  if (
    (merged.STAGING_CONFIRMED ?? "").trim() !==
    "I_CONFIRM_THIS_IS_NON_PRODUCTION"
  ) {
    reasons.push("STAGING_CONFIRMED phrase missing/incorrect");
  }

  const projectRef = extractRef(merged.SUPABASE_URL);
  const expected = (merged.STAGING_SUPABASE_PROJECT_REF ?? "").trim();
  if (projectRef !== EXPECTED_REF) {
    reasons.push(`SUPABASE_URL ref must be ${EXPECTED_REF}`);
  }
  if (expected && expected !== EXPECTED_REF) {
    reasons.push(`STAGING_SUPABASE_PROJECT_REF must be ${EXPECTED_REF}`);
  }
  if (projectRef === DENIED_REF) {
    reasons.push("Refusing denylisted shared/default project");
  }
  const denylist = (merged.PRODUCTION_SUPABASE_PROJECT_REF_DENYLIST ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (projectRef && denylist.includes(projectRef)) {
    reasons.push("Staging ref is on PRODUCTION_SUPABASE_PROJECT_REF_DENYLIST");
  }
  if (!(merged.SUPABASE_ANON_KEY ?? "").trim()) {
    reasons.push("SUPABASE_ANON_KEY missing from staging env");
  }
  if (!(merged.E2E_SMOKE_PASSWORD ?? merged.NEXUS_BOOTSTRAP_PASSWORD ?? "").trim()) {
    reasons.push("E2E_SMOKE_PASSWORD (or NEXUS_BOOTSTRAP_PASSWORD) required");
  }

  return {
    ok: reasons.length === 0,
    reasons,
    projectRef,
    apiBaseUrl:
      (merged.E2E_API_BASE_URL ?? merged.SMOKE_API_BASE_URL ?? "").trim() ||
      "http://127.0.0.1:8787",
    adminBaseUrl: (merged.E2E_ADMIN_BASE_URL ?? "").trim() || "http://127.0.0.1:8081",
    connectBaseUrl:
      (merged.E2E_CONNECT_BASE_URL ?? "").trim() || "http://127.0.0.1:5174",
  };
}

export function stagingLiveGateSkipMessage(gate: StagingLiveGate): string {
  return `BLOCKED staging multi-role E2E: ${gate.reasons.join("; ")}`;
}
