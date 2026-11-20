import { AppError } from "../errors/app-error.js";
import type { Actor, ActorMembership } from "../auth/types.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate institute id shape only (no membership check).
 * Used by Careers open-market reads/applies for authenticated job seekers.
 */
export function parseInstituteId(candidate: string | undefined | null): string {
  if (!candidate?.trim()) {
    throw AppError.validation("institute_id is required");
  }
  const instituteId = candidate.trim();
  if (!UUID_RE.test(instituteId)) {
    throw AppError.validation("institute_id must be a valid UUID");
  }
  return instituteId;
}

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
