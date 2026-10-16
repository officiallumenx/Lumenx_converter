import { createClient, type SupabaseClient, type Session } from "@supabase/supabase-js";
import {
  classifySupabaseRefreshFailure,
  isSessionRefreshSuccess,
  type SessionRefreshOutcome,
} from "@lumenx/auth";

let client: SupabaseClient | null = null;
let refreshInFlight: Promise<SessionRefreshOutcome> | null = null;
let cachedAccessToken: { token: string; expiresAtMs: number } | null = null;

const REFRESH_SKEW_MS = 60_000;
const SESSION_HYDRATE_WAITS_MS = [50, 150, 350] as const;
const AUTH_STORAGE_KEY = "lumenx.admissions.supabase.auth.v1";

export function getSupabaseBrowserConfig(): {
  url: string;
  anonKey: string;
} | null {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

export function getSupabaseBrowserClient(): SupabaseClient {
  if (client) return client;
  const cfg = getSupabaseBrowserConfig();
  if (!cfg) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for API auth mode.",
    );
  }
  client = createClient(cfg.url, cfg.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: AUTH_STORAGE_KEY,
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
    },
  });
  return client;
}

export function resetSupabaseBrowserClientForTests(): void {
  client = null;
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

async function readSupabaseSession(): Promise<Session | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session ?? null;
}

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

  let session = await readSupabaseSession();
  if (!session?.access_token) {
    for (const waitMs of SESSION_HYDRATE_WAITS_MS) {
      await sleep(waitMs);
      session = await readSupabaseSession();
      if (session?.access_token) break;
    }
  }
  if (!session?.access_token) {
    const outcome = await tryRefreshSupabaseSession();
    if (isSessionRefreshSuccess(outcome)) session = await readSupabaseSession();
  }
  if (!session?.access_token) {
    cachedAccessToken = null;
    return null;
  }

  const expiresAtMs = (session.expires_at ?? 0) * 1000;
  if (expiresAtMs && Date.now() >= expiresAtMs - REFRESH_SKEW_MS) {
    const outcome = await tryRefreshSupabaseSession();
    if (isSessionRefreshSuccess(outcome)) {
      session = (await readSupabaseSession()) ?? session;
    } else if (!expiresAtMs || expiresAtMs <= Date.now()) {
      cachedAccessToken = null;
      return null;
    }
  }
  return cacheToken(session);
}
