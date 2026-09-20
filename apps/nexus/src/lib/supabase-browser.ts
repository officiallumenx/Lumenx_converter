import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

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
      storageKey: "lumenx.nexus.supabase.auth.v1",
    },
  });
  return client;
}

export function resetSupabaseBrowserClientForTests(): void {
  client = null;
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session?.access_token ?? null;
}
