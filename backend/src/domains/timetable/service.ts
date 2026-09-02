import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteRoles,
  requireInstituteId,
} from "../../authorization/index.js";
import {
  activateInactiveSlotsForSection,
  findActiveAssignmentById,
  findAssignmentIdsForTeacher,
  findSectionById,
  findSubjectInInstitute,
  findTeacherInInstitute,
  findTimetableSlotById,
  insertTeacherAssignment,
  insertTimetableSlot,
  listTeacherAssignments,
  listTimetableSlots,
  softDeleteTimetableSlot,
  updateTimetableSlot,
} from "./repository.js";
import { emitTimetableSectionPublishedNotifications } from "./notifications.js";
import type {
  CreateTeacherAssignmentInput,
  CreateTimetableSlotInput,
  ListTeacherAssignmentsFilter,
  ListTimetableSlotsFilter,
  TeacherAssignmentDto,
  TimetableSlotDto,
  TimetableSlotRow,
  UpdateTimetableSlotInput,
} from "./types.js";

/** Matches Admin product: timetable editing is staff-scoped, not teacher self-serve. */
export const TIMETABLE_WRITE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
] as const;

/** Staff read (aligned with is_staff_of_institute role set). */
export const TIMETABLE_READ_ROLES = [
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

export function toTimetableSlotDto(row: TimetableSlotRow): TimetableSlotDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    academicYearId: row.academic_year_id,
    classId: row.class_id,
    sectionId: row.section_id,
    teacherAssignmentId: row.teacher_assignment_id,
    dayOfWeek: row.day_of_week,
    periodIndex: row.period_index,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    room: row.room,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toTeacherAssignmentDto(row: {
  id: string;
  institute_id: string;
  academic_year_id: string;
  class_id: string;
  section_id: string;
  subject_id: string;
  teacher_id: string;
  status: string;
}): TeacherAssignmentDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    academicYearId: row.academic_year_id,
    classId: row.class_id,
    sectionId: row.section_id,
    subjectId: row.subject_id,
    teacherId: row.teacher_id,
    status: row.status === "inactive" ? "inactive" : "active",
  };
}

function assertCanReadTimetable(actor: Actor, instituteId: string): void {
  assertInstituteRoles(actor, instituteId, [...TIMETABLE_READ_ROLES]);
}

function assertCanWriteTimetable(actor: Actor, instituteId: string): void {
  assertInstituteRoles(actor, instituteId, [...TIMETABLE_WRITE_ROLES]);
}

/**
 * Ensure teacher_assignment graph matches the slot's institute/year/class/section.
 * Rejects cross-tenant remix via mismatched assignment.
 */
async function assertAssignmentMatchesSlotGraph(
  admin: SupabaseClient,
  input: {
    teacherAssignmentId: string;
    instituteId: string;
    academicYearId: string;
    classId: string;
    sectionId: string;
  },
): Promise<void> {
  const assignment = await findActiveAssignmentById(
    admin,
    input.teacherAssignmentId,
  );
  if (!assignment) {
    throw AppError.validation("Referenced resource is invalid", {
      teacher_assignment_id: ["Assignment not found or inactive"],
    });
  }

  if (
    assignment.institute_id !== input.instituteId ||
    assignment.academic_year_id !== input.academicYearId ||
    assignment.class_id !== input.classId ||
    assignment.section_id !== input.sectionId
  ) {
    throw AppError.validation("Referenced resource is invalid", {
      teacher_assignment_id: [
        "Assignment does not match institute/year/class/section",
      ],
    });
  }
}

async function assertSectionMatchesGraph(
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

export async function createAssignmentForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateTeacherAssignmentInput,
): Promise<TeacherAssignmentDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertCanWriteTimetable(actor, instituteId);

  await assertSectionMatchesGraph(admin, {
    sectionId: input.sectionId,
    instituteId,
    academicYearId: input.academicYearId,
    classId: input.classId,
  });

  const teacher = await findTeacherInInstitute(admin, {
    teacherId: input.teacherId,
    instituteId,
  });
  if (!teacher) {
    throw AppError.validation("Referenced resource is invalid", {
      teacher_id: ["Teacher not found in this institute"],
    });
  }

  const subject = await findSubjectInInstitute(admin, {
    subjectId: input.subjectId,
    instituteId,
  });
  if (!subject) {
    throw AppError.validation("Referenced resource is invalid", {
      subject_id: ["Subject not found in this institute"],
    });
  }

  const row = await insertTeacherAssignment(admin, {
    instituteId,
    academicYearId: input.academicYearId,
    classId: input.classId,
    sectionId: input.sectionId,
    subjectId: input.subjectId,
    teacherId: input.teacherId,
    status: input.status ?? "active",
  });
  return toTeacherAssignmentDto(row);
}

export async function listAssignmentsForActor(
  admin: SupabaseClient,
  actor: Actor,
  filter: ListTeacherAssignmentsFilter,
): Promise<TeacherAssignmentDto[]> {
  const instituteId = requireInstituteId(actor, filter.instituteId);
  assertCanReadTimetable(actor, instituteId);

  const rows = await listTeacherAssignments(admin, {
    instituteId,
    academicYearId: filter.academicYearId,
    sectionId: filter.sectionId,
    classId: filter.classId,
    teacherId: filter.teacherId,
    status: filter.status ?? "active",
  });
  return rows.map(toTeacherAssignmentDto);
}

export async function listSlotsForActor(
  admin: SupabaseClient,
  actor: Actor,
  filter: ListTimetableSlotsFilter,
): Promise<TimetableSlotDto[]> {
  const instituteId = requireInstituteId(actor, filter.instituteId);
  assertCanReadTimetable(actor, instituteId);

  let assignmentIds: string[] | undefined;
  if (filter.teacherId) {
    const teacher = await findTeacherInInstitute(admin, {
      teacherId: filter.teacherId,
      instituteId,
    });
    if (!teacher) {
      throw AppError.validation("Referenced resource is invalid", {
        teacher_id: ["Teacher not found in this institute"],
      });
    }
    assignmentIds = await findAssignmentIdsForTeacher(admin, {
      instituteId,
      teacherId: filter.teacherId,
      academicYearId: filter.academicYearId,
    });
  }

  const rows = await listTimetableSlots(
    admin,
    { ...filter, instituteId },
    assignmentIds,
  );
  return rows.map(toTimetableSlotDto);
}

export async function getSlotForActor(
  admin: SupabaseClient,
  actor: Actor,
  slotId: string,
): Promise<TimetableSlotDto> {
  const row = await findTimetableSlotById(admin, slotId);
  if (!row) {
    throw AppError.notFound("Timetable slot not found");
  }
  requireInstituteId(actor, row.institute_id);
  assertCanReadTimetable(actor, row.institute_id);
  return toTimetableSlotDto(row);
}

export async function createSlotForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateTimetableSlotInput,
): Promise<TimetableSlotDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertCanWriteTimetable(actor, instituteId);

  await assertSectionMatchesGraph(admin, {
    sectionId: input.sectionId,
    instituteId,
    academicYearId: input.academicYearId,
    classId: input.classId,
  });

  await assertAssignmentMatchesSlotGraph(admin, {
    teacherAssignmentId: input.teacherAssignmentId,
    instituteId,
    academicYearId: input.academicYearId,
    classId: input.classId,
    sectionId: input.sectionId,
  });

  const row = await insertTimetableSlot(admin, {
    ...input,
    instituteId,
    status: input.status ?? "active",
  });
  return toTimetableSlotDto(row);
}

export async function updateSlotForActor(
  admin: SupabaseClient,
  actor: Actor,
  slotId: string,
  patch: UpdateTimetableSlotInput,
): Promise<TimetableSlotDto> {
  const existing = await findTimetableSlotById(admin, slotId);
  if (!existing) {
    throw AppError.notFound("Timetable slot not found");
  }

  const instituteId = requireInstituteId(actor, existing.institute_id);
  assertCanWriteTimetable(actor, instituteId);

  const next = {
    academicYearId: patch.academicYearId ?? existing.academic_year_id,
    classId: patch.classId ?? existing.class_id,
    sectionId: patch.sectionId ?? existing.section_id,
    teacherAssignmentId:
      patch.teacherAssignmentId ?? existing.teacher_assignment_id,
  };

  if (
    patch.sectionId !== undefined ||
    patch.academicYearId !== undefined ||
    patch.classId !== undefined
  ) {
    await assertSectionMatchesGraph(admin, {
      sectionId: next.sectionId,
      instituteId,
      academicYearId: next.academicYearId,
      classId: next.classId,
    });
  }

  if (
    patch.teacherAssignmentId !== undefined ||
    patch.sectionId !== undefined ||
    patch.academicYearId !== undefined ||
    patch.classId !== undefined
  ) {
    await assertAssignmentMatchesSlotGraph(admin, {
      teacherAssignmentId: next.teacherAssignmentId,
      instituteId,
      academicYearId: next.academicYearId,
      classId: next.classId,
      sectionId: next.sectionId,
    });
  }

  const row = await updateTimetableSlot(admin, slotId, patch);
  return toTimetableSlotDto(row);
}

export async function deleteSlotForActor(
  admin: SupabaseClient,
  actor: Actor,
  slotId: string,
): Promise<void> {
  const existing = await findTimetableSlotById(admin, slotId);
  if (!existing) {
    throw AppError.notFound("Timetable slot not found");
  }
  const instituteId = requireInstituteId(actor, existing.institute_id);
  assertCanWriteTimetable(actor, instituteId);
  await softDeleteTimetableSlot(admin, slotId);
}

export async function publishSectionTimetableForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: { instituteId: string; sectionId: string },
): Promise<{ sectionId: string; activatedCount: number }> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertCanWriteTimetable(actor, instituteId);

  const section = await findSectionById(admin, input.sectionId);
  if (!section || section.institute_id !== instituteId) {
    throw AppError.notFound("Section not found");
  }

  const activated = await activateInactiveSlotsForSection(admin, {
    instituteId,
    sectionId: input.sectionId,
  });

  if (activated.length > 0) {
    const classRes = await admin
      .from("class")
      .select("name, code")
      .eq("id", section.class_id)
      .maybeSingle();
    const classRow = classRes.data as { name: string | null; code: string | null } | null;
    const classLabel =
      classRow?.name?.trim() || classRow?.code?.trim() || "Class";

    const sectionRes = await admin
      .from("section")
      .select("name, code")
      .eq("id", input.sectionId)
      .maybeSingle();
    const sectionRow = sectionRes.data as { name: string | null; code: string | null } | null;
    const sectionLabel =
      sectionRow?.code?.trim() || sectionRow?.name?.trim() || "—";

    await emitTimetableSectionPublishedNotifications(admin, actor.userId, {
      instituteId,
      sectionId: input.sectionId,
      academicYearId: section.academic_year_id,
      classLabel,
      sectionLabel,
      activatedCount: activated.length,
    });
  }

  return { sectionId: input.sectionId, activatedCount: activated.length };
}
