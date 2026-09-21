import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
let runtimeConfig: { url: string; anonKey: string } | null = null;

const AUTH_STORAGE_KEY = "lumenx.nexus.supabase.auth.v1";

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
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session?.access_token ?? null;
}
