/**
 * Typed mirror of backend/scripts/assert-remote-write-ack.mjs for unit tests.
 * Keep behavior aligned with the script used by migration/preflight tooling.
 */

export const REMOTE_WRITE_ACK_PHRASE = "I_CONFIRM_REMOTE_DATABASE_WRITES";

function extractSupabaseProjectRef(supabaseUrl: string | undefined | null): string | null {
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

export function looksLikeHostedSupabaseUrl(url: string | undefined | null): boolean {
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

export function assertRemoteWriteAck(
  raw: Record<string, string | undefined> = process.env,
  opts: { purpose?: string } = {},
): void {
  const purpose = opts.purpose?.trim() || "remote write script";
  const lumenxEnv = (raw.LUMENX_ENV ?? "").trim().toLowerCase();
  if (lumenxEnv === "staging") return;

  const url = (raw.SUPABASE_URL ?? "").trim();
  if (!looksLikeHostedSupabaseUrl(url)) return;

  const issues: string[] = [];
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
