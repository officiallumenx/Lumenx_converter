/**
 * Gating for future real-integration Playwright specs.
 * Never writes. Never applies migrations. Skips unless every check passes.
 */

export type LiveGateResult = {
  ok: boolean;
  reasons: string[];
};

function truthy(v: string | undefined): boolean {
  const t = String(v ?? "")
    .trim()
    .toLowerCase();
  return t === "1" || t === "true" || t === "yes" || t === "on";
}

function looksHostedSupabase(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.endsWith(".supabase.co") && !host.includes("localhost");
  } catch {
    return false;
  }
}

function looksLocalApi(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      (u.hostname === "127.0.0.1" || u.hostname === "localhost") &&
      Boolean(u.port)
    );
  } catch {
    return false;
  }
}

/**
 * Require explicit opt-in + non-production target metadata.
 * Does not probe production schema/buckets (that needs a separate approved check).
 */
export function evaluateDocsCertsLiveGate(
  env: NodeJS.ProcessEnv = process.env,
): LiveGateResult {
  const reasons: string[] = [];

  if (!truthy(env.E2E_DOCS_CERTS_LIVE)) {
    reasons.push("E2E_DOCS_CERTS_LIVE is not enabled");
  }
  if (!truthy(env.E2E_DOCS_CERTS_ALLOW_WRITES)) {
    reasons.push("E2E_DOCS_CERTS_ALLOW_WRITES is not enabled");
  }
  if (!env.E2E_DOCS_CERTS_API_BASE_URL?.trim()) {
    reasons.push("E2E_DOCS_CERTS_API_BASE_URL is unset");
  } else if (!looksLocalApi(env.E2E_DOCS_CERTS_API_BASE_URL)) {
    reasons.push(
      "E2E_DOCS_CERTS_API_BASE_URL must be a local API host (127.0.0.1/localhost)",
    );
  }
  if (!env.E2E_DOCS_CERTS_SUPABASE_URL?.trim()) {
    reasons.push("E2E_DOCS_CERTS_SUPABASE_URL is unset");
  } else if (looksHostedSupabase(env.E2E_DOCS_CERTS_SUPABASE_URL)) {
    reasons.push(
      "E2E_DOCS_CERTS_SUPABASE_URL looks hosted/production — live writes are blocked",
    );
  }
  if (!env.E2E_NEXUS_OPERATOR_EMAIL?.trim()) {
    reasons.push("E2E_NEXUS_OPERATOR_EMAIL is unset");
  }
  if (!env.E2E_ADMIN_EMAIL?.trim()) {
    reasons.push("E2E_ADMIN_EMAIL is unset");
  }
  if (!env.E2E_TEST_INSTITUTE_ID?.trim()) {
    reasons.push("E2E_TEST_INSTITUTE_ID is unset");
  }
  if (!env.E2E_TEST_DATA_PREFIX?.trim()) {
    reasons.push("E2E_TEST_DATA_PREFIX is unset");
  }
  if (!truthy(env.E2E_CONFIRM_SCHEMA_READY)) {
    reasons.push(
      "E2E_CONFIRM_SCHEMA_READY is not set (PPTX migration + certificate-templates bucket must be confirmed separately)",
    );
  }
  if (!truthy(env.VITE_NEXUS_TEMPLATE_DB_CATALOG)) {
    reasons.push(
      "VITE_NEXUS_TEMPLATE_DB_CATALOG is not enabled for this test process (test-only dual-read)",
    );
  }

  return { ok: reasons.length === 0, reasons };
}

export function liveGateSkipMessage(result: LiveGateResult): string {
  return `SKIP live docs/certs integration: ${result.reasons.join("; ")}`;
}
