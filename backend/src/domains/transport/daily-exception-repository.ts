import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";

export type TransportDailyExceptionType = "NOT_RIDING";
export type TransportDailyExceptionReason =
  | "parent"
  | "admin"
  | "driver"
  | "system";

export type TransportDailyExceptionRow = {
  id: string;
  institute_id: string;
  student_id: string;
  service_date: string;
  exception_type: TransportDailyExceptionType;
  reason: TransportDailyExceptionReason;
  notes: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
};

const COLS =
  "id, institute_id, student_id, service_date, exception_type, reason, notes, created_by_user_id, created_at, updated_at, cancelled_at";

export async function findActiveDailyException(
  admin: SupabaseClient,
  instituteId: string,
  studentId: string,
  serviceDate: string,
  exceptionType: TransportDailyExceptionType = "NOT_RIDING",
): Promise<TransportDailyExceptionRow | null> {
  const result = await admin
    .from("transport_daily_exception")
    .select(COLS)
    .eq("institute_id", instituteId)
    .eq("student_id", studentId)
    .eq("service_date", serviceDate)
    .eq("exception_type", exceptionType)
    .is("cancelled_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as TransportDailyExceptionRow | null) ?? null;
}

export async function findDailyExceptionById(
  admin: SupabaseClient,
  id: string,
): Promise<TransportDailyExceptionRow | null> {
  const result = await admin
    .from("transport_daily_exception")
    .select(COLS)
    .eq("id", id)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as TransportDailyExceptionRow | null) ?? null;
}

export async function listActiveDailyExceptionsForDate(
  admin: SupabaseClient,
  instituteId: string,
  serviceDate: string,
  exceptionType?: TransportDailyExceptionType,
): Promise<TransportDailyExceptionRow[]> {
  let query = admin
    .from("transport_daily_exception")
    .select(COLS)
    .eq("institute_id", instituteId)
    .eq("service_date", serviceDate)
    .is("cancelled_at", null);
  if (exceptionType) query = query.eq("exception_type", exceptionType);
  const result = await query.order("created_at", { ascending: false });
  return ensureDbOk(result) as TransportDailyExceptionRow[];
}

export async function listActiveDailyExceptionsForStudents(
  admin: SupabaseClient,
  instituteId: string,
  serviceDate: string,
  studentIds: string[],
  exceptionType: TransportDailyExceptionType = "NOT_RIDING",
): Promise<TransportDailyExceptionRow[]> {
  if (studentIds.length === 0) return [];
  const result = await admin
    .from("transport_daily_exception")
    .select(COLS)
    .eq("institute_id", instituteId)
    .eq("service_date", serviceDate)
    .eq("exception_type", exceptionType)
    .in("student_id", studentIds)
    .is("cancelled_at", null);
  return ensureDbOk(result) as TransportDailyExceptionRow[];
}

export async function listNotRidingStudentIds(
  admin: SupabaseClient,
  instituteId: string,
  serviceDate: string,
  studentIds: string[],
): Promise<Set<string>> {
  const rows = await listActiveDailyExceptionsForStudents(
    admin,
    instituteId,
    serviceDate,
    studentIds,
    "NOT_RIDING",
  );
  return new Set(rows.map((r) => r.student_id));
}

export async function insertDailyException(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    studentId: string;
    serviceDate: string;
    exceptionType?: TransportDailyExceptionType;
    reason: TransportDailyExceptionReason;
    notes?: string | null;
    createdByUserId: string;
  },
): Promise<TransportDailyExceptionRow> {
  const result = await admin
    .from("transport_daily_exception")
    .insert({
      institute_id: input.instituteId,
      student_id: input.studentId,
      service_date: input.serviceDate,
      exception_type: input.exceptionType ?? "NOT_RIDING",
      reason: input.reason,
      notes: input.notes ?? null,
      created_by_user_id: input.createdByUserId,
      cancelled_at: null,
    })
    .select(COLS)
    .single();
  return ensureDbOk(result) as TransportDailyExceptionRow;
}

/** Reactivate a previously cancelled exception (idempotent recreate path). */
export async function reactivateDailyException(
  admin: SupabaseClient,
  id: string,
  patch: {
    reason: TransportDailyExceptionReason;
    notes?: string | null;
    createdByUserId: string;
  },
): Promise<TransportDailyExceptionRow | null> {
  const result = await admin
    .from("transport_daily_exception")
    .update({
      cancelled_at: null,
      reason: patch.reason,
      notes: patch.notes ?? null,
      created_by_user_id: patch.createdByUserId,
    })
    .eq("id", id)
    .select(COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as TransportDailyExceptionRow | null) ?? null;
}

export async function cancelDailyException(
  admin: SupabaseClient,
  id: string,
): Promise<TransportDailyExceptionRow | null> {
  const result = await admin
    .from("transport_daily_exception")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("id", id)
    .is("cancelled_at", null)
    .select(COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as TransportDailyExceptionRow | null) ?? null;
}

/** Latest row for student/date/type including cancelled (for reactivate). */
export async function findLatestDailyExceptionAny(
  admin: SupabaseClient,
  instituteId: string,
  studentId: string,
  serviceDate: string,
  exceptionType: TransportDailyExceptionType = "NOT_RIDING",
): Promise<TransportDailyExceptionRow | null> {
  const result = await admin
    .from("transport_daily_exception")
    .select(COLS)
    .eq("institute_id", instituteId)
    .eq("student_id", studentId)
    .eq("service_date", serviceDate)
    .eq("exception_type", exceptionType)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as TransportDailyExceptionRow | null) ?? null;
}
