import { createApiClient, type AdminApiClient } from "@/lib/api";
import { getSupabaseAccessToken } from "@/lib/supabase-browser";
import { isApiAuthMode } from "@/auth/auth-mode";

let onUnauthorizedHandler: (() => void) | null = null;
let client: AdminApiClient | null = null;

export function setAdminApiUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorizedHandler = handler;
}

export function getApiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787").trim();
}

/**
 * Admin API client singleton.
 * In demo mode, getAccessToken always returns null so fake JWTs are never attached.
 */
export function getAdminApiClient(): AdminApiClient {
  if (client) return client;
  client = createApiClient({
    getBaseUrl: getApiBaseUrl,
    getAccessToken: async () => {
      if (!isApiAuthMode()) return null;
      return getSupabaseAccessToken();
    },
    onUnauthorized: () => {
      onUnauthorizedHandler?.();
    },
  });
  return client;
}

/** Test helper */
export function resetAdminApiClientForTests(): void {
  client = null;
  onUnauthorizedHandler = null;
}
