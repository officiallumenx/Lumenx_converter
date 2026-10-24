/**
 * Pure AuthGate leave-registration decisions used by Admin root.
 * Extracted for regression tests (AuthGate race after Create Account).
 */

import type { RegistrationGateKind } from "./registration-gate";
import { registrationGatePath } from "./registration-gate";

const REGISTRATION_ONLY_PATHS = [
  "/signup",
  "/verify-email-otp",
  "/verify-mobile-otp",
  "/institute-setup",
  "/pending-verification",
] as const;

export type AuthGateNavInput = {
  isAuthenticated: boolean;
  pathname: string;
  gateKind: RegistrationGateKind;
  /** null when still loading auth */
  isVerified: boolean | null;
  unauthenticatedAllowed: boolean;
};

/**
 * Next replace target for AuthGate, or null to stay put.
 */
export function resolveAuthGateNavigateTo(input: AuthGateNavInput): string | null {
  const { isAuthenticated, pathname, gateKind, isVerified, unauthenticatedAllowed } =
    input;

  if (!isAuthenticated) {
    return unauthenticatedAllowed ? null : "/welcome";
  }

  if (gateKind === "loading") {
    return null;
  }

  if (gateKind !== "allow") {
    const redirect = registrationGatePath(gateKind);
    if (redirect && pathname !== redirect) return redirect;
    return null;
  }

  // Race guard: unverified + allow must not bounce signup → dashboard.
  if (pathname === "/signup" && isVerified === false) {
    return "/pending-verification";
  }

  if ((REGISTRATION_ONLY_PATHS as readonly string[]).includes(pathname)) {
    return "/";
  }

  return null;
}
