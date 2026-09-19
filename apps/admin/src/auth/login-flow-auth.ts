import type { AuthUser } from "./types";

/** Product login strategy — API-only (demo removed). */
export type LoginAuthStrategy = "api";

export function getLoginAuthStrategy(): LoginAuthStrategy {
  return "api";
}

/** API mode accepts email only (matches apiSignInWithPassword). */
export function requireApiLoginEmail(identifier: string): string {
  const trimmed = identifier.trim().toLowerCase();
  if (!trimmed.includes("@") || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error("API sign-in requires an email address (not mobile).");
  }
  return trimmed;
}

/** @deprecated Demo completeSignIn removed — always false. */
export function isDemoCompleteSignInAllowed(): boolean {
  return false;
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
