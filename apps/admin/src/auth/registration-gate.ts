/**
 * Admin registration access gate — OTP → setup → Nexus approval (demo)
 * or GET /api/v1/registrations/me (API mode).
 */

import {
  findInstituteRegistrationByEmail,
  type InstituteRegistrationApplication,
} from "@lumenx/utils";
import { isApiAuthMode } from "./auth-mode";
import { approvedRegistrationNeedsActivation } from "./api-registration-activation";
import { getApiRegistrationView } from "./api-registration-state";
import { loadSession } from "./auth-store";
import { loadOtpPending } from "./otp-service";
import { isRegistrationSubmitted } from "./institute-setup-store";
import type { AuthUser } from "./types";

export type RegistrationGateKind =
  | "allow"
  | "loading"
  | "error"
  | "verify_email"
  | "verify_mobile"
  | "institute_setup"
  | "pending"
  | "rejected";

export type RegistrationGate = {
  kind: RegistrationGateKind;
  application: InstituteRegistrationApplication | null;
  errorMessage?: string;
};

function sessionActivated(user: AuthUser): boolean {
  if (user.isVerified) return true;
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

function resolveApiRegistrationGate(user: AuthUser | null): RegistrationGate {
  if (!user?.email) {
    return { kind: "allow", application: null };
  }

  const { boundUserId, snapshot, syncError, loaded, syncing } =
    getApiRegistrationView();

  if (boundUserId && boundUserId !== user.id) {
    return { kind: "loading", application: null };
  }

  if (!loaded || syncing || snapshot === undefined) {
    return { kind: "loading", application: null };
  }

  if (syncError && !snapshot) {
    return { kind: "error", application: null, errorMessage: syncError };
  }

  if (snapshot?.status === "pending") {
    return { kind: "pending", application: null };
  }
  if (snapshot?.status === "rejected") {
    return { kind: "rejected", application: null };
  }

  if (snapshot?.status === "approved") {
    if (approvedRegistrationNeedsActivation(user, snapshot)) {
      return { kind: "loading", application: null };
    }
    return { kind: "allow", application: null };
  }

  // No registration row (existing admin account).
  return { kind: "allow", application: null };
}

export function resolveRegistrationGate(user: AuthUser | null): RegistrationGate {
  if (isApiAuthMode()) {
    return resolveApiRegistrationGate(user);
  }

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
    case "error":
      return "/pending-verification";
    default:
      return null;
  }
}
