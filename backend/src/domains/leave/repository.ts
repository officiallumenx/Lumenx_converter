import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  LeaveDecisionOutcome,
  LeaveDecisionRow,
  LeaveRequestRow,
  LeaveStatus,
  LeaveSubjectKind,
  LeaveType,
  IntendedApproverRole,
  ListLeaveRequestsFilter,
} from "./types.js";

const REQUEST_COLS =
  "id, institute_id, subject_kind, student_id, teacher_id, requested_by_user_id, leave_type, intended_approver_role, start_date, end_date, reason, status, academic_year_id, class_id, section_id, created_at, updated_at, deleted_at";

const DECISION_COLS =
  "id, institute_id, leave_request_id, outcome, note, decided_by_user_id, decided_at, created_at, updated_at";

export type EnrollmentSnapshot = {
  academic_year_id: string;
  class_id: string;
  section_id: string;
};

export async function listLeaveRequests(
  admin: SupabaseClient,
  filter: ListLeaveRequestsFilter,
): Promise<LeaveRequestRow[]> {
  let query = admin
    .from("leave_request")
    .select(REQUEST_COLS)
    .eq("institute_id", filter.instituteId)
    .is("deleted_at", null);

  if (filter.subjectKind) query = query.eq("subject_kind", filter.subjectKind);
  if (filter.status) query = query.eq("status", filter.status);
  if (filter.studentId) query = query.eq("student_id", filter.studentId);
  if (filter.teacherId) query = query.eq("teacher_id", filter.teacherId);

  const result = await query;
  return ensureDbOk(result) as LeaveRequestRow[];
}

export async function findLeaveRequestById(
  admin: SupabaseClient,
  id: string,
): Promise<LeaveRequestRow | null> {
  const result = await admin
    .from("leave_request")
    .select(REQUEST_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as LeaveRequestRow | null) ?? null;
}

export async function insertLeaveRequest(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    subjectKind: LeaveSubjectKind;
    studentId: string | null;
    teacherId: string | null;
    requestedByUserId: string;
    leaveType: LeaveType;
    intendedApproverRole: IntendedApproverRole | null;
    startDate: string;
    endDate: string;
    reason: string;
    enrollment?: EnrollmentSnapshot | null;
  },
): Promise<LeaveRequestRow> {
  const result = await admin
    .from("leave_request")
    .insert({
      institute_id: input.instituteId,
      subject_kind: input.subjectKind,
      student_id: input.studentId,
      teacher_id: input.teacherId,
      requested_by_user_id: input.requestedByUserId,
      leave_type: input.leaveType,
      intended_approver_role: input.intendedApproverRole,
      start_date: input.startDate,
      end_date: input.endDate,
      reason: input.reason,
      status: "pending",
      academic_year_id: input.enrollment?.academic_year_id ?? null,
      class_id: input.enrollment?.class_id ?? null,
      section_id: input.enrollment?.section_id ?? null,
    })
    .select(REQUEST_COLS)
    .single();
  return ensureDbOk(result) as LeaveRequestRow;
}

export async function updateLeaveRequestStatus(
  admin: SupabaseClient,
  id: string,
  status: LeaveStatus,
): Promise<LeaveRequestRow | null> {
  const result = await admin
    .from("leave_request")
    .update({ status })
    .eq("id", id)
    .is("deleted_at", null)
    .select(REQUEST_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as LeaveRequestRow | null) ?? null;
}

export async function softDeleteLeaveRequest(
  admin: SupabaseClient,
  id: string,
): Promise<LeaveRequestRow | null> {
  const result = await admin
    .from("leave_request")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(REQUEST_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as LeaveRequestRow | null) ?? null;
}

export async function findLeaveDecisionByRequestId(
  admin: SupabaseClient,
  leaveRequestId: string,
): Promise<LeaveDecisionRow | null> {
  const result = await admin
    .from("leave_decision")
    .select(DECISION_COLS)
    .eq("leave_request_id", leaveRequestId)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as LeaveDecisionRow | null) ?? null;
}

export async function insertLeaveDecision(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    leaveRequestId: string;
    outcome: LeaveDecisionOutcome;
    note: string | null;
    decidedByUserId: string;
  },
): Promise<LeaveDecisionRow> {
  const result = await admin
    .from("leave_decision")
    .insert({
      institute_id: input.instituteId,
      leave_request_id: input.leaveRequestId,
      outcome: input.outcome,
      note: input.note,
      decided_by_user_id: input.decidedByUserId,
    })
    .select(DECISION_COLS)
    .single();
  return ensureDbOk(result) as LeaveDecisionRow;
}

/** Prefer current academic year enrollment when multiple active rows exist. */
export async function findPreferredActiveEnrollment(
  admin: SupabaseClient,
  input: { instituteId: string; studentId: string },
): Promise<EnrollmentSnapshot | null> {
  const enrollResult = await admin
    .from("enrollment")
    .select("academic_year_id, class_id, section_id")
    .eq("institute_id", input.instituteId)
    .eq("student_id", input.studentId)
    .eq("status", "active")
    .is("deleted_at", null);
  const enrollments = ensureDbOk(enrollResult) as EnrollmentSnapshot[];
  if (enrollments.length === 0) return null;
  if (enrollments.length === 1) return enrollments[0]!;

  const yearResult = await admin
    .from("academic_year")
    .select("id")
    .eq("institute_id", input.instituteId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();
  if (yearResult.error) ensureDbOk(yearResult);
  const activeYearId = (yearResult.data as { id: string } | null)?.id;
  if (activeYearId) {
    const match = enrollments.find((e) => e.academic_year_id === activeYearId);
    if (match) return match;
  }
  return enrollments[0]!;
}
