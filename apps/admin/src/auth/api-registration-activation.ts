import { hydrateFromAccessToken, type ApiAuthHydration } from "./api-auth";
import { getSupabaseAccessToken } from "@/lib/supabase-browser";
import { selectActiveInstitute } from "@/lib/active-institute";
import { saveSession } from "./auth-store";
import type { AuthUser } from "./types";
import type { InstituteRegistrationDto } from "@/lib/registrations/types";

export type ApiActivationFailureReason =
  | "no_token"
  | "no_institute"
  | "no_membership"
  | "hydrate_failed";

export type ApiActivationResult =
  | { ok: true; user: AuthUser; activeInstituteId: string }
  | { ok: false; reason: ApiActivationFailureReason; message: string };

function activationFailure(
  reason: ApiActivationFailureReason,
  message: string,
): ApiActivationResult {
  return { ok: false, reason, message };
}

/** Whether an approved registration still needs /me membership binding on the session. */
export function approvedRegistrationNeedsActivation(
  user: AuthUser | null,
  registration: InstituteRegistrationDto | null | undefined,
): boolean {
  if (!user || !registration || registration.status !== "approved") {
    return false;
  }
  const instituteId = registration.instituteId;
  if (!instituteId) return false;
  return user.instituteId !== instituteId;
}

/**
 * After Nexus approves an API registration, re-hydrate /me and bind institute
 * membership so the applicant can enter Admin with real backend identity.
 * Never writes fake institute authority — membership must exist on /me.
 */
export async function activateApprovedApiRegistration(
  registration: InstituteRegistrationDto,
): Promise<ApiActivationResult> {
  const token = await getSupabaseAccessToken();
  if (!token) {
    return activationFailure("no_token", "Sign-in session expired.");
  }

  const instituteId = registration.instituteId;
  if (!instituteId) {
    return activationFailure(
      "no_institute",
      "Approved registration has no institute id.",
    );
  }

  let hydrated: ApiAuthHydration;
  try {
    hydrated = await hydrateFromAccessToken(token);
  } catch (err) {
    return activationFailure(
      "hydrate_failed",
      err instanceof Error ? err.message : "Unable to load account identity.",
    );
  }

  const hasMembership = hydrated.meInstitutes.some(
    (m) => m.instituteId === instituteId && m.status === "active",
  );
  if (!hasMembership) {
    return activationFailure(
      "no_membership",
      "Institute membership is not active yet. Try refreshing in a moment.",
    );
  }

  try {
    selectActiveInstitute(instituteId, hydrated.meInstitutes);
  } catch (err) {
    return activationFailure(
      "no_membership",
      err instanceof Error ? err.message : "Selected institute is not available.",
    );
  }

  try {
    hydrated = await hydrateFromAccessToken(token);
  } catch (err) {
    return activationFailure(
      "hydrate_failed",
      err instanceof Error ? err.message : "Unable to refresh institute context.",
    );
  }

  if (hydrated.activeInstituteId !== instituteId) {
    return activationFailure(
      "no_membership",
      "Could not bind the approved institute.",
    );
  }

  const next: AuthUser = {
    ...hydrated.user,
    instituteId: hydrated.activeInstituteId,
    isVerified: true,
  };

  saveSession(next, false, { authSource: "api" });
  return { ok: true, user: next, activeInstituteId: instituteId };
}
