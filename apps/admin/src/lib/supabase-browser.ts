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

function hasStoredRefreshToken(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem("lumenx.admin.supabase.auth.v1");
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { refresh_token?: unknown };
    return typeof parsed.refresh_token === "string" && parsed.refresh_token.length > 0;
  } catch {
    return false;
  }
}

/** Refresh once (deduped) when access token is missing/expired. */
export async function tryRefreshSupabaseSession(): Promise<boolean> {
  // No refresh token ⇒ do not hit hosted Auth (avoids signed-out E2E hangs).
  if (!hasStoredRefreshToken()) return false;
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
 * Playwright safe journeys set `VITE_E2E_SAFE_AUTH=1` and optionally seed
 * `lumenx.admin.supabase.auth.v1`. In that mode we never call hosted Auth —
 * seeded token wins; missing seed means signed-out.
 */
function readE2eSafeAccessToken(): string | null | undefined {
  if (import.meta.env.VITE_E2E_SAFE_AUTH !== "1") return undefined;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("lumenx.admin.supabase.auth.v1");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      access_token?: unknown;
      expires_at?: unknown;
    };
    if (typeof parsed.access_token !== "string" || !parsed.access_token.trim()) {
      return null;
    }
    const expiresAtMs =
      typeof parsed.expires_at === "number" && Number.isFinite(parsed.expires_at)
        ? parsed.expires_at * 1000
        : Date.now() + 86_400_000;
    cachedAccessToken = {
      token: parsed.access_token,
      expiresAtMs,
    };
    return parsed.access_token;
  } catch {
    return null;
  }
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

  const e2eToken = readE2eSafeAccessToken();
  // `null` = safe-auth mode with no seed (signed-out). `undefined` = normal path.
  if (e2eToken === null) {
    cachedAccessToken = null;
    return null;
  }
  if (e2eToken) return e2eToken;

  // No persisted Supabase session ⇒ signed-out. Avoid getSession/refresh races
  // that can leave AuthGate stuck on "loading" during mocked browser journeys.
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
