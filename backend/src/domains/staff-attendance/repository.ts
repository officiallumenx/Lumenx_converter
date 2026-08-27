import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  ListStaffAttendanceFilter,
  StaffAttendanceDayStatus,
  StaffAttendanceRow,
  StaffAttendanceStatus,
  UpsertStaffAttendanceMarkInput,
} from "./types.js";

export const STAFF_ATTENDANCE_COLS =
  "id, institute_id, teacher_id, attendance_date, status, check_in, check_out, note, day_status, marked_by_user_id, submitted_at, submitted_by_user_id, created_at, updated_at, deleted_at";

export async function listStaffAttendance(
  admin: SupabaseClient,
  filter: ListStaffAttendanceFilter,
): Promise<StaffAttendanceRow[]> {
  let query = admin
    .from("staff_attendance")
    .select(STAFF_ATTENDANCE_COLS)
    .eq("institute_id", filter.instituteId)
    .is("deleted_at", null);

  if (filter.attendanceDate) {
    query = query.eq("attendance_date", filter.attendanceDate);
  }
  if (filter.teacherId) query = query.eq("teacher_id", filter.teacherId);
  if (filter.dayStatus) query = query.eq("day_status", filter.dayStatus);
  if (filter.from) query = query.gte("attendance_date", filter.from);
  if (filter.to) query = query.lte("attendance_date", filter.to);

  const result = await query;
  return ensureDbOk(result) as StaffAttendanceRow[];
}

export async function findStaffAttendanceById(
  admin: SupabaseClient,
  id: string,
): Promise<StaffAttendanceRow | null> {
  const result = await admin
    .from("staff_attendance")
    .select(STAFF_ATTENDANCE_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as StaffAttendanceRow | null) ?? null;
}

export async function findStaffAttendanceByTeacherDate(
  admin: SupabaseClient,
  input: { instituteId: string; teacherId: string; attendanceDate: string },
): Promise<StaffAttendanceRow | null> {
  const result = await admin
    .from("staff_attendance")
    .select(STAFF_ATTENDANCE_COLS)
    .eq("institute_id", input.instituteId)
    .eq("teacher_id", input.teacherId)
    .eq("attendance_date", input.attendanceDate)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as StaffAttendanceRow | null) ?? null;
}

export async function insertStaffAttendance(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    teacherId: string;
    attendanceDate: string;
    status: StaffAttendanceStatus;
    checkIn: string | null;
    checkOut: string | null;
    note: string | null;
    dayStatus: StaffAttendanceDayStatus;
    markedByUserId: string;
  },
): Promise<StaffAttendanceRow> {
  const result = await admin
    .from("staff_attendance")
    .insert({
      institute_id: input.instituteId,
      teacher_id: input.teacherId,
      attendance_date: input.attendanceDate,
      status: input.status,
      check_in: input.checkIn,
      check_out: input.checkOut,
      note: input.note,
      day_status: input.dayStatus,
      marked_by_user_id: input.markedByUserId,
      submitted_at: null,
      submitted_by_user_id: null,
    })
    .select(STAFF_ATTENDANCE_COLS)
    .single();
  return ensureDbOk(result) as StaffAttendanceRow;
}

export async function updateStaffAttendanceFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<StaffAttendanceRow | null> {
  const result = await admin
    .from("staff_attendance")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(STAFF_ATTENDANCE_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as StaffAttendanceRow | null) ?? null;
}

export async function upsertStaffAttendanceMark(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    attendanceDate: string;
    mark: UpsertStaffAttendanceMarkInput;
    markedByUserId: string;
    existingDayStatus: StaffAttendanceDayStatus;
  },
): Promise<StaffAttendanceRow> {
  const existing = await findStaffAttendanceByTeacherDate(admin, {
    instituteId: input.instituteId,
    teacherId: input.mark.teacherId,
    attendanceDate: input.attendanceDate,
  });

  const checkIn =
    input.mark.status === "absent" || input.mark.status === "leave"
      ? null
      : (input.mark.checkIn ?? null);
  const checkOut =
    input.mark.status === "absent" || input.mark.status === "leave"
      ? null
      : (input.mark.checkOut ?? null);
  const note = input.mark.note ?? null;

  if (existing) {
    const updated = await updateStaffAttendanceFields(admin, existing.id, {
      status: input.mark.status,
      check_in: checkIn,
      check_out: checkOut,
      note,
      marked_by_user_id: input.markedByUserId,
    });
    if (!updated) {
      throw new Error("Failed to update staff attendance");
    }
    return updated;
  }

  return insertStaffAttendance(admin, {
    instituteId: input.instituteId,
    teacherId: input.mark.teacherId,
    attendanceDate: input.attendanceDate,
    status: input.mark.status,
    checkIn,
    checkOut,
    note,
    dayStatus: input.existingDayStatus,
    markedByUserId: input.markedByUserId,
  });
}

export async function setDayStatusForDate(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    attendanceDate: string;
    dayStatus: StaffAttendanceDayStatus;
    submittedAt: string | null;
    submittedByUserId: string | null;
  },
): Promise<StaffAttendanceRow[]> {
  const result = await admin
    .from("staff_attendance")
    .update({
      day_status: input.dayStatus,
      submitted_at: input.submittedAt,
      submitted_by_user_id: input.submittedByUserId,
    })
    .eq("institute_id", input.instituteId)
    .eq("attendance_date", input.attendanceDate)
    .is("deleted_at", null)
    .select(STAFF_ATTENDANCE_COLS);
  return ensureDbOk(result) as StaffAttendanceRow[];
}

export async function softDeleteStaffAttendance(
  admin: SupabaseClient,
  id: string,
): Promise<StaffAttendanceRow | null> {
  const result = await admin
    .from("staff_attendance")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(STAFF_ATTENDANCE_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as StaffAttendanceRow | null) ?? null;
}
