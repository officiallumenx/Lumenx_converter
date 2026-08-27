import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteAccess,
  assertInstituteRoles,
  requireInstituteId,
} from "../../authorization/index.js";
import {
  findAcademicYearById,
  findExamById,
  findSectionById,
  findSubjectById,
  findTeacherById,
  insertExam,
  insertSchedules,
  insertTargets,
  listActiveEnrollmentsForStudents,
  listExams,
  listGuardianStudentIds,
  listSchedulesForExam,
  listSchedulesForExamIds,
  listTargetsForExam,
  listTargetsForExamIds,
  softDeleteExam,
  softDeleteSchedulesForExam,
  softDeleteTargetsForExam,
  updateExamFields,
  type EnrollmentAudienceRow,
} from "./repository.js";
import type {
  CreateExamInput,
  ExamDto,
  ExamRow,
  ExamSubjectScheduleDto,
  ExamSubjectScheduleRow,
  ExamTargetSectionDto,
  ExamTargetSectionRow,
  ListExamsFilter,
  SubjectScheduleInput,
  TargetSectionInput,
  UpdateExamInput,
} from "./types.js";

export const EXAM_WRITE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
] as const;

export const EXAM_STAFF_READ_ROLES = [
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

export function toTargetDto(row: ExamTargetSectionRow): ExamTargetSectionDto {
  return {
    id: row.id,
    classId: row.class_id,
    sectionId: row.section_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toScheduleDto(row: ExamSubjectScheduleRow): ExamSubjectScheduleDto {
  return {
    id: row.id,
    subjectId: row.subject_id,
    paperDate: row.paper_date,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    room: row.room,
    invigilatorTeacherId: row.invigilator_teacher_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toExamDto(
  row: ExamRow,
  targets: ExamTargetSectionRow[],
  schedules: ExamSubjectScheduleRow[],
): ExamDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    academicYearId: row.academic_year_id,
    name: row.name,
    header: row.header,
    startDate: row.start_date,
    endDate: row.end_date,
    defaultStartsAt: row.default_starts_at,
    defaultEndsAt: row.default_ends_at,
    totalMarks: row.total_marks,
    internalMarks: row.internal_marks,
    externalMarks: row.external_marks,
    audienceScope: row.audience_scope,
    scheduleStatus: row.schedule_status,
    lifecycleStatus: row.lifecycle_status,
    schedulePublishedAt: row.schedule_published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    targetSections: targets.map(toTargetDto),
    subjectSchedules: schedules.map(toScheduleDto),
  };
}

function isStaffReader(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  const membership = actor.memberships.find((m) => m.instituteId === instituteId);
  if (!membership) return false;
  return EXAM_STAFF_READ_ROLES.some((role) => membership.roles.includes(role));
}

function assertCanWrite(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  if (actor.isPlatformOperator) return;
  assertInstituteRoles(actor, instituteId, [...EXAM_WRITE_ROLES]);
}

async function resolveAccessibleStudentIds(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
): Promise<Set<string>> {
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

function examVisibleToEnrollments(
  exam: ExamRow,
  targets: ExamTargetSectionRow[],
  enrollments: EnrollmentAudienceRow[],
): boolean {
  if (exam.schedule_status !== "published") return false;
  return enrollments.some((e) => {
    if (e.academic_year_id !== exam.academic_year_id) return false;
    if (exam.audience_scope === "year") return true;
    return targets.some((t) => t.section_id === e.section_id);
  });
}

function assertMarksScheme(input: {
  totalMarks: number;
  internalMarks: number | null | undefined;
  externalMarks: number | null | undefined;
}): void {
  if (input.totalMarks <= 0) {
    throw AppError.validation("total_marks must be greater than 0", {
      total_marks: ["Must be > 0"],
    });
  }
  const internal = input.internalMarks ?? null;
  const external = input.externalMarks ?? null;
  if (internal != null && (internal < 0 || internal > input.totalMarks)) {
    throw AppError.validation("internal_marks out of range", {
      internal_marks: ["Must be between 0 and total_marks"],
    });
  }
  if (external != null && (external < 0 || external > input.totalMarks)) {
    throw AppError.validation("external_marks out of range", {
      external_marks: ["Must be between 0 and total_marks"],
    });
  }
  if (internal != null && external != null && internal + external !== input.totalMarks) {
    throw AppError.validation("Marks components must sum to total_marks", {
      internal_marks: ["internal_marks + external_marks must equal total_marks"],
    });
  }
}

function assertDateWindow(startDate: string, endDate: string): void {
  if (endDate < startDate) {
    throw AppError.validation("end_date must be on or after start_date", {
      end_date: ["Must be >= start_date"],
    });
  }
}

function assertDefaultTimes(startsAt: string, endsAt: string): void {
  if (endsAt <= startsAt) {
    throw AppError.validation("default_ends_at must be after default_starts_at", {
      default_ends_at: ["Must be after default_starts_at"],
    });
  }
}

async function validateTargets(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    academicYearId: string;
    audienceScope: "year" | "section";
    targets: TargetSectionInput[];
  },
): Promise<TargetSectionInput[]> {
  if (input.audienceScope === "year") {
    if (input.targets.length > 0) {
      throw AppError.validation("Year-scope exams cannot include target sections", {
        target_sections: ["Must be empty when audience_scope is year"],
      });
    }
    return [];
  }

  if (input.targets.length === 0) {
    throw AppError.validation("Section-scope exams require target sections", {
      target_sections: ["At least one section is required"],
    });
  }

  const sectionIds = input.targets.map((t) => t.sectionId);
  if (new Set(sectionIds).size !== sectionIds.length) {
    throw AppError.validation("Duplicate section_id in target_sections", {
      target_sections: ["Each section_id must be unique"],
    });
  }

  const resolved: TargetSectionInput[] = [];
  for (const target of input.targets) {
    const section = await findSectionById(admin, target.sectionId);
    if (!section) {
      throw AppError.validation("Referenced resource is invalid", {
        section_id: ["Section not found"],
      });
    }
    if (
      section.institute_id !== input.instituteId ||
      section.academic_year_id !== input.academicYearId ||
      section.class_id !== target.classId
    ) {
      throw AppError.validation("Referenced resource is invalid", {
        section_id: ["Section does not match institute/year/class"],
      });
    }
    resolved.push({ sectionId: section.id, classId: section.class_id });
  }
  return resolved;
}

async function validateSchedules(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    startDate: string;
    endDate: string;
    schedules: SubjectScheduleInput[];
  },
): Promise<SubjectScheduleInput[]> {
  const subjectIds = input.schedules.map((s) => s.subjectId);
  if (new Set(subjectIds).size !== subjectIds.length) {
    throw AppError.validation("Duplicate subject_id in subject_schedules", {
      subject_schedules: ["Each subject_id must be unique"],
    });
  }

  const resolved: SubjectScheduleInput[] = [];
  for (const schedule of input.schedules) {
    if (schedule.endsAt <= schedule.startsAt) {
      throw AppError.validation("Schedule ends_at must be after starts_at", {
        ends_at: ["Must be after starts_at"],
      });
    }
    if (
      schedule.paperDate < input.startDate ||
      schedule.paperDate > input.endDate
    ) {
      throw AppError.validation("paper_date must fall within exam window", {
        paper_date: ["Must be between start_date and end_date"],
      });
    }

    const subject = await findSubjectById(admin, schedule.subjectId);
    if (!subject || subject.institute_id !== input.instituteId) {
      throw AppError.validation("Referenced resource is invalid", {
        subject_id: ["Subject not found in this institute"],
      });
    }

    let invigilatorTeacherId: string | null =
      schedule.invigilatorTeacherId ?? null;
    if (invigilatorTeacherId) {
      const teacher = await findTeacherById(admin, invigilatorTeacherId);
      if (
        !teacher ||
        teacher.institute_id !== input.instituteId ||
        teacher.status !== "active"
      ) {
        throw AppError.validation("Referenced resource is invalid", {
          invigilator_teacher_id: ["Teacher not found in this institute"],
        });
      }
      invigilatorTeacherId = teacher.id;
    }

    resolved.push({
      subjectId: subject.id,
      paperDate: schedule.paperDate,
      startsAt: schedule.startsAt,
      endsAt: schedule.endsAt,
      room: schedule.room ?? null,
      invigilatorTeacherId,
    });
  }
  return resolved;
}

async function loadExamBundle(
  admin: SupabaseClient,
  exam: ExamRow,
): Promise<ExamDto> {
  const [targets, schedules] = await Promise.all([
    listTargetsForExam(admin, exam.id),
    listSchedulesForExam(admin, exam.id),
  ]);
  return toExamDto(exam, targets, schedules);
}

export async function listExamsForActor(
  admin: SupabaseClient,
  actor: Actor,
  filter: ListExamsFilter,
): Promise<ExamDto[]> {
  const instituteId = requireInstituteId(actor, filter.instituteId);
  const rows = await listExams(admin, { ...filter, instituteId });

  if (isStaffReader(actor, instituteId)) {
    const ids = rows.map((r) => r.id);
    const [targets, schedules] = await Promise.all([
      listTargetsForExamIds(admin, ids),
      listSchedulesForExamIds(admin, ids),
    ]);
    const targetsByExam = new Map<string, ExamTargetSectionRow[]>();
    const schedulesByExam = new Map<string, ExamSubjectScheduleRow[]>();
    for (const t of targets) {
      const list = targetsByExam.get(t.exam_id) ?? [];
      list.push(t);
      targetsByExam.set(t.exam_id, list);
    }
    for (const s of schedules) {
      const list = schedulesByExam.get(s.exam_id) ?? [];
      list.push(s);
      schedulesByExam.set(s.exam_id, list);
    }
    return rows.map((r) =>
      toExamDto(r, targetsByExam.get(r.id) ?? [], schedulesByExam.get(r.id) ?? []),
    );
  }

  // Learner / parent: published + audience only
  const accessibleStudents = await resolveAccessibleStudentIds(
    admin,
    actor,
    instituteId,
  );
  if (accessibleStudents.size === 0) {
    throw AppError.forbidden("Insufficient permissions");
  }

  const enrollments = await listActiveEnrollmentsForStudents(admin, {
    instituteId,
    studentIds: [...accessibleStudents],
  });
  if (enrollments.length === 0) {
    return [];
  }

  const published = rows.filter((r) => r.schedule_status === "published");
  const ids = published.map((r) => r.id);
  const targets = await listTargetsForExamIds(admin, ids);
  const schedules = await listSchedulesForExamIds(admin, ids);
  const targetsByExam = new Map<string, ExamTargetSectionRow[]>();
  const schedulesByExam = new Map<string, ExamSubjectScheduleRow[]>();
  for (const t of targets) {
    const list = targetsByExam.get(t.exam_id) ?? [];
    list.push(t);
    targetsByExam.set(t.exam_id, list);
  }
  for (const s of schedules) {
    const list = schedulesByExam.get(s.exam_id) ?? [];
    list.push(s);
    schedulesByExam.set(s.exam_id, list);
  }

  const visible: ExamDto[] = [];
  for (const exam of published) {
    const examTargets = targetsByExam.get(exam.id) ?? [];
    if (examVisibleToEnrollments(exam, examTargets, enrollments)) {
      visible.push(
        toExamDto(exam, examTargets, schedulesByExam.get(exam.id) ?? []),
      );
    }
  }
  return visible;
}

export async function getExamForActor(
  admin: SupabaseClient,
  actor: Actor,
  examId: string,
): Promise<ExamDto> {
  const exam = await findExamById(admin, examId);
  if (!exam) throw AppError.notFound("Exam not found");

  assertInstituteAccess(actor, exam.institute_id);

  if (isStaffReader(actor, exam.institute_id)) {
    return loadExamBundle(admin, exam);
  }

  const accessibleStudents = await resolveAccessibleStudentIds(
    admin,
    actor,
    exam.institute_id,
  );
  if (accessibleStudents.size === 0) {
    throw AppError.forbidden("Insufficient permissions");
  }

  const enrollments = await listActiveEnrollmentsForStudents(admin, {
    instituteId: exam.institute_id,
    studentIds: [...accessibleStudents],
  });
  const targets = await listTargetsForExam(admin, exam.id);
  if (!examVisibleToEnrollments(exam, targets, enrollments)) {
    throw AppError.forbidden("Insufficient permissions");
  }
  const schedules = await listSchedulesForExam(admin, exam.id);
  return toExamDto(exam, targets, schedules);
}

export async function createExamForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateExamInput,
): Promise<ExamDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertCanWrite(actor, instituteId);

  const year = await findAcademicYearById(admin, input.academicYearId);
  if (!year || year.institute_id !== instituteId) {
    throw AppError.validation("Referenced resource is invalid", {
      academic_year_id: ["Academic year not found in this institute"],
    });
  }

  assertDateWindow(input.startDate, input.endDate);
  assertDefaultTimes(input.defaultStartsAt, input.defaultEndsAt);
  assertMarksScheme({
    totalMarks: input.totalMarks,
    internalMarks: input.internalMarks,
    externalMarks: input.externalMarks,
  });

  const targets = await validateTargets(admin, {
    instituteId,
    academicYearId: input.academicYearId,
    audienceScope: input.audienceScope,
    targets: input.targetSections ?? [],
  });

  const schedules = await validateSchedules(admin, {
    instituteId,
    startDate: input.startDate,
    endDate: input.endDate,
    schedules: input.subjectSchedules ?? [],
  });

  const exam = await insertExam(admin, {
    ...input,
    instituteId,
    internalMarks: input.internalMarks ?? null,
    externalMarks: input.externalMarks ?? null,
  });

  const targetRows = await insertTargets(admin, exam, targets);
  const scheduleRows = await insertSchedules(admin, exam, schedules);
  return toExamDto(exam, targetRows, scheduleRows);
}

export async function updateExamForActor(
  admin: SupabaseClient,
  actor: Actor,
  examId: string,
  patch: UpdateExamInput,
): Promise<ExamDto> {
  const existing = await findExamById(admin, examId);
  if (!existing) throw AppError.notFound("Exam not found");

  assertCanWrite(actor, existing.institute_id);

  if (existing.lifecycle_status === "closed") {
    throw AppError.conflict("Closed exams are immutable");
  }

  const nextStart = patch.startDate ?? existing.start_date;
  const nextEnd = patch.endDate ?? existing.end_date;
  const nextStartsAt = patch.defaultStartsAt ?? existing.default_starts_at;
  const nextEndsAt = patch.defaultEndsAt ?? existing.default_ends_at;
  const nextTotal = patch.totalMarks ?? existing.total_marks;
  const nextInternal =
    patch.internalMarks !== undefined
      ? patch.internalMarks
      : existing.internal_marks;
  const nextExternal =
    patch.externalMarks !== undefined
      ? patch.externalMarks
      : existing.external_marks;
  const nextAudience = patch.audienceScope ?? existing.audience_scope;

  assertDateWindow(nextStart, nextEnd);
  assertDefaultTimes(nextStartsAt, nextEndsAt);
  assertMarksScheme({
    totalMarks: nextTotal,
    internalMarks: nextInternal,
    externalMarks: nextExternal,
  });

  const fieldPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) fieldPatch.name = patch.name;
  if (patch.header !== undefined) fieldPatch.header = patch.header;
  if (patch.startDate !== undefined) fieldPatch.start_date = patch.startDate;
  if (patch.endDate !== undefined) fieldPatch.end_date = patch.endDate;
  if (patch.defaultStartsAt !== undefined) {
    fieldPatch.default_starts_at = patch.defaultStartsAt;
  }
  if (patch.defaultEndsAt !== undefined) {
    fieldPatch.default_ends_at = patch.defaultEndsAt;
  }
  if (patch.totalMarks !== undefined) fieldPatch.total_marks = patch.totalMarks;
  if (patch.internalMarks !== undefined) {
    fieldPatch.internal_marks = patch.internalMarks;
  }
  if (patch.externalMarks !== undefined) {
    fieldPatch.external_marks = patch.externalMarks;
  }
  if (patch.audienceScope !== undefined) {
    fieldPatch.audience_scope = patch.audienceScope;
  }

  if (patch.scheduleStatus !== undefined) {
    fieldPatch.schedule_status = patch.scheduleStatus;
    if (patch.scheduleStatus === "published") {
      fieldPatch.schedule_published_at =
        existing.schedule_published_at ?? new Date().toISOString();
    } else {
      fieldPatch.schedule_published_at = null;
    }
  }

  if (patch.lifecycleStatus !== undefined) {
    fieldPatch.lifecycle_status = patch.lifecycleStatus;
  }

  let exam = existing;
  if (Object.keys(fieldPatch).length > 0) {
    exam = await updateExamFields(admin, examId, fieldPatch);
  }

  let targets = await listTargetsForExam(admin, examId);
  if (patch.targetSections !== undefined || patch.audienceScope !== undefined) {
    const resolvedTargets = await validateTargets(admin, {
      instituteId: existing.institute_id,
      academicYearId: existing.academic_year_id,
      audienceScope: nextAudience,
      targets:
        patch.targetSections ??
        targets.map((t) => ({ sectionId: t.section_id, classId: t.class_id })),
    });
    await softDeleteTargetsForExam(admin, examId);
    targets = await insertTargets(admin, exam, resolvedTargets);
  }

  let schedules = await listSchedulesForExam(admin, examId);
  if (
    patch.subjectSchedules !== undefined ||
    patch.startDate !== undefined ||
    patch.endDate !== undefined
  ) {
    const scheduleInput =
      patch.subjectSchedules ??
      schedules.map((s) => ({
        subjectId: s.subject_id,
        paperDate: s.paper_date,
        startsAt: s.starts_at,
        endsAt: s.ends_at,
        room: s.room,
        invigilatorTeacherId: s.invigilator_teacher_id,
      }));
    const resolvedSchedules = await validateSchedules(admin, {
      instituteId: existing.institute_id,
      startDate: nextStart,
      endDate: nextEnd,
      schedules: scheduleInput,
    });
    await softDeleteSchedulesForExam(admin, examId);
    schedules = await insertSchedules(admin, exam, resolvedSchedules);
  }

  return toExamDto(exam, targets, schedules);
}

export async function deleteExamForActor(
  admin: SupabaseClient,
  actor: Actor,
  examId: string,
): Promise<void> {
  const existing = await findExamById(admin, examId);
  if (!existing) throw AppError.notFound("Exam not found");

  assertCanWrite(actor, existing.institute_id);

  await softDeleteTargetsForExam(admin, examId);
  await softDeleteSchedulesForExam(admin, examId);
  await softDeleteExam(admin, examId);
}
