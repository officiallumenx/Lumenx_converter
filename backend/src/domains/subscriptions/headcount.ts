/**
 * Server-side billable student headcount for subscriptions.active_student_count.
 *
 * Canonical rule (verified from field name + Admin demo intent + enrollment model):
 * Count distinct students who currently occupy a roster seat:
 * - have at least one non-deleted enrollment with status = "active"
 * - student row is not soft-deleted
 * - student.status is not "graduated"
 *
 * Does NOT count: completed / transferred / dropped_out / graduated enrollments,
 * soft-deleted enrollments, soft-deleted students, or graduated student profiles.
 * Distinct student_id prevents double-counting across academic years (a student
 * should have at most one active enrollment; even if data is messy we count once).
 *
 * Admin clients cannot set this field via /api/v1/subscriptions — only this sync
 * (and Nexus platform upsert) write active_student_count.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  findSubscriptionByInstituteId,
  updateSubscriptionFields,
} from "../nexus/repository.js";

const STUDENT_COLS = "id, status, deleted_at";

export type BillableHeadcountResult = {
  instituteId: string;
  count: number;
  updated: boolean;
  previousCount: number | null;
};

/**
 * Count distinct billable students for an institute from enrollment + student rows.
 */
export async function countBillableStudentsForInstitute(
  admin: SupabaseClient,
  instituteId: string,
): Promise<number> {
  const id = instituteId.trim();
  if (!id) return 0;

  const enrollResult = await admin
    .from("enrollment")
    .select("student_id")
    .eq("institute_id", id)
    .eq("status", "active")
    .is("deleted_at", null);

  if (enrollResult.error) {
    throw enrollResult.error;
  }

  const studentIds = [
    ...new Set(
      (enrollResult.data ?? [])
        .map((row) => String((row as { student_id?: string }).student_id ?? ""))
        .filter(Boolean),
    ),
  ];
  if (studentIds.length === 0) return 0;

  // Chunk .in() to stay within PostgREST URL limits for large institutes.
  const chunkSize = 200;
  const billable = new Set<string>();
  for (let i = 0; i < studentIds.length; i += chunkSize) {
    const chunk = studentIds.slice(i, i + chunkSize);
    const studentResult = await admin
      .from("student")
      .select(STUDENT_COLS)
      .eq("institute_id", id)
      .in("id", chunk)
      .is("deleted_at", null);

    if (studentResult.error) {
      throw studentResult.error;
    }

    for (const row of studentResult.data ?? []) {
      const student = row as { id: string; status: string };
      if (student.status === "graduated") continue;
      billable.add(student.id);
    }
  }

  return billable.size;
}

/**
 * Recompute and persist subscription.active_student_count for an institute.
 * No-op when there is no live subscription row (gate handles missing sub).
 */
export async function syncSubscriptionActiveStudentCount(
  admin: SupabaseClient,
  instituteId: string,
): Promise<BillableHeadcountResult> {
  const id = instituteId.trim();
  const count = await countBillableStudentsForInstitute(admin, id);
  const sub = await findSubscriptionByInstituteId(admin, id);
  if (!sub) {
    return {
      instituteId: id,
      count,
      updated: false,
      previousCount: null,
    };
  }

  const previousCount = Number(sub.active_student_count) || 0;
  if (previousCount === count) {
    return {
      instituteId: id,
      count,
      updated: false,
      previousCount,
    };
  }

  await updateSubscriptionFields(admin, sub.id, {
    active_student_count: count,
  });

  return {
    instituteId: id,
    count,
    updated: true,
    previousCount,
  };
}

/**
 * Fire-and-forget safe wrapper for domain mutation hooks.
 * Never fails the primary mutation if headcount sync errors.
 */
export async function syncSubscriptionActiveStudentCountSafe(
  admin: SupabaseClient,
  instituteId: string,
): Promise<void> {
  try {
    await syncSubscriptionActiveStudentCount(admin, instituteId);
  } catch {
    // Primary academic mutation already succeeded; headcount will self-heal
    // on the next enrollment change or explicit sync.
  }
}
