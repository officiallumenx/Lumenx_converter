/**
 * Admissions auth mode — API-only product mode.
 * Demo Mode is no longer supported.
 * VITE_AUTH_PROVIDER=firebase|supabase (api mode).
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
  return getAdmissionsAuthProvider() === "firebase";
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
  if (getAdmissionsAuthProvider() === "firebase") {
    if (!import.meta.env.VITE_FIREBASE_API_KEY?.trim()) missing.push("VITE_FIREBASE_API_KEY");
    if (!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim()) {
      missing.push("VITE_FIREBASE_AUTH_DOMAIN");
    }
    if (!import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim()) {
      missing.push("VITE_FIREBASE_PROJECT_ID");
    }
    if (!import.meta.env.VITE_FIREBASE_APP_ID?.trim()) missing.push("VITE_FIREBASE_APP_ID");
  }

  if (missing.length > 0) {
    throw new Error(`Production API auth is misconfigured. Set: ${missing.join(", ")}`);
  }
}
