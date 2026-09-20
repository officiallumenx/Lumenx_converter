/**
 * Resolve VITE auth mode for app shells (API mode only).
 * Interactive Auth is always Supabase. VITE_AUTH_PROVIDER is ignored.
 */

import {
  normalizeAuthMode,
  normalizeAuthProvider,
  type LumenXAuthMode,
  type LumenXAuthProvider,
} from "./auth-mode";

function readViteEnv(key: string): string | undefined {
  const env =
    typeof import.meta !== "undefined"
      ? (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
      : undefined;
  return env?.[key]?.trim();
}

export function readViteAuthMode(appModeKey: string): LumenXAuthMode {
  return normalizeAuthMode(readViteEnv(appModeKey));
}

export function readViteAuthProvider(): LumenXAuthProvider {
  return normalizeAuthProvider(readViteEnv("VITE_AUTH_PROVIDER"));
}

/** Always false — Firebase Auth interactive login removed. */
export function isFirebaseAuthProviderActive(_appModeKey: string): boolean {
  return false;
}

export function getViteApiBaseUrl(): string {
  return (readViteEnv("VITE_API_BASE_URL") ?? "http://127.0.0.1:8787").replace(
    /\/+$/,
    "",
  );
}
