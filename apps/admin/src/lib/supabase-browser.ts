import { createClient, type SupabaseClient, type Session } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
let refreshInFlight: Promise<boolean> | null = null;
let cachedAccessToken: { token: string; expiresAtMs: number } | null = null;

const REFRESH_SKEW_MS = 60_000;
const SESSION_HYDRATE_WAITS_MS = [50, 150, 350] as const;

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

/**
 * Singleton browser Supabase client (anon key only).
 * Used for Auth session management — never service_role.
 *
 * Persist in localStorage so Capacitor / reopen keeps the session until
 * explicit logout or app uninstall.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (client) return client;
  const cfg = getSupabaseBrowserConfig();
  if (!cfg) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for API auth mode.",
    );
  }
  const storageKey = "lumenx.admin.supabase.auth.v1";
  // Migrate any short-lived sessionStorage copy back to durable localStorage.
  if (typeof window !== "undefined") {
    try {
      const fromSession = window.sessionStorage.getItem(storageKey);
      if (fromSession && !window.localStorage.getItem(storageKey)) {
        window.localStorage.setItem(storageKey, fromSession);
      }
      window.sessionStorage.removeItem(storageKey);
    } catch {
      // ignore storage access errors (private mode / blocked)
    }
  }
  client = createClient(cfg.url, cfg.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey,
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
    },
  });
  return client;
}

/** Test helper — reset singleton between tests. */
export function resetSupabaseBrowserClientForTests(): void {
  client = null;
  refreshInFlight = null;
  cachedAccessToken = null;
}

/** Refresh once (deduped) when access token is missing/expired. */
export async function tryRefreshSupabaseSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.refreshSession();
      if (!error && data.session?.access_token) {
        cacheToken(data.session);
        return true;
      }
      return false;
    } catch {
      return false;
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

/**
 * Return a usable access JWT.
 * Capacitor / WebView can report no session for a few hundred ms after boot
 * even when localStorage already has a refresh token — wait and refresh
 * instead of failing every module with "Authentication required".
 */
export async function getSupabaseAccessToken(): Promise<string | null> {
  if (
    cachedAccessToken &&
    Date.now() < cachedAccessToken.expiresAtMs - REFRESH_SKEW_MS
  ) {
    return cachedAccessToken.token;
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
    const ok = await tryRefreshSupabaseSession();
    if (ok) session = await readSupabaseSession();
  }
  if (!session?.access_token) {
    cachedAccessToken = null;
    return null;
  }

  const expiresAtMs = (session.expires_at ?? 0) * 1000;
  if (expiresAtMs && Date.now() >= expiresAtMs - REFRESH_SKEW_MS) {
    const ok = await tryRefreshSupabaseSession();
    if (ok) {
      session = (await readSupabaseSession()) ?? session;
    } else if (!expiresAtMs || expiresAtMs <= Date.now()) {
      cachedAccessToken = null;
      return null;
    }
  }
  return cacheToken(session);
}
