/**
 * Nexus auth mode — API-only product mode.
 * Demo Mode is no longer supported.
 * VITE_AUTH_PROVIDER=firebase|supabase selects interactive identity provider.
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
  return getNexusAuthProvider() === "firebase";
}

export function isNexusApiMode(): boolean {
  // Product is API-only. Boot fails via getNexusAuthMode() when mode=demo.
  return true;
}

/**
 * Operator login gate. Off by default — Nexus opens without signing in.
 * Set `VITE_NEXUS_REQUIRE_LOGIN=true` only when you want the real login flow.
 */
export function isNexusLoginRequired(): boolean {
  const raw =
    typeof import.meta !== "undefined"
      ? import.meta.env?.VITE_NEXUS_REQUIRE_LOGIN?.trim().toLowerCase()
      : undefined;
  // Default OFF so missing/misloaded env never traps users on /login.
  if (raw === "1" || raw === "true" || raw === "on" || raw === "yes") return true;
  return false;
}

/** @deprecated Demo Mode removed — always false. */
export function isNexusDemoMode(): boolean {
  return false;
}
