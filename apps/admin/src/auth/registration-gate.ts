/**
 * Admin registration access gate — OTP → setup → Nexus approval.
 */

import {
  findInstituteRegistrationByEmail,
  type InstituteRegistrationApplication,
} from "@lumenx/utils";
import { loadSession } from "./auth-store";
import { loadOtpPending } from "./otp-service";
import { isRegistrationSubmitted } from "./institute-setup-store";
import type { AuthUser } from "./types";

export type RegistrationGateKind =
  | "allow"
  | "verify_email"
  | "verify_mobile"
  | "institute_setup"
  | "pending"
  | "rejected";

export type RegistrationGate = {
  kind: RegistrationGateKind;
  application: InstituteRegistrationApplication | null;
};

function sessionActivated(user: AuthUser): boolean {
  if (user.isVerified) return true;
  // `patchAuthenticatedUser` writes session before React context re-renders —
  // treat a matching saved session as already activated.
  try {
    const session = loadSession();
    return (
      !!session &&
      session.isVerified === true &&
      (session.userId === user.id ||
        session.email.trim().toLowerCase() === user.email.trim().toLowerCase())
    );
  } catch {
    return false;
  }
}

/**
 * Resolve where a signed-in Admin user should be routed.
 * Demo seed users (isVerified + no application) keep dashboard access.
 *
 * After Nexus approval, `unlockIfApproved` sets `user.isVerified`. That session
 * flag must win over a briefly stale "pending" row in the shared store (cookie
 * lag / slim), otherwise PIN unlock appears to hang on a spinner or bounce
 * back to pending-verification.
 */
export function resolveRegistrationGate(user: AuthUser | null): RegistrationGate {
  if (!user?.email) {
    return { kind: "allow", application: null };
  }

  const application = findInstituteRegistrationByEmail(user.email);

  if (application?.status === "approved") {
    return { kind: "allow", application };
  }
  if (application?.status === "rejected") {
    return { kind: "rejected", application };
  }

  // Session already activated (Nexus approve patched the user) — allow even if
  // the shared registration row still reads pending for a poll cycle.
  if (sessionActivated(user)) {
    return { kind: "allow", application };
  }

  if (application?.status === "pending") {
    return { kind: "pending", application };
  }

  const otp = loadOtpPending();
  if (!otp?.emailVerified) {
    return { kind: "verify_email", application: null };
  }
  if (!otp.mobileVerified) {
    return { kind: "verify_mobile", application: null };
  }
  if (!isRegistrationSubmitted()) {
    return { kind: "institute_setup", application: null };
  }

  // Submitted locally but shared store missing — treat as pending
  return { kind: "pending", application: null };
}

export function registrationGatePath(kind: RegistrationGateKind): string | null {
  switch (kind) {
    case "verify_email":
      return "/verify-email-otp";
    case "verify_mobile":
      return "/verify-mobile-otp";
    case "institute_setup":
      return "/institute-setup";
    case "pending":
    case "rejected":
      return "/pending-verification";
    default:
      return null;
  }
}
