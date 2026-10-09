import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
let refreshInFlight: Promise<boolean> | null = null;

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
      storageKey: "lumenx.transport.supabase.auth.v1",
      storage,
    },
  });
  return client;
}

export function resetSupabaseBrowserClientForTests(): void {
  client = null;
  refreshInFlight = null;
}

export async function tryRefreshSupabaseSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.refreshSession();
      return !error && Boolean(data.session?.access_token);
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export async function getSupabaseAccessToken(): Promise<string | null> {
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
      const ok = await withTimeout(tryRefreshSupabaseSession(), AUTH_CALL_TIMEOUT_MS).catch(
        () => false,
      );
      if (!ok) {
        return expiresAtMs > Date.now() ? session.access_token : null;
      }
      const refreshed = await withTimeout(
        supabase.auth.getSession(),
        AUTH_CALL_TIMEOUT_MS,
      ).catch(() => null);
      session = refreshed?.data.session ?? session;
    }
    return session.access_token ?? null;
  } catch {
    return null;
  }
}
