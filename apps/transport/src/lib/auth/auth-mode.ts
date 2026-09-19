/**
 * Transport auth mode — API-only product mode.
 * Demo Mode is no longer supported.
 * VITE_AUTH_PROVIDER=firebase|supabase (api mode).
 */

import {
  assertApiOnlyProductMode,
  normalizeAuthProvider,
  type LumenXAuthMode,
  type LumenXAuthProvider,
} from "@lumenx/auth";

export type TransportAuthMode = LumenXAuthMode;
export type TransportAuthProvider = LumenXAuthProvider;

function readModeRaw(): string | undefined {
  return typeof import.meta !== "undefined"
    ? import.meta.env?.VITE_TRANSPORT_AUTH_MODE?.trim().toLowerCase()
    : undefined;
}

export function getTransportAuthMode(): TransportAuthMode {
  return assertApiOnlyProductMode(readModeRaw(), "Transport");
}

export function getTransportAuthProvider(): TransportAuthProvider {
  const raw =
    typeof import.meta !== "undefined"
      ? import.meta.env?.VITE_AUTH_PROVIDER?.trim().toLowerCase()
      : undefined;
  return normalizeAuthProvider(raw);
}

export function isFirebaseAuthProvider(): boolean {
  return getTransportAuthProvider() === "firebase";
}

export function isApiAuthMode(): boolean {
  // Product is API-only. Boot fails via getTransportAuthMode() when mode=demo.
  return true;
}

/** @deprecated Demo Mode removed — always false. */
export function isDemoAuthMode(): boolean {
  return false;
}
