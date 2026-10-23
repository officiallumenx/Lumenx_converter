import { createAuthSessionClock } from "@lumenx/auth";
import { createApiClient, type AdminApiClient } from "@/lib/api";
import {
  getSupabaseAccessToken,
  tryRefreshSupabaseSession,
} from "@/lib/supabase-browser";
import { isApiAuthMode } from "@/auth/auth-mode";
import { enqueueOfflineOp, isOnline } from "@lumenx/utils";
import {
  ADMIN_OFFLINE_API_PAYLOAD_KIND,
  moduleLabelFromApiPath,
  opFromHttpMethod,
} from "@/lib/offline/admin-offline-payload";

let onUnauthorizedHandler: (() => void) | null = null;
let client: AdminApiClient | null = null;
const authSessionClock = createAuthSessionClock();

export function bumpAdminAuthSessionGeneration(): number {
  return authSessionClock.bump();
}

export function getAdminAuthSessionGeneration(): number {
  return authSessionClock.current();
}

export function setAdminApiUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorizedHandler = handler;
}

/** Production API origin used when Vite env is unset during a prod build. */
const PROD_API_BASE_URL = "https://api.lumenxtech.in";
const DEV_API_BASE_URL = "http://127.0.0.1:8787";

/**
 * Resolve the LumenX API base URL.
 * Prefer VITE_API_BASE_URL; never fall back to localhost in production builds.
 */
export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return (import.meta.env.PROD ? PROD_API_BASE_URL : DEV_API_BASE_URL).replace(
    /\/+$/,
    "",
  );
}

/**
 * Admin API client singleton.
 * In demo mode, getAccessToken always returns null so fake JWTs are never attached.
 * JSON writes that fail offline are stored in the offline sync outbox and flushed on reconnect.
 */
export function getAdminApiClient(): AdminApiClient {
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
    isOnline,
    queueOfflineWrite: ({ method, path, body }) => {
      const m = method.toUpperCase();
      enqueueOfflineOp({
        app: "admin",
        op: opFromHttpMethod(m),
        module: moduleLabelFromApiPath(path),
        label: `${m} ${path}`,
        payload: {
          kind: ADMIN_OFFLINE_API_PAYLOAD_KIND,
          method: m,
          path,
          body: body ?? null,
        },
      });
    },
  });
  return client;
}

/** Test helper */
export function resetAdminApiClientForTests(): void {
  client = null;
  onUnauthorizedHandler = null;
  authSessionClock.resetForTests();
}
