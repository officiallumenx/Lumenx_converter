import { createClient, type SupabaseClient, type Session } from "@supabase/supabase-js";
import {
  classifySupabaseRefreshFailure,
  isSessionRefreshSuccess,
  type SessionRefreshOutcome,
} from "@lumenx/auth";

let client: SupabaseClient | null = null;
let runtimeConfig: { url: string; anonKey: string } | null = null;
let refreshInFlight: Promise<SessionRefreshOutcome> | null = null;
let cachedAccessToken: { token: string; expiresAtMs: number } | null = null;

const AUTH_STORAGE_KEY = "lumenx.nexus.supabase.auth.v1";
const REFRESH_SKEW_MS = 60_000;

/** Strip CI paste noise (quotes / newlines) that breaks browser fetch headers. */
function sanitizeEnvValue(raw: string | undefined): string {
  return (raw ?? "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/[\r\n\t]/g, "")
    .trim();
}

export function getSupabaseBrowserConfig(): {
  url: string;
  anonKey: string;
} | null {
  if (runtimeConfig) return runtimeConfig;
  const url = sanitizeEnvValue(import.meta.env.VITE_SUPABASE_URL);
  const anonKey = sanitizeEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY);
  if (!url || !anonKey) return null;
  try {
    // Throws if CI baked an invalid URL (common cause of fetch "Invalid value").
    new URL(url);
  } catch {
    return null;
  }
  return { url, anonKey };
}

function createBrowserClient(cfg: { url: string; anonKey: string }): SupabaseClient {
  return createClient(cfg.url, cfg.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: AUTH_STORAGE_KEY,
    },
  });
}

export function getSupabaseBrowserClient(): SupabaseClient {
  if (client) return client;
  const cfg = getSupabaseBrowserConfig();
  if (!cfg) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for API auth mode.",
    );
  }
  client = createBrowserClient(cfg);
  return client;
}

/**
 * Prefer the API's current anon/publishable key (Railway) over a Vite-baked key.
 * Fixes production login when Cloudflare still has a rotated/unregistered key.
 */
export async function syncSupabaseBrowserClientFromApi(
  apiBaseUrl: string,
): Promise<SupabaseClient> {
  const base = apiBaseUrl.replace(/\/$/, "");
  const res = await fetch(`${base}/api/v1/health/supabase-public`, {
    headers: { Accept: "application/json" },
  });
  const json = (await res.json().catch(() => ({}))) as {
    data?: { url?: string; anonKey?: string };
    error?: { message?: string };
  };
  if (!res.ok || !json.data?.url || !json.data?.anonKey) {
    throw new Error(
      json.error?.message ||
        `Unable to load Supabase public config from API (${res.status}).`,
    );
  }
  const url = sanitizeEnvValue(json.data.url);
  const anonKey = sanitizeEnvValue(json.data.anonKey);
  try {
    new URL(url);
  } catch {
    throw new Error("API returned an invalid Supabase URL.");
  }
  if (!url || !anonKey) {
    throw new Error("API returned empty Supabase public config.");
  }
  runtimeConfig = { url, anonKey };
  client = createBrowserClient(runtimeConfig);
  return client;
}

export function resetSupabaseBrowserClientForTests(): void {
  client = null;
  runtimeConfig = null;
  refreshInFlight = null;
  cachedAccessToken = null;
}

function hasStoredRefreshToken(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { refresh_token?: unknown };
    return typeof parsed.refresh_token === "string" && parsed.refresh_token.length > 0;
  } catch {
    return false;
  }
}

function cacheToken(session: Session | null): string | null {
  const token = session?.access_token ?? null;
  if (!token) {
    cachedAccessToken = null;
    return null;
  }
  cachedAccessToken = {
    token,
    expiresAtMs: (session?.expires_at ?? 0) * 1000 || Date.now() + 55_000,
  };
  return token;
}

export async function tryRefreshSupabaseSession(): Promise<SessionRefreshOutcome> {
  if (!hasStoredRefreshToken()) return { kind: "unavailable" };
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { kind: "transient" };
  }
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.refreshSession();
      if (!error && data.session?.access_token) {
        cacheToken(data.session);
        return { kind: "refreshed" as const };
      }
      if (!error && !data.session) {
        return { kind: "invalid" as const };
      }
      if (error) {
        const classified = classifySupabaseRefreshFailure(error);
        if (classified === "transient") return { kind: "transient" as const };
        if (classified === "invalid") return { kind: "invalid" as const };
        return { kind: "unknown" as const };
      }
      return { kind: "unknown" as const };
    } catch (err) {
      const classified = classifySupabaseRefreshFailure(err);
      if (classified === "invalid") return { kind: "invalid" as const };
      if (classified === "transient") return { kind: "transient" as const };
      return { kind: "unknown" as const };
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

/**
 * Return a usable access JWT, refreshing when within the expiry skew window.
 * Background tabs can miss Supabase autoRefresh — callers must not permanently
 * cache an expired token.
 */
export async function getSupabaseAccessToken(): Promise<string | null> {
  if (
    cachedAccessToken &&
    Date.now() < cachedAccessToken.expiresAtMs - REFRESH_SKEW_MS
  ) {
    return cachedAccessToken.token;
  }

  if (!hasStoredRefreshToken()) {
    cachedAccessToken = null;
    return null;
  }

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  let session = data.session;
  if (!session?.access_token) return null;

  const expiresAtMs = (session.expires_at ?? 0) * 1000;
  if (expiresAtMs && Date.now() >= expiresAtMs - REFRESH_SKEW_MS) {
    const outcome = await tryRefreshSupabaseSession();
    if (isSessionRefreshSuccess(outcome)) {
      const refreshed = await supabase.auth.getSession();
      session = refreshed.data.session ?? session;
    } else if (!expiresAtMs || expiresAtMs <= Date.now()) {
      cachedAccessToken = null;
      return null;
    }
  }
  return cacheToken(session);
}
