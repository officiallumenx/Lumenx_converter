import type { ApiAuthHydration } from "./api-auth";
import type { AuthUser } from "./types";
import { ensureApiRegistrationForUser } from "./api-registration-state";
import {
  activateApprovedApiRegistration,
  approvedRegistrationNeedsActivation,
} from "./api-registration-activation";

/**
 * Bootstrap/sign-in helper: hydrate registration snapshot and activate when approved.
 */
export async function finalizeApiAuthUser(
  hydrated: ApiAuthHydration,
): Promise<AuthUser> {
  const registration = await ensureApiRegistrationForUser(hydrated.user.id);
  if (
    registration?.status === "approved" &&
    registration.instituteId &&
    approvedRegistrationNeedsActivation(hydrated.user, registration)
  ) {
    const activated = await activateApprovedApiRegistration(registration);
    if (activated.ok) return activated.user;
  }
  return hydrated.user;
}
