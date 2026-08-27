import type { AuthUser } from "./types";
import { isApiAuthMode } from "./auth-mode";

export type LoginAuthStrategy = "api" | "demo";

export function getLoginAuthStrategy(): LoginAuthStrategy {
  return isApiAuthMode() ? "api" : "demo";
}

/** API mode accepts email only (matches apiSignInWithPassword). */
export function requireApiLoginEmail(identifier: string): string {
  const trimmed = identifier.trim().toLowerCase();
  if (!trimmed.includes("@") || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error("API sign-in requires an email address (not mobile).");
  }
  return trimmed;
}

export function isDemoCompleteSignInAllowed(): boolean {
  return !isApiAuthMode();
}

/**
 * API-mode identity patch: keep /me-derived authority fields; allow presentation-only updates.
 */
export function mergeApiPresentationPatch(
  current: AuthUser,
  patch: AuthUser,
): AuthUser {
  return {
    ...current,
    name: patch.name,
    initials: patch.initials,
    email: patch.email,
    phone: patch.phone,
    mfaEnabled: patch.mfaEnabled,
    lastLoginAt: patch.lastLoginAt,
  };
}
