import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteRoles,
  requireInstituteId,
} from "../../authorization/index.js";
import { recordInstituteAuditForActor } from "../audit/service.js";
import { findStudentById, updateStudentFields } from "../students/repository.js";
import { listStudentFeesForInstitute } from "../fees/repository.js";
import {
  reviewEligibleOnFromGraduation,
  todayIsoDate,
} from "./dates.js";
import {
  findRetentionReviewById,
  findRetentionReviewByStudentId,
  insertRetentionReview,
  listRetentionReviews,
  listRetentionReviewsDueForEligibility,
  updateRetentionReviewFields,
} from "./repository.js";
import type {
  EnsureRetentionReviewInput,
  ListRetentionReviewsFilter,
  RetentionDecisionInput,
  StudentRetentionReviewDto,
  StudentRetentionReviewRow,
} from "./types.js";

const RETENTION_WRITE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
] as const;

const RETENTION_READ_ROLES = [
  ...RETENTION_WRITE_ROLES,
  "coordinator",
  "admissions_officer",
  "it_admin",
] as const;

function assertRetentionReader(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  if (actor.isPlatformOperator) return;
  assertInstituteRoles(actor, instituteId, [...RETENTION_READ_ROLES]);
}

function assertRetentionWriter(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  if (actor.isPlatformOperator) return;
  assertInstituteRoles(actor, instituteId, [...RETENTION_WRITE_ROLES]);
}

export function toRetentionReviewDto(
  row: StudentRetentionReviewRow,
  studentDisplayName?: string,
): StudentRetentionReviewDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    studentId: row.student_id,
    graduatingEnrollmentId: row.graduating_enrollment_id,
    graduatedOn: row.graduated_on,
    reviewEligibleOn: row.review_eligible_on,
    status: row.status,
    legalHold: row.legal_hold,
    extendedUntil: row.extended_until,
    lastReviewedAt: row.last_reviewed_at,
    lastReviewedByUserId: row.last_reviewed_by_user_id,
    lastDecision: row.last_decision,
    lastDecisionReason: row.last_decision_reason,
    studentDisplayName,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function statusForGraduationDate(
  graduatedOn: string | null,
): {
  status: StudentRetentionReviewRow["status"];
  reviewEligibleOn: string | null;
} {
  if (!graduatedOn) {
    return { status: "pending_graduation_date", reviewEligibleOn: null };
  }
  return {
    status: "active_retention",
    reviewEligibleOn: reviewEligibleOnFromGraduation(graduatedOn),
  };
}

/**
 * Idempotent upsert when a student graduates.
 * Never fabricates a graduation date — null → pending_graduation_date.
 */
export async function ensureRetentionReviewForGraduation(
  admin: SupabaseClient,
  actor: Actor,
  input: EnsureRetentionReviewInput,
): Promise<StudentRetentionReviewDto> {
  // Caller (graduation) already authorized a staff write; do not narrow roles here.
  const instituteId = requireInstituteId(actor, input.instituteId);

  const student = await findStudentById(admin, input.studentId);
  if (!student || student.institute_id !== instituteId) {
    throw AppError.notFound("Student not found");
  }

  const existing = await findRetentionReviewByStudentId(admin, input.studentId);
  const derived = statusForGraduationDate(input.graduatedOn);

  if (existing) {
    if (
      existing.graduated_on === input.graduatedOn &&
      existing.status !== "closed"
    ) {
      return toRetentionReviewDto(existing, student.display_name);
    }
    const updated = await updateRetentionReviewFields(admin, existing.id, {
      graduated_on: input.graduatedOn,
      review_eligible_on: derived.reviewEligibleOn,
      status:
        existing.legal_hold
          ? "legal_hold"
          : existing.status === "deletion_approved"
            ? existing.status
            : derived.status,
      graduating_enrollment_id:
        input.graduatingEnrollmentId ?? existing.graduating_enrollment_id,
    });
    if (!updated) throw AppError.internal("Failed to update retention review");
    return toRetentionReviewDto(updated, student.display_name);
  }

  const row = await insertRetentionReview(admin, {
    instituteId,
    studentId: input.studentId,
    graduatingEnrollmentId: input.graduatingEnrollmentId,
    graduatedOn: input.graduatedOn,
    reviewEligibleOn: derived.reviewEligibleOn,
    status: derived.status,
  });

  await recordInstituteAuditForActor(admin, actor, {
    instituteId,
    action: "retention.review_created",
    entityType: "student_retention_review",
    entityId: row.id,
    metadata: {
      student_id: input.studentId,
      status: row.status,
      has_graduation_date: Boolean(input.graduatedOn),
    },
  });

  return toRetentionReviewDto(row, student.display_name);
}

export async function listRetentionReviewsForActor(
  admin: SupabaseClient,
  actor: Actor,
  filter: ListRetentionReviewsFilter,
): Promise<StudentRetentionReviewDto[]> {
  const instituteId = requireInstituteId(actor, filter.instituteId);
  assertRetentionReader(actor, instituteId);

  const rows = await listRetentionReviews(admin, { ...filter, instituteId });
  const out: StudentRetentionReviewDto[] = [];
  for (const row of rows) {
    const student = await findStudentById(admin, row.student_id);
    out.push(toRetentionReviewDto(row, student?.display_name));
  }
  return out;
}

export async function getRetentionReviewForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<StudentRetentionReviewDto> {
  const row = await findRetentionReviewById(admin, id);
  if (!row) throw AppError.notFound("Retention review not found");
  assertRetentionReader(actor, row.institute_id);
  const student = await findStudentById(admin, row.student_id);
  return toRetentionReviewDto(row, student?.display_name);
}

export type RetentionDeletionBlockers = {
  blocked: boolean;
  reasons: string[];
};

export async function evaluateRetentionDeletionBlockers(
  admin: SupabaseClient,
  instituteId: string,
  studentId: string,
  review: StudentRetentionReviewRow,
): Promise<RetentionDeletionBlockers> {
  const reasons: string[] = [];

  if (review.legal_hold || review.status === "legal_hold") {
    reasons.push("Legal hold is active");
  }
  if (review.status === "active_retention" || review.status === "extended") {
    reasons.push("Retention period has not reached review eligibility");
  }
  if (review.status === "pending_graduation_date") {
    reasons.push("Graduation date is unknown — review required");
  }
  if (
    review.extended_until &&
    review.extended_until > todayIsoDate() &&
    review.status === "extended"
  ) {
    reasons.push("Authorized retention extension is still in force");
  }

  const fees = (await listStudentFeesForInstitute(admin, instituteId)).filter(
    (f) => f.student_id === studentId,
  );
  const outstanding = fees.filter(
    (f) => Number(f.billed_amount) - Number(f.paid_amount) > 0.009,
  );
  if (outstanding.length > 0) {
    reasons.push("Outstanding fee balances exist");
  }

  return { blocked: reasons.length > 0, reasons };
}

export async function decideRetentionReviewForActor(
  admin: SupabaseClient,
  actor: Actor,
  reviewId: string,
  input: RetentionDecisionInput,
): Promise<StudentRetentionReviewDto> {
  const existing = await findRetentionReviewById(admin, reviewId);
  if (!existing) throw AppError.notFound("Retention review not found");
  assertRetentionWriter(actor, existing.institute_id);

  const reason = input.reason.trim();
  if (reason.length < 3) {
    throw AppError.validation("reason is required", {
      reason: ["Provide a decision reason"],
    });
  }

  const nowIso = new Date().toISOString();
  const patch: Record<string, unknown> = {
    last_reviewed_at: nowIso,
    last_reviewed_by_user_id: actor.userId,
    last_decision: input.decision,
    last_decision_reason: reason.slice(0, 2000),
  };

  switch (input.decision) {
    case "retain": {
      patch.status = "active_retention";
      patch.legal_hold = false;
      break;
    }
    case "extend": {
      const until = input.extendedUntil?.trim();
      if (!until || !/^\d{4}-\d{2}-\d{2}$/.test(until)) {
        throw AppError.validation("extended_until is required", {
          extended_until: ["YYYY-MM-DD required"],
        });
      }
      const baseline =
        existing.review_eligible_on ?? existing.graduated_on ?? todayIsoDate();
      if (until <= baseline) {
        throw AppError.validation(
          "extended_until must be after current eligibility",
          { extended_until: ["Must be after review_eligible_on"] },
        );
      }
      patch.status = "extended";
      patch.extended_until = until;
      patch.review_eligible_on = until;
      patch.legal_hold = false;
      break;
    }
    case "legal_hold": {
      patch.status = "legal_hold";
      patch.legal_hold = true;
      break;
    }
    case "clear_legal_hold": {
      if (!existing.legal_hold && existing.status !== "legal_hold") {
        throw AppError.conflict("No legal hold is active");
      }
      patch.legal_hold = false;
      if (existing.graduated_on) {
        const eligible =
          existing.extended_until ??
          existing.review_eligible_on ??
          reviewEligibleOnFromGraduation(existing.graduated_on);
        patch.review_eligible_on = eligible;
        patch.status =
          eligible <= todayIsoDate() ? "review_eligible" : "active_retention";
      } else {
        patch.status = "pending_graduation_date";
        patch.review_eligible_on = null;
      }
      break;
    }
    case "set_graduation_date": {
      const graduatedOn = input.graduatedOn?.trim();
      if (!graduatedOn || !/^\d{4}-\d{2}-\d{2}$/.test(graduatedOn)) {
        throw AppError.validation("graduated_on is required", {
          graduated_on: ["YYYY-MM-DD required"],
        });
      }
      const eligible = reviewEligibleOnFromGraduation(graduatedOn);
      patch.graduated_on = graduatedOn;
      patch.review_eligible_on = eligible;
      patch.status = existing.legal_hold
        ? "legal_hold"
        : eligible <= todayIsoDate()
          ? "review_eligible"
          : "active_retention";
      await updateStudentFields(admin, existing.student_id, {
        graduated_on: graduatedOn,
        status: "graduated",
      });
      break;
    }
    case "approve_deletion": {
      const blockers = await evaluateRetentionDeletionBlockers(
        admin,
        existing.institute_id,
        existing.student_id,
        existing,
      );
      if (
        existing.status !== "review_eligible" &&
        existing.status !== "deletion_approved"
      ) {
        blockers.reasons.push(
          "Record is not review-eligible for deletion approval",
        );
        blockers.blocked = true;
      }
      if (blockers.blocked) {
        throw AppError.conflict(
          `Deletion cannot be approved: ${blockers.reasons.join("; ")}`,
        );
      }
      // Approval only — does not soft-delete or purge the student.
      patch.status = "deletion_approved";
      break;
    }
    default:
      throw AppError.validation("Unknown decision", {
        decision: ["Invalid"],
      });
  }

  const updated = await updateRetentionReviewFields(admin, reviewId, patch);
  if (!updated) throw AppError.notFound("Retention review not found");

  await recordInstituteAuditForActor(admin, actor, {
    instituteId: existing.institute_id,
    action: `retention.decision.${input.decision}`,
    entityType: "student_retention_review",
    entityId: reviewId,
    metadata: {
      student_id: existing.student_id,
      decision: input.decision,
      // Do not log PII beyond opaque ids.
    },
  });

  const student = await findStudentById(admin, updated.student_id);
  return toRetentionReviewDto(updated, student?.display_name);
}

/**
 * Idempotent eligibility flip — never deletes students.
 * Safe to re-run; already review_eligible / deletion_approved rows are skipped.
 */
export async function processRetentionReviewEligibilitySystem(
  admin: SupabaseClient,
  options?: { now?: Date },
): Promise<{ scanned: number; markedEligible: number }> {
  const asOf = todayIsoDate(options?.now ?? new Date());
  const due = await listRetentionReviewsDueForEligibility(admin, asOf);
  let markedEligible = 0;

  for (const row of due) {
    if (row.legal_hold) continue;
    if (row.status === "review_eligible" || row.status === "deletion_approved") {
      continue;
    }
    const updated = await updateRetentionReviewFields(admin, row.id, {
      status: "review_eligible",
    });
    if (updated && updated.status === "review_eligible") {
      markedEligible += 1;
    }
  }

  return { scanned: due.length, markedEligible };
}
