import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabaseBrowserConfig(): {
  url: string;
  anonKey: string;
} | null {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

/**
 * Singleton browser Supabase client (anon key only).
 * Used for Auth session management — never service_role.
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
  // Prefer sessionStorage so refresh tokens do not survive tab close on shared devices.
  // Migrate any legacy localStorage session once, then drop it.
  if (typeof window !== "undefined") {
    try {
      const legacy = window.localStorage.getItem(storageKey);
      if (legacy && !window.sessionStorage.getItem(storageKey)) {
        window.sessionStorage.setItem(storageKey, legacy);
      }
      window.localStorage.removeItem(storageKey);
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
      storage: typeof window !== "undefined" ? window.sessionStorage : undefined,
    },
  });
  return client;
}

/** Test helper — reset singleton between tests. */
export function resetSupabaseBrowserClientForTests(): void {
  client = null;
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session?.access_token ?? null;
}
