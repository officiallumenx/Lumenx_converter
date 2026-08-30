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
  findClassById,
  findClassCodesByIds,
  findSectionById,
  findSubjectById,
  insertAcademicYear,
  insertClass,
  insertEnrollment,
  insertSection,
  insertSubject,
  listAcademicYears,
  listClasses,
  listEnrollments,
  listEnrollmentsForStudents,
  findEnrollmentById,
  listGuardianStudentIds,
  listSections,
  listSubjects,
  softDeleteAcademicYear,
  softDeleteClass,
  softDeleteSection,
  softDeleteSubject,
  toAcademicYearUpdatePatch,
  toClassUpdatePatch,
  toSectionUpdatePatch,
  toSubjectUpdatePatch,
  updateAcademicYearFields,
  updateClassFields,
  updateSectionFields,
  updateSubjectFields,
} from "./repository.js";
import { findStudentById } from "../students/repository.js";
import type {
  AcademicYearDto,
  AcademicYearRow,
  ClassDto,
  ClassRow,
  CreateAcademicYearInput,
  CreateClassInput,
  CreateEnrollmentInput,
  CreateSectionInput,
  CreateSubjectInput,
  EnrollmentDto,
  EnrollmentRow,
  ListAcademicYearsFilter,
  ListClassesFilter,
  ListEnrollmentsFilter,
  ListSectionsFilter,
  ListSubjectsFilter,
  SectionDto,
  SectionRow,
  SubjectDto,
  SubjectRow,
  UpdateAcademicYearInput,
  UpdateClassInput,
  UpdateSectionInput,
  UpdateSubjectInput,
} from "./types.js";

/** Structure management — aligned with timetable writers. */
export const ACADEMICS_STAFF_WRITE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
] as const;

export const ACADEMICS_STAFF_READ_ROLES = [
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

type LearnerScope = {
  yearIds: Set<string>;
  classIds: Set<string>;
  sectionIds: Set<string>;
  classCodes: Set<string>;
};

export function toAcademicYearDto(row: AcademicYearRow): AcademicYearDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    name: row.name,
    code: row.code,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toClassDto(row: ClassRow): ClassDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    academicYearId: row.academic_year_id,
    name: row.name,
    code: row.code,
    sortOrder: row.sort_order,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toSectionDto(row: SectionRow): SectionDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    academicYearId: row.academic_year_id,
    classId: row.class_id,
    name: row.name,
    code: row.code,
    capacity: row.capacity,
    room: row.room,
    sortOrder: row.sort_order,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toSubjectDto(row: SubjectRow): SubjectDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    name: row.name,
    code: row.code,
    category: row.category,
    periodsPerWeek: row.periods_per_week,
    applicableClassCodes: row.applicable_class_codes ?? [],
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toEnrollmentDto(
  row: EnrollmentRow,
  studentName = "",
): EnrollmentDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    academicYearId: row.academic_year_id,
    studentId: row.student_id,
    studentName: studentName || shortStudentRef(row.student_id),
    classId: row.class_id,
    sectionId: row.section_id,
    rollNo: row.roll_no,
    status: row.status,
    enrolledOn: row.enrolled_on,
    withdrawnOn: row.withdrawn_on,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function shortStudentRef(studentId: string): string {
  return `Student · ${studentId.slice(0, 8)}`;
}

async function studentNamesByIds(
  admin: SupabaseClient,
  studentIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  await Promise.all(
    studentIds.map(async (id) => {
      const student = await findStudentById(admin, id);
      if (student) {
        map.set(
          id,
          student.display_name?.trim() ||
            `${student.first_name} ${student.surname}`.trim() ||
            shortStudentRef(id),
        );
      }
    }),
  );
  return map;
}

function isStaffReader(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  const membership = actor.memberships.find((m) => m.instituteId === instituteId);
  if (!membership) return false;
  return ACADEMICS_STAFF_READ_ROLES.some((role) => membership.roles.includes(role));
}

function assertStaffWriter(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  assertInstituteRoles(actor, instituteId, [...ACADEMICS_STAFF_WRITE_ROLES]);
}

function assertDateRange(startsOn: string, endsOn: string): void {
  if (endsOn < startsOn) {
    throw AppError.validation("ends_on must be on or after starts_on", {
      ends_on: ["Must be on or after starts_on"],
    });
  }
}

async function resolveAccessibleStudentIds(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
): Promise<string[]> {
  const ids = new Set<string>();
  for (const s of actor.students) {
    if (s.instituteId === instituteId) ids.add(s.studentId);
  }
  for (const p of actor.parents) {
    if (p.instituteId !== instituteId) continue;
    const linked = await listGuardianStudentIds(admin, p.parentId, instituteId);
    for (const id of linked) ids.add(id);
  }
  return [...ids];
}

async function resolveLearnerScope(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
): Promise<LearnerScope> {
  const studentIds = await resolveAccessibleStudentIds(admin, actor, instituteId);
  if (studentIds.length === 0) {
    throw AppError.forbidden("Insufficient permissions");
  }

  const enrollments = await listEnrollmentsForStudents(admin, instituteId, studentIds);
  if (enrollments.length === 0) {
    throw AppError.forbidden("Insufficient permissions");
  }

  const yearIds = new Set(enrollments.map((e) => e.academic_year_id));
  const classIds = new Set(enrollments.map((e) => e.class_id));
  const sectionIds = new Set(enrollments.map((e) => e.section_id));
  const codeMap = await findClassCodesByIds(admin, [...classIds]);
  const classCodes = new Set([...codeMap.values()]);

  return { yearIds, classIds, sectionIds, classCodes };
}

async function requireReadAccess(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
): Promise<LearnerScope | null> {
  assertInstituteAccess(actor, instituteId);
  if (isStaffReader(actor, instituteId)) return null;
  return resolveLearnerScope(admin, actor, instituteId);
}

// ── Academic years ───────────────────────────────────────────────

export async function listAcademicYearsForActor(
  admin: SupabaseClient,
  actor: Actor,
  filter: ListAcademicYearsFilter,
): Promise<AcademicYearDto[]> {
  const instituteId = requireInstituteId(actor, filter.instituteId);
  const scope = await requireReadAccess(admin, actor, instituteId);
  const rows = await listAcademicYears(admin, { ...filter, instituteId });
  if (!scope) return rows.map(toAcademicYearDto);
  return rows.filter((r) => scope.yearIds.has(r.id)).map(toAcademicYearDto);
}

export async function getAcademicYearForActor(
  admin: SupabaseClient,
  actor: Actor,
  yearId: string,
): Promise<AcademicYearDto> {
  const row = await findAcademicYearById(admin, yearId);
  if (!row) throw AppError.notFound("Academic year not found");

  const scope = await requireReadAccess(admin, actor, row.institute_id);
  if (scope && !scope.yearIds.has(row.id)) {
    throw AppError.forbidden("Insufficient permissions");
  }
  return toAcademicYearDto(row);
}

export async function createAcademicYearForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateAcademicYearInput,
): Promise<AcademicYearDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertStaffWriter(actor, instituteId);

  const name = input.name.trim();
  const code = input.code.trim();
  if (!name || !code) {
    throw AppError.validation("name and code are required", {
      name: !name ? ["Required"] : undefined,
      code: !code ? ["Required"] : undefined,
    });
  }
  assertDateRange(input.startsOn, input.endsOn);

  const row = await insertAcademicYear(admin, {
    ...input,
    instituteId,
    name,
    code,
  });
  return toAcademicYearDto(row);
}

export async function updateAcademicYearForActor(
  admin: SupabaseClient,
  actor: Actor,
  yearId: string,
  patch: UpdateAcademicYearInput,
): Promise<AcademicYearDto> {
  const existing = await findAcademicYearById(admin, yearId);
  if (!existing) throw AppError.notFound("Academic year not found");

  assertStaffWriter(actor, existing.institute_id);

  const fieldPatch = toAcademicYearUpdatePatch(patch);
  if (typeof fieldPatch.name === "string") fieldPatch.name = fieldPatch.name.trim();
  if (typeof fieldPatch.code === "string") fieldPatch.code = fieldPatch.code.trim();

  const startsOn =
    (fieldPatch.starts_on as string | undefined) ?? existing.starts_on;
  const endsOn = (fieldPatch.ends_on as string | undefined) ?? existing.ends_on;
  assertDateRange(startsOn, endsOn);

  if (Object.keys(fieldPatch).length === 0) {
    return toAcademicYearDto(existing);
  }

  const updated = await updateAcademicYearFields(admin, yearId, fieldPatch);
  if (!updated) throw AppError.notFound("Academic year not found");
  return toAcademicYearDto(updated);
}

export async function deleteAcademicYearForActor(
  admin: SupabaseClient,
  actor: Actor,
  yearId: string,
): Promise<void> {
  const existing = await findAcademicYearById(admin, yearId);
  if (!existing) throw AppError.notFound("Academic year not found");

  assertStaffWriter(actor, existing.institute_id);

  const deleted = await softDeleteAcademicYear(admin, yearId);
  if (!deleted) throw AppError.conflict("Academic year was already deleted");
}

// ── Classes ──────────────────────────────────────────────────────

export async function listClassesForActor(
  admin: SupabaseClient,
  actor: Actor,
  filter: ListClassesFilter,
): Promise<ClassDto[]> {
  const instituteId = requireInstituteId(actor, filter.instituteId);
  const scope = await requireReadAccess(admin, actor, instituteId);
  const rows = await listClasses(admin, { ...filter, instituteId });
  if (!scope) return rows.map(toClassDto);
  return rows.filter((r) => scope.classIds.has(r.id)).map(toClassDto);
}

export async function getClassForActor(
  admin: SupabaseClient,
  actor: Actor,
  classId: string,
): Promise<ClassDto> {
  const row = await findClassById(admin, classId);
  if (!row) throw AppError.notFound("Class not found");

  const scope = await requireReadAccess(admin, actor, row.institute_id);
  if (scope && !scope.classIds.has(row.id)) {
    throw AppError.forbidden("Insufficient permissions");
  }
  return toClassDto(row);
}

export async function createClassForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateClassInput,
): Promise<ClassDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertStaffWriter(actor, instituteId);

  const year = await findAcademicYearById(admin, input.academicYearId);
  if (!year || year.institute_id !== instituteId) {
    throw AppError.validation("Referenced resource is invalid", {
      academic_year_id: ["Academic year not found for institute"],
    });
  }

  const name = input.name.trim();
  const code = input.code.trim();
  if (!name || !code) {
    throw AppError.validation("name and code are required", {
      name: !name ? ["Required"] : undefined,
      code: !code ? ["Required"] : undefined,
    });
  }

  const row = await insertClass(admin, {
    ...input,
    instituteId,
    name,
    code,
  });
  return toClassDto(row);
}

export async function updateClassForActor(
  admin: SupabaseClient,
  actor: Actor,
  classId: string,
  patch: UpdateClassInput,
): Promise<ClassDto> {
  const existing = await findClassById(admin, classId);
  if (!existing) throw AppError.notFound("Class not found");

  assertStaffWriter(actor, existing.institute_id);

  const fieldPatch = toClassUpdatePatch(patch);
  if (typeof fieldPatch.name === "string") fieldPatch.name = fieldPatch.name.trim();
  if (typeof fieldPatch.code === "string") fieldPatch.code = fieldPatch.code.trim();

  if (Object.keys(fieldPatch).length === 0) {
    return toClassDto(existing);
  }

  const updated = await updateClassFields(admin, classId, fieldPatch);
  if (!updated) throw AppError.notFound("Class not found");
  return toClassDto(updated);
}

export async function deleteClassForActor(
  admin: SupabaseClient,
  actor: Actor,
  classId: string,
): Promise<void> {
  const existing = await findClassById(admin, classId);
  if (!existing) throw AppError.notFound("Class not found");

  assertStaffWriter(actor, existing.institute_id);

  const deleted = await softDeleteClass(admin, classId);
  if (!deleted) throw AppError.conflict("Class was already deleted");
}

// ── Sections ─────────────────────────────────────────────────────

export async function listSectionsForActor(
  admin: SupabaseClient,
  actor: Actor,
  filter: ListSectionsFilter,
): Promise<SectionDto[]> {
  const instituteId = requireInstituteId(actor, filter.instituteId);
  const scope = await requireReadAccess(admin, actor, instituteId);
  const rows = await listSections(admin, { ...filter, instituteId });
  if (!scope) return rows.map(toSectionDto);
  return rows.filter((r) => scope.sectionIds.has(r.id)).map(toSectionDto);
}

export async function getSectionForActor(
  admin: SupabaseClient,
  actor: Actor,
  sectionId: string,
): Promise<SectionDto> {
  const row = await findSectionById(admin, sectionId);
  if (!row) throw AppError.notFound("Section not found");

  const scope = await requireReadAccess(admin, actor, row.institute_id);
  if (scope && !scope.sectionIds.has(row.id)) {
    throw AppError.forbidden("Insufficient permissions");
  }
  return toSectionDto(row);
}

export async function createSectionForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateSectionInput,
): Promise<SectionDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertStaffWriter(actor, instituteId);

  const klass = await findClassById(admin, input.classId);
  if (
    !klass ||
    klass.institute_id !== instituteId ||
    klass.academic_year_id !== input.academicYearId
  ) {
    throw AppError.validation("Referenced resource is invalid", {
      class_id: ["Class does not match institute/year"],
    });
  }

  const name = input.name.trim();
  const code = input.code.trim();
  if (!name || !code) {
    throw AppError.validation("name and code are required", {
      name: !name ? ["Required"] : undefined,
      code: !code ? ["Required"] : undefined,
    });
  }

  const row = await insertSection(admin, {
    ...input,
    instituteId,
    name,
    code,
  });
  return toSectionDto(row);
}

export async function updateSectionForActor(
  admin: SupabaseClient,
  actor: Actor,
  sectionId: string,
  patch: UpdateSectionInput,
): Promise<SectionDto> {
  const existing = await findSectionById(admin, sectionId);
  if (!existing) throw AppError.notFound("Section not found");

  assertStaffWriter(actor, existing.institute_id);

  const fieldPatch = toSectionUpdatePatch(patch);
  if (typeof fieldPatch.name === "string") fieldPatch.name = fieldPatch.name.trim();
  if (typeof fieldPatch.code === "string") fieldPatch.code = fieldPatch.code.trim();

  if (Object.keys(fieldPatch).length === 0) {
    return toSectionDto(existing);
  }

  const updated = await updateSectionFields(admin, sectionId, fieldPatch);
  if (!updated) throw AppError.notFound("Section not found");
  return toSectionDto(updated);
}

export async function deleteSectionForActor(
  admin: SupabaseClient,
  actor: Actor,
  sectionId: string,
): Promise<void> {
  const existing = await findSectionById(admin, sectionId);
  if (!existing) throw AppError.notFound("Section not found");

  assertStaffWriter(actor, existing.institute_id);

  const deleted = await softDeleteSection(admin, sectionId);
  if (!deleted) throw AppError.conflict("Section was already deleted");
}

// ── Subjects ─────────────────────────────────────────────────────

function subjectVisibleToLearner(row: SubjectRow, scope: LearnerScope): boolean {
  if (row.status !== "active") return false;
  const codes = row.applicable_class_codes ?? [];
  return codes.some((c) => scope.classCodes.has(c));
}

export async function listSubjectsForActor(
  admin: SupabaseClient,
  actor: Actor,
  filter: ListSubjectsFilter,
): Promise<SubjectDto[]> {
  const instituteId = requireInstituteId(actor, filter.instituteId);
  const scope = await requireReadAccess(admin, actor, instituteId);
  const rows = await listSubjects(admin, { ...filter, instituteId });
  if (!scope) return rows.map(toSubjectDto);
  return rows.filter((r) => subjectVisibleToLearner(r, scope)).map(toSubjectDto);
}

export async function getSubjectForActor(
  admin: SupabaseClient,
  actor: Actor,
  subjectId: string,
): Promise<SubjectDto> {
  const row = await findSubjectById(admin, subjectId);
  if (!row) throw AppError.notFound("Subject not found");

  const scope = await requireReadAccess(admin, actor, row.institute_id);
  if (scope && !subjectVisibleToLearner(row, scope)) {
    throw AppError.forbidden("Insufficient permissions");
  }
  return toSubjectDto(row);
}

export async function createSubjectForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateSubjectInput,
): Promise<SubjectDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertStaffWriter(actor, instituteId);

  const name = input.name.trim();
  const code = input.code.trim();
  const category = input.category.trim();
  if (!name || !code || !category) {
    throw AppError.validation("name, code, and category are required", {
      name: !name ? ["Required"] : undefined,
      code: !code ? ["Required"] : undefined,
      category: !category ? ["Required"] : undefined,
    });
  }
  if (input.periodsPerWeek < 1) {
    throw AppError.validation("periods_per_week must be at least 1", {
      periods_per_week: ["Must be >= 1"],
    });
  }

  const row = await insertSubject(admin, {
    ...input,
    instituteId,
    name,
    code,
    category,
    applicableClassCodes: input.applicableClassCodes.map((c) => c.trim()).filter(Boolean),
  });
  return toSubjectDto(row);
}

export async function updateSubjectForActor(
  admin: SupabaseClient,
  actor: Actor,
  subjectId: string,
  patch: UpdateSubjectInput,
): Promise<SubjectDto> {
  const existing = await findSubjectById(admin, subjectId);
  if (!existing) throw AppError.notFound("Subject not found");

  assertStaffWriter(actor, existing.institute_id);

  const fieldPatch = toSubjectUpdatePatch(patch);
  if (typeof fieldPatch.name === "string") fieldPatch.name = fieldPatch.name.trim();
  if (typeof fieldPatch.code === "string") fieldPatch.code = fieldPatch.code.trim();
  if (typeof fieldPatch.category === "string") {
    fieldPatch.category = fieldPatch.category.trim();
  }
  if (Array.isArray(fieldPatch.applicable_class_codes)) {
    fieldPatch.applicable_class_codes = (fieldPatch.applicable_class_codes as string[])
      .map((c) => c.trim())
      .filter(Boolean);
  }
  if (
    typeof fieldPatch.periods_per_week === "number" &&
    fieldPatch.periods_per_week < 1
  ) {
    throw AppError.validation("periods_per_week must be at least 1", {
      periods_per_week: ["Must be >= 1"],
    });
  }

  if (Object.keys(fieldPatch).length === 0) {
    return toSubjectDto(existing);
  }

  const updated = await updateSubjectFields(admin, subjectId, fieldPatch);
  if (!updated) throw AppError.notFound("Subject not found");
  return toSubjectDto(updated);
}

export async function deleteSubjectForActor(
  admin: SupabaseClient,
  actor: Actor,
  subjectId: string,
): Promise<void> {
  const existing = await findSubjectById(admin, subjectId);
  if (!existing) throw AppError.notFound("Subject not found");

  assertStaffWriter(actor, existing.institute_id);

  const deleted = await softDeleteSubject(admin, subjectId);
  if (!deleted) throw AppError.conflict("Subject was already deleted");
}

// ── Enrollments ──────────────────────────────────────────────────

export async function listEnrollmentsForActor(
  admin: SupabaseClient,
  actor: Actor,
  filter: ListEnrollmentsFilter,
): Promise<EnrollmentDto[]> {
  const instituteId = requireInstituteId(actor, filter.instituteId);
  const learnerScope = await requireReadAccess(admin, actor, instituteId);

  const rows = await listEnrollments(admin, { ...filter, instituteId });
  let visible = rows;
  if (learnerScope) {
    const accessibleStudents = new Set(
      await resolveAccessibleStudentIds(admin, actor, instituteId),
    );
    visible = rows.filter(
      (row) =>
        learnerScope.sectionIds.has(row.section_id) &&
        accessibleStudents.has(row.student_id),
    );
  }

  const names = await studentNamesByIds(
    admin,
    [...new Set(visible.map((r) => r.student_id))],
  );
  return visible.map((row) => toEnrollmentDto(row, names.get(row.student_id)));
}

export async function getEnrollmentForActor(
  admin: SupabaseClient,
  actor: Actor,
  enrollmentId: string,
): Promise<EnrollmentDto> {
  const row = await findEnrollmentById(admin, enrollmentId);
  if (!row) throw AppError.notFound("Enrollment not found");

  const learnerScope = await requireReadAccess(admin, actor, row.institute_id);
  if (learnerScope) {
    const accessibleStudents = new Set(
      await resolveAccessibleStudentIds(admin, actor, row.institute_id),
    );
    if (
      !learnerScope.sectionIds.has(row.section_id) ||
      !accessibleStudents.has(row.student_id)
    ) {
      throw AppError.forbidden("Insufficient permissions");
    }
  }

  const names = await studentNamesByIds(admin, [row.student_id]);
  return toEnrollmentDto(row, names.get(row.student_id));
}

export async function createEnrollmentForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateEnrollmentInput,
): Promise<EnrollmentDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertStaffWriter(actor, instituteId);

  const section = await findSectionById(admin, input.sectionId);
  if (
    !section ||
    section.institute_id !== instituteId ||
    section.academic_year_id !== input.academicYearId ||
    section.class_id !== input.classId
  ) {
    throw AppError.validation("Referenced resource is invalid", {
      section_id: ["Section does not match institute / year / class"],
    });
  }

  const year = await findAcademicYearById(admin, input.academicYearId);
  if (!year || year.institute_id !== instituteId) {
    throw AppError.validation("Referenced resource is invalid", {
      academic_year_id: ["Academic year not found in this institute"],
    });
  }

  const student = await findStudentById(admin, input.studentId);
  if (!student || student.institute_id !== instituteId) {
    throw AppError.validation("Referenced resource is invalid", {
      student_id: ["Student not found in this institute"],
    });
  }

  const rollNo = input.rollNo.trim();
  if (!rollNo) {
    throw AppError.validation("roll_no is required", {
      roll_no: ["Required"],
    });
  }

  const row = await insertEnrollment(admin, {
    ...input,
    instituteId,
    rollNo,
    status: input.status ?? "active",
  });

  const name =
    student.display_name?.trim() ||
    `${student.first_name} ${student.surname}`.trim() ||
    shortStudentRef(student.id);
  return toEnrollmentDto(row, name);
}
