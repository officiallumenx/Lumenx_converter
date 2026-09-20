/**
 * Admin auth mode — API-only product mode.
 * Demo Mode is no longer supported.
 *
 * VITE_ADMIN_AUTH_MODE may still be set in env for compatibility, but only
 * "api" (or unset) is accepted. "demo" fails at boot.
 *
 * Auth = Supabase (password + server OTP). VITE_FIREBASE_* is for FCM /
 * Analytics / Crashlytics only — not interactive Auth.
 * VITE_AUTH_PROVIDER always resolves to supabase.
 */

import {
  assertApiOnlyProductMode,
  normalizeAuthProvider,
  type LumenXAuthMode,
  type LumenXAuthProvider,
} from "@lumenx/auth";

export type AdminAuthMode = LumenXAuthMode;
export type AdminAuthProvider = LumenXAuthProvider;

function readModeRaw(): string | undefined {
  return typeof import.meta !== "undefined"
    ? import.meta.env?.VITE_ADMIN_AUTH_MODE?.trim().toLowerCase()
    : undefined;
}

export function getAdminAuthMode(): AdminAuthMode {
  return assertApiOnlyProductMode(readModeRaw(), "Admin");
}

export function getAdminAuthProvider(): AdminAuthProvider {
  const raw =
    typeof import.meta !== "undefined"
      ? import.meta.env?.VITE_AUTH_PROVIDER?.trim().toLowerCase()
      : undefined;
  return normalizeAuthProvider(raw);
}

export function isFirebaseAuthProvider(): boolean {
  // Auth is Supabase-only; Firebase web config is FCM / Analytics / Crashlytics.
  return false;
}

export function isApiAuthMode(): boolean {
  // Product is API-only. Do not re-read env here — boot uses getAdminAuthMode()/assertProductionApiAuthMode.
  return true;
}

/** @deprecated Demo Mode removed — always false. */
export function isDemoAuthMode(): boolean {
  return false;
}

/**
 * Production and local product shells must use API auth with backend configured.
 * Throws at runtime so misconfigured deploys / local demo env fail fast.
 */
export function assertProductionApiAuthMode(): void {
  getAdminAuthMode();

  if (typeof import.meta === "undefined" || !import.meta.env?.PROD) return;

  const missing: string[] = [];
  if (!import.meta.env.VITE_SUPABASE_URL?.trim()) missing.push("VITE_SUPABASE_URL");
  if (!import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()) {
    missing.push("VITE_SUPABASE_ANON_KEY");
  }
  if (!import.meta.env.VITE_API_BASE_URL?.trim()) missing.push("VITE_API_BASE_URL");

  if (missing.length > 0) {
    throw new Error(
      `Production API auth is misconfigured. Set: ${missing.join(", ")}`,
    );
  }
}
