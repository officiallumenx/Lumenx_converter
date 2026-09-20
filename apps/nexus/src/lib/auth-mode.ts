/**
 * Nexus auth mode — API-only product mode.
 * Demo Mode is no longer supported.
 *
 * Auth = Supabase + server OTP. VITE_FIREBASE_* is for FCM / Analytics /
 * Crashlytics only — not interactive Auth.
 * VITE_AUTH_PROVIDER always resolves to supabase.
 */

import {
  assertApiOnlyProductMode,
  normalizeAuthProvider,
  type LumenXAuthMode,
  type LumenXAuthProvider,
} from "@lumenx/auth";

export type NexusAuthMode = LumenXAuthMode;
export type NexusAuthProvider = LumenXAuthProvider;

function readModeRaw(): string | undefined {
  return typeof import.meta !== "undefined"
    ? import.meta.env?.VITE_NEXUS_AUTH_MODE?.trim().toLowerCase()
    : undefined;
}

export function getNexusAuthMode(): NexusAuthMode {
  return assertApiOnlyProductMode(readModeRaw(), "Nexus");
}

export function getNexusAuthProvider(): NexusAuthProvider {
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

export function isNexusApiMode(): boolean {
  // Product is API-only. Boot fails via getNexusAuthMode() when mode=demo.
  return true;
}

/**
 * Operator login gate. On by default — Nexus requires /login.
 * Set `VITE_NEXUS_REQUIRE_LOGIN=false` only for local open-access (dev).
 */
export function isNexusLoginRequired(): boolean {
  const raw =
    typeof import.meta !== "undefined"
      ? import.meta.env?.VITE_NEXUS_REQUIRE_LOGIN?.trim().toLowerCase()
      : undefined;
  if (raw === "0" || raw === "false" || raw === "off" || raw === "no") return false;
  // Default ON so missing env still shows the login screen.
  return true;
}

/** @deprecated Demo Mode removed — always false. */
export function isNexusDemoMode(): boolean {
  return false;
}
