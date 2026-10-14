import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  ListRetentionReviewsFilter,
  RetentionReviewStatus,
  StudentRetentionReviewRow,
} from "./types.js";

const COLS =
  "id, institute_id, student_id, graduating_enrollment_id, graduated_on, review_eligible_on, status, legal_hold, extended_until, last_reviewed_at, last_reviewed_by_user_id, last_decision, last_decision_reason, created_at, updated_at, deleted_at";

export async function findRetentionReviewByStudentId(
  admin: SupabaseClient,
  studentId: string,
): Promise<StudentRetentionReviewRow | null> {
  const result = await admin
    .from("student_retention_review")
    .select(COLS)
    .eq("student_id", studentId)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as StudentRetentionReviewRow | null) ?? null;
}

export async function findRetentionReviewById(
  admin: SupabaseClient,
  id: string,
): Promise<StudentRetentionReviewRow | null> {
  const result = await admin
    .from("student_retention_review")
    .select(COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as StudentRetentionReviewRow | null) ?? null;
}

export async function listRetentionReviews(
  admin: SupabaseClient,
  filter: ListRetentionReviewsFilter,
): Promise<StudentRetentionReviewRow[]> {
  let query = admin
    .from("student_retention_review")
    .select(COLS)
    .eq("institute_id", filter.instituteId)
    .is("deleted_at", null)
    .order("review_eligible_on", { ascending: true, nullsFirst: false });

  if (filter.status) query = query.eq("status", filter.status);
  if (filter.reviewEligibleOnOrBefore) {
    query = query.lte("review_eligible_on", filter.reviewEligibleOnOrBefore);
  }

  const result = await query;
  return ensureDbOk(result) as StudentRetentionReviewRow[];
}

export async function insertRetentionReview(
  admin: SupabaseClient,
  row: {
    instituteId: string;
    studentId: string;
    graduatingEnrollmentId?: string | null;
    graduatedOn: string | null;
    reviewEligibleOn: string | null;
    status: RetentionReviewStatus;
  },
): Promise<StudentRetentionReviewRow> {
  const result = await admin
    .from("student_retention_review")
    .insert({
      institute_id: row.instituteId,
      student_id: row.studentId,
      graduating_enrollment_id: row.graduatingEnrollmentId ?? null,
      graduated_on: row.graduatedOn,
      review_eligible_on: row.reviewEligibleOn,
      status: row.status,
      legal_hold: false,
    })
    .select(COLS)
    .single();
  return ensureDbOk(result) as StudentRetentionReviewRow;
}

export async function updateRetentionReviewFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<StudentRetentionReviewRow | null> {
  const result = await admin
    .from("student_retention_review")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as StudentRetentionReviewRow | null) ?? null;
}

/** System job: rows still in active/extended that are now eligible. */
export async function listRetentionReviewsDueForEligibility(
  admin: SupabaseClient,
  asOfDate: string,
): Promise<StudentRetentionReviewRow[]> {
  const result = await admin
    .from("student_retention_review")
    .select(COLS)
    .is("deleted_at", null)
    .eq("legal_hold", false)
    .in("status", ["active_retention", "extended"])
    .lte("review_eligible_on", asOfDate);
  return ensureDbOk(result) as StudentRetentionReviewRow[];
}
