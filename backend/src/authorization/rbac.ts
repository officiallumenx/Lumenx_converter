import { AppError } from "../errors/app-error.js";
import type { Actor } from "../auth/types.js";
import { assertInstituteAccess } from "./tenant.js";

export function assertPlatformOperator(actor: Actor): void {
  if (!actor.isPlatformOperator) {
    throw AppError.forbidden("Platform operator access required");
  }
}

/**
 * Require at least one of the given institute roles on an authorized membership.
 * Platform operators bypass institute role checks after institute targeting is allowed.
 */
export function assertInstituteRoles(
  actor: Actor,
  instituteId: string,
  roles: string[],
): void {
  const membership = assertInstituteAccess(actor, instituteId);
  if (membership === null) {
    // Platform operator targeting this institute.
    return;
  }

  const hasRole = roles.some((role) => membership.roles.includes(role));
  if (!hasRole) {
    throw AppError.forbidden("Insufficient institute role");
  }
}

export function actorHasInstituteRole(
  actor: Actor,
  instituteId: string,
  role: string,
): boolean {
  const membership = actor.memberships.find((m) => m.instituteId === instituteId);
  return Boolean(membership?.roles.includes(role));
}
