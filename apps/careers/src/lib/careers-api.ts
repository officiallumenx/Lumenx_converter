import { createAuthSessionClock } from "@lumenx/auth";
import { createApiClient, type CareersApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import {
  getSupabaseAccessToken,
  tryRefreshSupabaseSession,
} from "@/lib/supabase-browser";

let onUnauthorizedHandler: (() => void) | null = null;
let client: CareersApiClient | null = null;
const authSessionClock = createAuthSessionClock();

export function bumpCareersAuthSessionGeneration(): number {
  return authSessionClock.bump();
}

export function getCareersAuthSessionGeneration(): number {
  return authSessionClock.current();
}

export function setCareersApiUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorizedHandler = handler;
}

export function getApiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787").trim();
}

export function getCareersApiClient(): CareersApiClient {
  if (client) return client;
  client = createApiClient({
    getBaseUrl: getApiBaseUrl,
    getAccessToken: async () => {
      if (!isApiAuthMode()) return null;
      return getSupabaseAccessToken();
    },
    tryRefreshSession: async () => {
      if (!isApiAuthMode()) return { kind: "unavailable" };
      return tryRefreshSupabaseSession();
    },
    getSessionGeneration: () => authSessionClock.current(),
    onUnauthorized: () => {
      onUnauthorizedHandler?.();
    },
  });
  return client;
}

export function resetCareersApiClientForTests(): void {
  client = null;
  onUnauthorizedHandler = null;
  authSessionClock.resetForTests();
}
