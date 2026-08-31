import { createApiClient, type NexusApiClient } from "@/lib/api";
import { getSupabaseAccessToken } from "@/lib/supabase-browser";
import { isNexusApiMode } from "@/lib/auth-mode";

let client: NexusApiClient | null = null;

export function getApiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787").trim();
}

export function getNexusApiClient(): NexusApiClient {
  if (client) return client;
  client = createApiClient({
    getBaseUrl: getApiBaseUrl,
    getAccessToken: async () => {
      if (!isNexusApiMode()) return null;
      return getSupabaseAccessToken();
    },
  });
  return client;
}

export function resetNexusApiClientForTests(): void {
  client = null;
}
