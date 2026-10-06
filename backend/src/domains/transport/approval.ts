import type { Actor } from "../../auth/types.js";
import { AppError } from "../../errors/app-error.js";
import { assertInstituteRoles, requireInstituteId } from "../../authorization/index.js";
import { TRANSPORT_WRITE_ROLES } from "./service.js";

export type TransportApprovalStatus = "pending" | "approved" | "rejected";

/**
 * Daily operations treat pending the same as approved.
 * Rejected submissions remain unusable until fixed/resubmitted.
 * Approval columns stay for Admin review history — they must not block trips.
 */
export function isOperationallyUsable(
  approvalStatus: TransportApprovalStatus | string | null | undefined,
): boolean {
  return approvalStatus === "pending" || approvalStatus === "approved";
}

export function isTransportWriter(actor: Actor, instituteId: string): boolean {
  try {
    requireInstituteId(actor, instituteId);
    assertInstituteRoles(actor, instituteId, [...TRANSPORT_WRITE_ROLES]);
    return true;
  } catch {
    return false;
  }
}

export function isDriverForInstitute(actor: Actor, instituteId: string): boolean {
  const membership = actor.memberships.find((m) => m.instituteId === instituteId);
  return membership?.roles.includes("driver") ?? false;
}

export function approvalStatusForCreate(actor: Actor, instituteId: string): TransportApprovalStatus {
  return isTransportWriter(actor, instituteId) ? "approved" : "pending";
}

export function assertCanReview(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  assertInstituteRoles(actor, instituteId, [...TRANSPORT_WRITE_ROLES]);
}

export function assertCanDeleteRejected(
  actor: Actor,
  instituteId: string,
  submittedByUserId: string | null,
  approvalStatus: TransportApprovalStatus,
): void {
  if (approvalStatus !== "rejected") {
    throw AppError.conflict("Only rejected submissions can be deleted by submitter");
  }
  if (isTransportWriter(actor, instituteId)) return;
  if (submittedByUserId === actor.userId) return;
  throw AppError.forbidden("Insufficient permissions");
}

export function assertPendingForReview(approvalStatus: TransportApprovalStatus): void {
  if (approvalStatus !== "pending") {
    throw AppError.conflict("Submission is not pending review");
  }
}
