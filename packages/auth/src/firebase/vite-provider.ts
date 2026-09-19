/**
 * Resolve VITE_AUTH_PROVIDER for app shells (API mode only).
 * Default: firebase. Set VITE_AUTH_PROVIDER=supabase for legacy rollback.
 * Never implies demo.
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

/** True when API mode and interactive auth should use Firebase. */
export function isFirebaseAuthProviderActive(appModeKey: string): boolean {
  const mode = readViteAuthMode(appModeKey);
  if (mode !== "api") return false;
  return readViteAuthProvider() === "firebase";
}

export function getViteApiBaseUrl(): string {
  return (readViteEnv("VITE_API_BASE_URL") ?? "http://127.0.0.1:8787").replace(
    /\/+$/,
    "",
  );
}
