/**
 * Connect auth mode — API-only product mode.
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

export type ConnectAuthMode = LumenXAuthMode;
export type ConnectAuthProvider = LumenXAuthProvider;

function readModeRaw(): string | undefined {
  return typeof import.meta !== "undefined"
    ? import.meta.env?.VITE_CONNECT_AUTH_MODE?.trim().toLowerCase()
    : undefined;
}

export function getConnectAuthMode(): ConnectAuthMode {
  return assertApiOnlyProductMode(readModeRaw(), "Connect");
}

export function getConnectAuthProvider(): ConnectAuthProvider {
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
  // Product is API-only. Boot fails via getConnectAuthMode()/assert when mode=demo.
  return true;
}

/** @deprecated Demo Mode removed — always false. */
export function isDemoAuthMode(): boolean {
  return false;
}
