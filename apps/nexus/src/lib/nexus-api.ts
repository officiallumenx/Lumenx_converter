import { createAuthSessionClock } from "@lumenx/auth";
import { createApiClient, type NexusApiClient } from "@/lib/api";
import {
  getSupabaseAccessToken,
  tryRefreshSupabaseSession,
} from "@/lib/supabase-browser";
import { isNexusApiMode } from "@/lib/auth-mode";

let client: NexusApiClient | null = null;
let onUnauthorizedHandler: (() => void) | null = null;
let unauthorizedInFlight = false;
const authSessionClock = createAuthSessionClock();

export function bumpNexusAuthSessionGeneration(): number {
  return authSessionClock.bump();
}

export function getNexusAuthSessionGeneration(): number {
  return authSessionClock.current();
}

export function getApiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787").trim();
}

export function setNexusApiUnauthorizedHandler(
  handler: (() => void) | null,
): void {
  onUnauthorizedHandler = handler;
}

export function getNexusApiClient(): NexusApiClient {
  if (client) return client;
  client = createApiClient({
    getBaseUrl: getApiBaseUrl,
    getAccessToken: async () => {
      if (!isNexusApiMode()) return null;
      return getSupabaseAccessToken();
    },
    tryRefreshSession: async () => {
      if (!isNexusApiMode()) return { kind: "unavailable" };
      return tryRefreshSupabaseSession();
    },
    getSessionGeneration: () => authSessionClock.current(),
    onUnauthorized: () => {
      if (unauthorizedInFlight) return;
      unauthorizedInFlight = true;
      try {
        onUnauthorizedHandler?.();
      } finally {
        // Allow a later hard failure after a successful re-login.
        queueMicrotask(() => {
          unauthorizedInFlight = false;
        });
      }
    },
  });
  return client;
}

export function resetNexusApiClientForTests(): void {
  client = null;
  onUnauthorizedHandler = null;
  unauthorizedInFlight = false;
  authSessionClock.resetForTests();
}
