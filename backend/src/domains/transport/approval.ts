import type { Actor } from "../../auth/types.js";
import { AppError } from "../../errors/app-error.js";
import { assertInstituteRoles, requireInstituteId } from "../../authorization/index.js";
import { TRANSPORT_WRITE_ROLES } from "./service.js";

export type TransportApprovalStatus = "pending" | "approved" | "rejected";

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
