import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteAccess,
  assertInstituteRoles,
  actorHasInstituteRole,
  requireInstituteId,
  requireTeacherIdentity,
} from "../../authorization/index.js";
import { findTeacherById } from "../teachers/repository.js";
import {
  findStaffAttendanceById,
  listStaffAttendance,
  setDayStatusForDate,
  softDeleteStaffAttendance,
  upsertStaffAttendanceMark,
} from "./repository.js";
import type {
  DayActionInput,
  ListStaffAttendanceFilter,
  StaffAttendanceDto,
  StaffAttendanceRow,
  StaffAttendanceStatus,
  UpsertStaffAttendanceDayInput,
} from "./types.js";

/** Admin day register write + submit/reopen. */
export const STAFF_ATTENDANCE_WRITE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
] as const;

export const STAFF_ATTENDANCE_STAFF_READ_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "it_admin",
  "teacher",
  "accountant",
  "admissions_officer",
  "staff",
] as const;

/** Matches Admin TEACHER_ATTENDANCE_EDIT_WINDOW_HOURS. */
export const STAFF_ATTENDANCE_REOPEN_WINDOW_HOURS = 20;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;

export function toStaffAttendanceDto(row: StaffAttendanceRow): StaffAttendanceDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    teacherId: row.teacher_id,
    attendanceDate: row.attendance_date,
    status: row.status,
    checkIn: row.check_in,
    checkOut: row.check_out,
    note: row.note,
    dayStatus: row.day_status,
    markedByUserId: row.marked_by_user_id,
    submittedAt: row.submitted_at,
    submittedByUserId: row.submitted_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isStaffReader(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  return STAFF_ATTENDANCE_STAFF_READ_ROLES.some((role) =>
    actorHasInstituteRole(actor, instituteId, role),
  );
}

function isWriter(actor: Actor, instituteId: string): boolean {
  return STAFF_ATTENDANCE_WRITE_ROLES.some((role) =>
    actorHasInstituteRole(actor, instituteId, role),
  );
}

/** Institute-wide readers: writers + staff roles other than pure teacher. */
function canReadInstituteWide(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  if (isWriter(actor, instituteId)) return true;
  const wideRoles = STAFF_ATTENDANCE_STAFF_READ_ROLES.filter((r) => r !== "teacher");
  return wideRoles.some((role) => actorHasInstituteRole(actor, instituteId, role));
}

function assertDate(value: string, field: string): void {
  if (!DATE_RE.test(value)) {
    throw AppError.validation("Referenced resource is invalid", {
      [field]: ["Must be YYYY-MM-DD"],
    });
  }
}

function assertOptionalTime(
  value: string | null | undefined,
  field: string,
): void {
  if (value == null) return;
  if (!TIME_RE.test(value)) {
    throw AppError.validation("Referenced resource is invalid", {
      [field]: ["Must be HH:MM or HH:MM:SS"],
    });
  }
}

function normalizeMarkTimes(
  status: StaffAttendanceStatus,
  checkIn: string | null | undefined,
  checkOut: string | null | undefined,
): { checkIn: string | null; checkOut: string | null } {
  if (status === "absent" || status === "leave") {
    return { checkIn: null, checkOut: null };
  }
  assertOptionalTime(checkIn, "check_in");
  assertOptionalTime(checkOut, "check_out");
  return { checkIn: checkIn ?? null, checkOut: checkOut ?? null };
}

function actorTeacherIds(actor: Actor, instituteId: string): Set<string> {
  return new Set(
    actor.teachers
      .filter((t) => t.instituteId === instituteId)
      .map((t) => t.teacherId),
  );
}

function filterVisibleRows(
  rows: StaffAttendanceRow[],
  actor: Actor,
  instituteId: string,
): StaffAttendanceRow[] {
  if (canReadInstituteWide(actor, instituteId)) return rows;
  const own = actorTeacherIds(actor, instituteId);
  if (own.size === 0) {
    throw AppError.forbidden("Insufficient staff attendance access");
  }
  return rows.filter((r) => own.has(r.teacher_id));
}

function assertCanReadRow(actor: Actor, row: StaffAttendanceRow): void {
  assertInstituteAccess(actor, row.institute_id);
  if (canReadInstituteWide(actor, row.institute_id)) return;
  const own = actorTeacherIds(actor, row.institute_id);
  if (own.has(row.teacher_id)) return;
  throw AppError.forbidden("Insufficient staff attendance access");
}

export async function listStaffAttendanceForActor(
  admin: SupabaseClient,
  actor: Actor,
  filter: ListStaffAttendanceFilter,
): Promise<StaffAttendanceDto[]> {
  const instituteId = requireInstituteId(actor, filter.instituteId);
  if (filter.attendanceDate) assertDate(filter.attendanceDate, "date");
  if (filter.from) assertDate(filter.from, "from");
  if (filter.to) assertDate(filter.to, "to");

  let teacherId = filter.teacherId;
  if (!canReadInstituteWide(actor, instituteId)) {
    if (!actorHasInstituteRole(actor, instituteId, "teacher")) {
      throw AppError.forbidden("Insufficient staff attendance access");
    }
    const identity = requireTeacherIdentity(actor, instituteId);
    if (teacherId && teacherId !== identity.teacherId) {
      throw AppError.forbidden("Cannot read another teacher's attendance");
    }
    teacherId = identity.teacherId;
  } else if (!isStaffReader(actor, instituteId)) {
    throw AppError.forbidden("Insufficient staff attendance access");
  }

  const rows = await listStaffAttendance(admin, {
    ...filter,
    instituteId,
    teacherId,
  });
  return filterVisibleRows(rows, actor, instituteId).map(toStaffAttendanceDto);
}

export async function getStaffAttendanceForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<StaffAttendanceDto> {
  const row = await findStaffAttendanceById(admin, id);
  if (!row) throw AppError.notFound("Staff attendance not found");
  assertCanReadRow(actor, row);
  return toStaffAttendanceDto(row);
}

export async function upsertStaffAttendanceDayForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: UpsertStaffAttendanceDayInput,
): Promise<StaffAttendanceDto[]> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertInstituteRoles(actor, instituteId, [...STAFF_ATTENDANCE_WRITE_ROLES]);
  assertDate(input.attendanceDate, "date");

  if (input.marks.length === 0) {
    throw AppError.validation("Referenced resource is invalid", {
      marks: ["At least one mark is required"],
    });
  }

  const existingForDay = await listStaffAttendance(admin, {
    instituteId,
    attendanceDate: input.attendanceDate,
  });
  const dayStatus =
    existingForDay.find((r) => r.day_status === "submitted")?.day_status ??
    "draft";

  if (dayStatus === "submitted") {
    throw AppError.conflict("Submitted day cannot be edited — reopen first");
  }

  const seen = new Set<string>();
  const out: StaffAttendanceDto[] = [];

  for (const mark of input.marks) {
    if (seen.has(mark.teacherId)) {
      throw AppError.validation("Referenced resource is invalid", {
        marks: ["Duplicate teacher_id in marks"],
      });
    }
    seen.add(mark.teacherId);

    const teacher = await findTeacherById(admin, mark.teacherId);
    if (!teacher || teacher.institute_id !== instituteId) {
      throw AppError.validation("Referenced resource is invalid", {
        teacher_id: ["Teacher not found in this institute"],
      });
    }

    const times = normalizeMarkTimes(mark.status, mark.checkIn, mark.checkOut);
    const row = await upsertStaffAttendanceMark(admin, {
      instituteId,
      attendanceDate: input.attendanceDate,
      mark: {
        ...mark,
        checkIn: times.checkIn,
        checkOut: times.checkOut,
      },
      markedByUserId: actor.userId,
      existingDayStatus: "draft",
    });
    out.push(toStaffAttendanceDto(row));
  }

  return out;
}

export async function submitStaffAttendanceDayForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: DayActionInput,
): Promise<StaffAttendanceDto[]> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertInstituteRoles(actor, instituteId, [...STAFF_ATTENDANCE_WRITE_ROLES]);
  assertDate(input.attendanceDate, "date");

  const existing = await listStaffAttendance(admin, {
    instituteId,
    attendanceDate: input.attendanceDate,
  });
  if (existing.length === 0) {
    throw AppError.validation("Referenced resource is invalid", {
      date: ["No attendance marks for this date"],
    });
  }
  if (existing.every((r) => r.day_status === "submitted")) {
    return existing.map(toStaffAttendanceDto);
  }

  const now = new Date().toISOString();
  const updated = await setDayStatusForDate(admin, {
    instituteId,
    attendanceDate: input.attendanceDate,
    dayStatus: "submitted",
    submittedAt: now,
    submittedByUserId: actor.userId,
  });
  return updated.map(toStaffAttendanceDto);
}

export async function reopenStaffAttendanceDayForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: DayActionInput,
): Promise<StaffAttendanceDto[]> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertInstituteRoles(actor, instituteId, [...STAFF_ATTENDANCE_WRITE_ROLES]);
  assertDate(input.attendanceDate, "date");

  const existing = await listStaffAttendance(admin, {
    instituteId,
    attendanceDate: input.attendanceDate,
  });
  if (existing.length === 0) {
    throw AppError.notFound("Staff attendance day not found");
  }

  const submittedAt = existing.find((r) => r.submitted_at)?.submitted_at;
  if (!submittedAt) {
    return existing.map(toStaffAttendanceDto);
  }

  const elapsedMs = Date.now() - new Date(submittedAt).getTime();
  const windowMs = STAFF_ATTENDANCE_REOPEN_WINDOW_HOURS * 60 * 60 * 1000;
  if (elapsedMs > windowMs) {
    throw AppError.conflict(
      `Reopen window of ${STAFF_ATTENDANCE_REOPEN_WINDOW_HOURS} hours has expired`,
    );
  }

  const updated = await setDayStatusForDate(admin, {
    instituteId,
    attendanceDate: input.attendanceDate,
    dayStatus: "draft",
    submittedAt: null,
    submittedByUserId: null,
  });
  return updated.map(toStaffAttendanceDto);
}

export async function deleteStaffAttendanceForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<void> {
  const existing = await findStaffAttendanceById(admin, id);
  if (!existing) throw AppError.notFound("Staff attendance not found");
  assertInstituteAccess(actor, existing.institute_id);
  assertInstituteRoles(actor, existing.institute_id, [
    ...STAFF_ATTENDANCE_WRITE_ROLES,
  ]);

  if (existing.day_status === "submitted") {
    throw AppError.conflict("Submitted marks cannot be deleted — reopen first");
  }

  const deleted = await softDeleteStaffAttendance(admin, id);
  if (!deleted) throw AppError.notFound("Staff attendance not found");
}
