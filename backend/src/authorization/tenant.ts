import { AppError } from "../errors/app-error.js";
import type { Actor, ActorMembership } from "../auth/types.js";

/**
 * Ordinary users: institute must match an active membership.
 * Platform operators: may target any institute (explicit operator gate).
 */
export function assertInstituteAccess(
  actor: Actor,
  instituteId: string,
): ActorMembership | null {
  if (!instituteId) {
    throw AppError.validation("institute_id is required");
  }

  const membership = actor.memberships.find((m) => m.instituteId === instituteId);
  if (membership) {
    return membership;
  }

  if (actor.isPlatformOperator) {
    return null;
  }

  throw AppError.forbidden("Not a member of this institute");
}

/** Alias used by domain services. */
export const assertInstituteMember = assertInstituteAccess;

/**
 * Resolve institute for a request. Client-supplied id is never enough alone —
 * must pass assertInstituteAccess.
 */
export function requireInstituteId(
  actor: Actor,
  candidate: string | undefined | null,
): string {
  if (!candidate) {
    throw AppError.validation("institute_id is required");
  }
  assertInstituteAccess(actor, candidate);
  return candidate;
}
