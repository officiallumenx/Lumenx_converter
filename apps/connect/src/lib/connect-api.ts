import { createApiClient, type ConnectApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { getSupabaseAccessToken } from "@/lib/supabase-browser";

let onUnauthorizedHandler: (() => void) | null = null;
let client: ConnectApiClient | null = null;

export function setConnectApiUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorizedHandler = handler;
}

export function getApiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787").trim();
}

export function getConnectApiClient(): ConnectApiClient {
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

export function resetConnectApiClientForTests(): void {
  client = null;
  onUnauthorizedHandler = null;
}
