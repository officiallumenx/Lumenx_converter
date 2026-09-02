import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteAccess,
  assertInstituteRoles,
  requireInstituteId,
  requireTeacherIdentity,
  actorHasInstituteRole,
} from "../../authorization/index.js";
import {
  findConfigVersionById,
  findEnrollmentsByIds,
  findRegisterById,
  findSectionById,
  findTeacherSectionAssignment,
  findTimetableSlotGraph,
  insertConfigVersion,
  insertMarks,
  insertRegister,
  listConfigVersions,
  listGuardianStudentIds,
  listMarksForRegister,
  listRegisters,
  softDeleteMarksForRegister,
  submitRegister,
  updateRegisterDraftFields,
} from "./repository.js";
import type {
  AttendanceConfigVersionDto,
  AttendanceConfigVersionRow,
  AttendanceMarkDto,
  AttendanceMarkRow,
  AttendanceRegisterDto,
  AttendanceRegisterRow,
  CreateConfigInput,
  CreateRegisterInput,
  ExplicitMarkInput,
  ListRegistersFilter,
  UpdateRegisterInput,
} from "./types.js";

export const ATTENDANCE_CONFIG_WRITE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
] as const;

/** Staff/admin override writers (no teacher_assignment required). */
export const ATTENDANCE_STAFF_WRITE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
] as const;

export const ATTENDANCE_STAFF_READ_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "teacher",
  "accountant",
  "admissions_officer",
  "it_admin",
  "staff",
] as const;

export function toConfigDto(row: AttendanceConfigVersionRow): AttendanceConfigVersionDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    effectiveFrom: row.effective_from,
    method: row.method,
    owner: row.owner,
    scope: row.scope,
    classCodes: row.class_codes ?? [],
    sectionCodes: row.section_codes ?? [],
    createdByUserProfileId: row.created_by_user_profile_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toMarkDto(row: AttendanceMarkRow): AttendanceMarkDto {
  return {
    id: row.id,
    enrollmentId: row.enrollment_id,
    studentId: row.student_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toRegisterDto(
  row: AttendanceRegisterRow,
  marks?: AttendanceMarkRow[],
): AttendanceRegisterDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    academicYearId: row.academic_year_id,
    classId: row.class_id,
    sectionId: row.section_id,
    configVersionId: row.config_version_id,
    method: row.method,
    owner: row.owner,
    attendanceDate: row.attendance_date,
    slotKind: row.slot_kind,
    slotCode: row.slot_code,
    periodIndex: row.period_index,
    timetableSlotId: row.timetable_slot_id,
    slotLabel: row.slot_label,
    subjectLabel: row.subject_label,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    markedByTeacherId: row.marked_by_teacher_id,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    marks: marks?.map(toMarkDto),
  };
}

function isStaffWriter(actor: Actor, instituteId: string): boolean {
  return ATTENDANCE_STAFF_WRITE_ROLES.some((role) =>
    actorHasInstituteRole(actor, instituteId, role),
  );
}

function isStaffReader(actor: Actor, instituteId: string): boolean {
  const membership = actor.memberships.find((m) => m.instituteId === instituteId);
  if (actor.isPlatformOperator) return true;
  if (!membership) return false;
  return ATTENDANCE_STAFF_READ_ROLES.some((role) => membership.roles.includes(role));
}

/**
 * Teacher may mark when they have an active assignment on the section graph.
 * Staff override roles skip assignment. Never trust client teacher ids.
 */
export async function assertCanWriteAttendance(
  admin: SupabaseClient,
  actor: Actor,
  input: {
    instituteId: string;
    sectionId: string;
    academicYearId: string;
    classId: string;
  },
): Promise<{ markedByTeacherId: string | null }> {
  requireInstituteId(actor, input.instituteId);

  if (actor.isPlatformOperator || isStaffWriter(actor, input.instituteId)) {
    const teacher = actor.teachers.find(
      (t) => t.instituteId === input.instituteId && t.status === "active",
    );
    return { markedByTeacherId: teacher?.teacherId ?? null };
  }

  if (!actorHasInstituteRole(actor, input.instituteId, "teacher")) {
    throw AppError.forbidden("Insufficient institute role");
  }

  const identity = requireTeacherIdentity(actor, input.instituteId);
  const assignment = await findTeacherSectionAssignment(admin, {
    teacherId: identity.teacherId,
    instituteId: input.instituteId,
    sectionId: input.sectionId,
    academicYearId: input.academicYearId,
    classId: input.classId,
  });
  if (!assignment) {
    throw AppError.forbidden("Teacher is not assigned to this section");
  }
  return { markedByTeacherId: identity.teacherId };
}

async function resolveAccessibleStudentIds(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
): Promise<Set<string> | null> {
  // null = staff/platform full institute read after staff gate
  if (isStaffReader(actor, instituteId)) {
    return null;
  }

  const ids = new Set<string>();
  for (const s of actor.students) {
    if (s.instituteId === instituteId) ids.add(s.studentId);
  }
  for (const p of actor.parents) {
    if (p.instituteId !== instituteId) continue;
    const linked = await listGuardianStudentIds(admin, p.parentId);
    for (const sid of linked) ids.add(sid);
  }
  return ids;
}

/**
 * Authorize register read.
 * Returns `null` for staff/platform (full marks).
 * Returns a non-empty student-id set for learner/parent (must filter marks).
 */
async function assertCanReadRegister(
  admin: SupabaseClient,
  actor: Actor,
  register: AttendanceRegisterRow,
  marks: AttendanceMarkRow[],
): Promise<Set<string> | null> {
  assertInstituteAccess(actor, register.institute_id);
  const accessible = await resolveAccessibleStudentIds(
    admin,
    actor,
    register.institute_id,
  );
  if (accessible === null) return null;
  if (accessible.size === 0) {
    throw AppError.forbidden("Insufficient permissions");
  }
  const allowed = marks.some((m) => accessible.has(m.student_id));
  if (!allowed) {
    throw AppError.forbidden("Insufficient permissions");
  }
  return accessible;
}

function filterMarksForAccessibleStudents(
  marks: AttendanceMarkRow[],
  accessible: Set<string> | null,
): AttendanceMarkRow[] {
  if (accessible === null) return marks;
  return marks.filter((m) => accessible.has(m.student_id));
}

async function validateMarksAgainstSection(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    sectionId: string;
    academicYearId: string;
    classId: string;
    marks: ExplicitMarkInput[];
  },
): Promise<Array<{ enrollmentId: string; studentId: string; status: ExplicitMarkInput["status"] }>> {
  if (input.marks.length === 0) {
    throw AppError.validation("At least one mark is required", {
      marks: ["Required"],
    });
  }

  const enrollmentIds = input.marks.map((m) => m.enrollmentId);
  if (new Set(enrollmentIds).size !== enrollmentIds.length) {
    throw AppError.validation("Duplicate enrollment_id in marks", {
      marks: ["Each enrollment_id must be unique"],
    });
  }

  const enrollments = await findEnrollmentsByIds(admin, enrollmentIds);
  const byId = new Map(enrollments.map((e) => [e.id, e]));

  const resolved: Array<{
    enrollmentId: string;
    studentId: string;
    status: ExplicitMarkInput["status"];
  }> = [];

  for (const mark of input.marks) {
    const enrollment = byId.get(mark.enrollmentId);
    if (!enrollment || enrollment.status !== "active") {
      throw AppError.validation("Referenced resource is invalid", {
        enrollment_id: ["Enrollment not found or inactive"],
      });
    }
    if (
      enrollment.institute_id !== input.instituteId ||
      enrollment.section_id !== input.sectionId ||
      enrollment.academic_year_id !== input.academicYearId ||
      enrollment.class_id !== input.classId
    ) {
      throw AppError.validation("Referenced resource is invalid", {
        enrollment_id: ["Enrollment does not match register section graph"],
      });
    }
    resolved.push({
      enrollmentId: enrollment.id,
      studentId: enrollment.student_id,
      status: mark.status,
    });
  }
  return resolved;
}

async function assertSectionGraph(
  admin: SupabaseClient,
  input: {
    sectionId: string;
    instituteId: string;
    academicYearId: string;
    classId: string;
  },
): Promise<void> {
  const section = await findSectionById(admin, input.sectionId);
  if (!section) {
    throw AppError.validation("Referenced resource is invalid", {
      section_id: ["Section not found"],
    });
  }
  if (
    section.institute_id !== input.instituteId ||
    section.academic_year_id !== input.academicYearId ||
    section.class_id !== input.classId
  ) {
    throw AppError.validation("Referenced resource is invalid", {
      section_id: ["Section does not match institute/year/class"],
    });
  }
}

async function assertOptionalTimetableSlot(
  admin: SupabaseClient,
  input: {
    timetableSlotId: string | null | undefined;
    instituteId: string;
    academicYearId: string;
    classId: string;
    sectionId: string;
  },
): Promise<void> {
  if (!input.timetableSlotId) return;
  const slot = await findTimetableSlotGraph(admin, input.timetableSlotId);
  if (!slot) {
    throw AppError.validation("Referenced resource is invalid", {
      timetable_slot_id: ["Timetable slot not found"],
    });
  }
  if (
    slot.institute_id !== input.instituteId ||
    slot.academic_year_id !== input.academicYearId ||
    slot.class_id !== input.classId ||
    slot.section_id !== input.sectionId
  ) {
    throw AppError.validation("Referenced resource is invalid", {
      timetable_slot_id: ["Timetable slot does not match register graph"],
    });
  }
}

export async function listConfigForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
): Promise<AttendanceConfigVersionDto[]> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  assertInstituteRoles(actor, instituteId, [...ATTENDANCE_STAFF_READ_ROLES]);
  const rows = await listConfigVersions(admin, instituteId);
  return rows.map(toConfigDto);
}

export async function createConfigForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateConfigInput,
): Promise<AttendanceConfigVersionDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertInstituteRoles(actor, instituteId, [...ATTENDANCE_CONFIG_WRITE_ROLES]);
  const row = await insertConfigVersion(admin, {
    ...input,
    instituteId,
    createdByUserProfileId: actor.profileId,
  });
  return toConfigDto(row);
}

export async function listRegistersForActor(
  admin: SupabaseClient,
  actor: Actor,
  filter: ListRegistersFilter,
): Promise<AttendanceRegisterDto[]> {
  const instituteId = requireInstituteId(actor, filter.instituteId);
  const accessible = await resolveAccessibleStudentIds(admin, actor, instituteId);

  if (accessible === null) {
    // staff
  } else if (accessible.size === 0) {
    throw AppError.forbidden("Insufficient permissions");
  }

  const rows = await listRegisters(admin, { ...filter, instituteId });
  if (accessible === null) {
    return rows.map((r) => toRegisterDto(r));
  }

  // Learner/parent: only registers that include their student marks
  const visible: AttendanceRegisterDto[] = [];
  for (const row of rows) {
    const marks = await listMarksForRegister(admin, row.id);
    if (marks.some((m) => accessible.has(m.student_id))) {
      visible.push(toRegisterDto(row));
    }
  }
  return visible;
}

export async function getRegisterForActor(
  admin: SupabaseClient,
  actor: Actor,
  registerId: string,
): Promise<AttendanceRegisterDto> {
  const row = await findRegisterById(admin, registerId);
  if (!row) throw AppError.notFound("Attendance register not found");
  const marks = await listMarksForRegister(admin, row.id);
  const accessible = await assertCanReadRegister(admin, actor, row, marks);
  const visibleMarks = filterMarksForAccessibleStudents(marks, accessible);
  return toRegisterDto(row, visibleMarks);
}

export async function createRegisterForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateRegisterInput,
): Promise<AttendanceRegisterDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);

  await assertSectionGraph(admin, {
    sectionId: input.sectionId,
    instituteId,
    academicYearId: input.academicYearId,
    classId: input.classId,
  });

  const config = await findConfigVersionById(admin, input.configVersionId);
  if (!config || config.institute_id !== instituteId) {
    throw AppError.validation("Referenced resource is invalid", {
      config_version_id: ["Config version not found in this institute"],
    });
  }

  if (input.slotKind === "period" && input.periodIndex == null) {
    throw AppError.validation("period_index is required for period slots", {
      period_index: ["Required"],
    });
  }

  await assertOptionalTimetableSlot(admin, {
    timetableSlotId: input.timetableSlotId,
    instituteId,
    academicYearId: input.academicYearId,
    classId: input.classId,
    sectionId: input.sectionId,
  });

  const { markedByTeacherId } = await assertCanWriteAttendance(admin, actor, {
    instituteId,
    sectionId: input.sectionId,
    academicYearId: input.academicYearId,
    classId: input.classId,
  });

  const resolvedMarks = await validateMarksAgainstSection(admin, {
    instituteId,
    sectionId: input.sectionId,
    academicYearId: input.academicYearId,
    classId: input.classId,
    marks: input.marks,
  });

  const register = await insertRegister(admin, {
    ...input,
    instituteId,
    method: config.method,
    owner: config.owner,
    markedByTeacherId,
  });

  const markRows = await insertMarks(
    admin,
    resolvedMarks.map((m) => ({
      instituteId,
      registerId: register.id,
      studentId: m.studentId,
      enrollmentId: m.enrollmentId,
      status: m.status,
    })),
  );

  return toRegisterDto(register, markRows);
}

export async function updateRegisterForActor(
  admin: SupabaseClient,
  actor: Actor,
  registerId: string,
  patch: UpdateRegisterInput,
): Promise<AttendanceRegisterDto> {
  const existing = await findRegisterById(admin, registerId);
  if (!existing) throw AppError.notFound("Attendance register not found");
  if (existing.status === "submitted") {
    throw AppError.conflict("Submitted attendance registers are immutable");
  }

  await assertCanWriteAttendance(admin, actor, {
    instituteId: existing.institute_id,
    sectionId: existing.section_id,
    academicYearId: existing.academic_year_id,
    classId: existing.class_id,
  });

  const nextSlotId =
    patch.timetableSlotId !== undefined
      ? patch.timetableSlotId
      : existing.timetable_slot_id;
  await assertOptionalTimetableSlot(admin, {
    timetableSlotId: nextSlotId,
    instituteId: existing.institute_id,
    academicYearId: existing.academic_year_id,
    classId: existing.class_id,
    sectionId: existing.section_id,
  });

  const fieldPatch: Record<string, unknown> = {};
  if (patch.slotLabel !== undefined) fieldPatch.slot_label = patch.slotLabel;
  if (patch.subjectLabel !== undefined) fieldPatch.subject_label = patch.subjectLabel;
  if (patch.startsAt !== undefined) fieldPatch.starts_at = patch.startsAt;
  if (patch.endsAt !== undefined) fieldPatch.ends_at = patch.endsAt;
  if (patch.periodIndex !== undefined) fieldPatch.period_index = patch.periodIndex;
  if (patch.timetableSlotId !== undefined) {
    fieldPatch.timetable_slot_id = patch.timetableSlotId;
  }

  let register = existing;
  if (Object.keys(fieldPatch).length > 0) {
    register = await updateRegisterDraftFields(admin, registerId, fieldPatch);
  }

  let marks = await listMarksForRegister(admin, registerId);
  if (patch.marks) {
    const resolved = await validateMarksAgainstSection(admin, {
      instituteId: existing.institute_id,
      sectionId: existing.section_id,
      academicYearId: existing.academic_year_id,
      classId: existing.class_id,
      marks: patch.marks,
    });
    await softDeleteMarksForRegister(admin, registerId);
    marks = await insertMarks(
      admin,
      resolved.map((m) => ({
        instituteId: existing.institute_id,
        registerId: registerId,
        studentId: m.studentId,
        enrollmentId: m.enrollmentId,
        status: m.status,
      })),
    );
  }

  return toRegisterDto(register, marks);
}

export async function submitRegisterForActor(
  admin: SupabaseClient,
  actor: Actor,
  registerId: string,
): Promise<AttendanceRegisterDto> {
  const existing = await findRegisterById(admin, registerId);
  if (!existing) throw AppError.notFound("Attendance register not found");
  if (existing.status === "submitted") {
    throw AppError.conflict("Attendance register is already submitted");
  }

  await assertCanWriteAttendance(admin, actor, {
    instituteId: existing.institute_id,
    sectionId: existing.section_id,
    academicYearId: existing.academic_year_id,
    classId: existing.class_id,
  });

  const marks = await listMarksForRegister(admin, registerId);
  if (marks.length === 0) {
    throw AppError.validation("Cannot submit a register without marks", {
      marks: ["Required"],
    });
  }

  const submitted = await submitRegister(
    admin,
    registerId,
    new Date().toISOString(),
  );
  if (!submitted) {
    // Concurrent submit won the race — treat as already submitted.
    throw AppError.conflict("Attendance register is already submitted");
  }

  const { emitAttendanceRegisterSubmittedNotifications } = await import(
    "./notifications.js"
  );
  await emitAttendanceRegisterSubmittedNotifications(
    admin,
    actor.userId,
    submitted,
    marks,
  );

  return toRegisterDto(submitted, marks);
}
