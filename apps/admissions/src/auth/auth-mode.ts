/**
 * Admissions auth mode — API-only product mode.
 * Demo Mode is no longer supported.
 *
 * Auth = Supabase. VITE_FIREBASE_* is for FCM / Analytics / Crashlytics only —
 * not interactive Auth. VITE_AUTH_PROVIDER always resolves to supabase.
 */

import {
  assertApiOnlyProductMode,
  normalizeAuthProvider,
  type LumenXAuthMode,
  type LumenXAuthProvider,
} from "@lumenx/auth";

export type AdmissionsAuthMode = LumenXAuthMode;
export type AdmissionsAuthProvider = LumenXAuthProvider;

function readModeRaw(): string | undefined {
  return typeof import.meta !== "undefined"
    ? import.meta.env?.VITE_ADMISSIONS_AUTH_MODE?.trim().toLowerCase()
    : undefined;
}

export function getAdmissionsAuthMode(): AdmissionsAuthMode {
  return assertApiOnlyProductMode(readModeRaw(), "Admissions");
}

export function getAdmissionsAuthProvider(): AdmissionsAuthProvider {
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
  // Product is API-only. Boot fails via getAdmissionsAuthMode() when mode=demo.
  return true;
}

/** @deprecated Demo Mode removed — always false. */
export function isDemoAuthMode(): boolean {
  return false;
}

export function assertProductionApiAuthMode(): void {
  getAdmissionsAuthMode();

  if (typeof import.meta === "undefined" || !import.meta.env?.PROD) return;

  const missing: string[] = [];
  if (!import.meta.env.VITE_SUPABASE_URL?.trim()) missing.push("VITE_SUPABASE_URL");
  if (!import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()) {
    missing.push("VITE_SUPABASE_ANON_KEY");
  }
  if (!import.meta.env.VITE_API_BASE_URL?.trim()) missing.push("VITE_API_BASE_URL");

  if (missing.length > 0) {
    throw new Error(`Production API auth is misconfigured. Set: ${missing.join(", ")}`);
  }
}
