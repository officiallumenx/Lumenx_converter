import { createClient, type SupabaseClient, type Session } from "@supabase/supabase-js";
import {
  classifySupabaseRefreshFailure,
  isSessionRefreshSuccess,
  type SessionRefreshOutcome,
} from "@lumenx/auth";

let client: SupabaseClient | null = null;
let refreshInFlight: Promise<SessionRefreshOutcome> | null = null;
let cachedAccessToken: { token: string; expiresAtMs: number } | null = null;

const AUTH_STORAGE_KEY = "lumenx.transport.supabase.auth.v1";

const REFRESH_SKEW_MS = 60_000;
const AUTH_CALL_TIMEOUT_MS = 5_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Supabase auth call timed out")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export function getSupabaseBrowserConfig(): {
  url: string;
  anonKey: string;
} | null {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function getSupabaseBrowserClient(): SupabaseClient {
  if (client) return client;
  const cfg = getSupabaseBrowserConfig();
  if (!cfg) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for API auth mode.",
    );
  }
  let storage: Storage | undefined;
  if (typeof window !== "undefined") {
    try {
      storage = globalThis.localStorage ?? undefined;
    } catch {
      storage = undefined;
    }
  }
  client = createClient(cfg.url, cfg.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: AUTH_STORAGE_KEY,
      storage,
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
    const raw = window.localStorage?.getItem(AUTH_STORAGE_KEY);
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
  try {
    const { data, error } = await withTimeout(
      supabase.auth.getSession(),
      AUTH_CALL_TIMEOUT_MS,
    );
    if (error) return null;
    let session = data.session;
    if (!session?.access_token) return null;

    const expiresAtMs = (session.expires_at ?? 0) * 1000;
    if (expiresAtMs && Date.now() >= expiresAtMs - REFRESH_SKEW_MS) {
      const outcome = await withTimeout(tryRefreshSupabaseSession(), AUTH_CALL_TIMEOUT_MS).catch(
        (): SessionRefreshOutcome => ({ kind: "transient" }),
      );
      if (isSessionRefreshSuccess(outcome)) {
        const refreshed = await withTimeout(
          supabase.auth.getSession(),
          AUTH_CALL_TIMEOUT_MS,
        ).catch(() => null);
        session = refreshed?.data.session ?? session;
      } else if (!expiresAtMs || expiresAtMs <= Date.now()) {
        cachedAccessToken = null;
        return null;
      }
    }
    return cacheToken(session);
  } catch {
    return null;
  }
}
