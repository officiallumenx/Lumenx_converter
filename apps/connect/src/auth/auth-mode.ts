/**
 * Connect auth mode — API-only product mode.
 * Demo Mode is no longer supported.
 * VITE_AUTH_PROVIDER=firebase|supabase selects interactive identity provider.
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
  return getConnectAuthProvider() === "firebase";
}

export function isApiAuthMode(): boolean {
  // Product is API-only. Boot fails via getConnectAuthMode()/assert when mode=demo.
  return true;
}

/** @deprecated Demo Mode removed — always false. */
export function isDemoAuthMode(): boolean {
  return false;
}
