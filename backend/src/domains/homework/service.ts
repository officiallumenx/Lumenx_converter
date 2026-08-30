import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteAccess,
  requireInstituteId,
  requireTeacherIdentity,
  actorHasInstituteRole,
} from "../../authorization/index.js";
import {
  findAcademicYearById,
  findHomeworkById,
  findSectionById,
  findSubjectById,
  findTeacherAssignmentMatch,
  insertHomework,
  listActiveEnrollmentsForStudents,
  listActiveTeacherAssignments,
  listGuardianStudentIds,
  listHomework,
  softDeleteHomework,
  transitionHomeworkStatus,
  updateHomeworkFields,
  type EnrollmentAudienceRow,
  type TeacherAssignmentRow,
} from "./repository.js";
import type {
  CreateHomeworkInput,
  HomeworkDto,
  HomeworkRow,
  ListHomeworkFilter,
  UpdateHomeworkInput,
} from "./types.js";

/** Governance: expire + soft-delete only (no content CRUD). */
export const HOMEWORK_STAFF_GOVERNANCE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
] as const;

/**
 * Full institute readers (including other teachers' drafts).
 * Pure `teacher` is intentionally excluded — teachers get filtered visibility.
 */
export const HOMEWORK_FULL_READ_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "accountant",
  "admissions_officer",
  "it_admin",
  "staff",
] as const;

export function toHomeworkDto(row: HomeworkRow): HomeworkDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    academicYearId: row.academic_year_id,
    classId: row.class_id,
    sectionId: row.section_id,
    subjectId: row.subject_id,
    teacherId: row.teacher_id,
    kind: row.kind,
    title: row.title,
    description: row.description,
    instructions: row.instructions,
    dueDate: row.due_date,
    status: row.status,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isGovernanceWriter(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  return HOMEWORK_STAFF_GOVERNANCE_ROLES.some((role) =>
    actorHasInstituteRole(actor, instituteId, role),
  );
}

function isFullInstituteReader(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  const membership = actor.memberships.find((m) => m.instituteId === instituteId);
  if (!membership) return false;
  return HOMEWORK_FULL_READ_ROLES.some((role) => membership.roles.includes(role));
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

function assignmentCoversHomework(
  assignment: TeacherAssignmentRow,
  row: HomeworkRow,
): boolean {
  return (
    assignment.academic_year_id === row.academic_year_id &&
    assignment.class_id === row.class_id &&
    assignment.section_id === row.section_id &&
    assignment.subject_id === row.subject_id
  );
}

function homeworkVisibleToEnrollments(
  row: HomeworkRow,
  enrollments: EnrollmentAudienceRow[],
): boolean {
  if (row.status !== "published") return false;
  return enrollments.some(
    (e) =>
      e.section_id === row.section_id &&
      e.academic_year_id === row.academic_year_id &&
      e.class_id === row.class_id,
  );
}

async function assertTeacherAssignment(
  admin: SupabaseClient,
  input: {
    teacherId: string;
    instituteId: string;
    academicYearId: string;
    classId: string;
    sectionId: string;
    subjectId: string;
  },
): Promise<void> {
  const assignment = await findTeacherAssignmentMatch(admin, input);
  if (!assignment) {
    throw AppError.forbidden("Teacher is not assigned to this section/subject");
  }
}

async function validateHomeworkGraph(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    academicYearId: string;
    classId: string;
    sectionId: string;
    subjectId: string;
  },
): Promise<void> {
  const year = await findAcademicYearById(admin, input.academicYearId);
  if (!year || year.institute_id !== input.instituteId) {
    throw AppError.validation("Referenced resource is invalid", {
      academic_year_id: ["Academic year not found in this institute"],
    });
  }

  const section = await findSectionById(admin, input.sectionId);
  if (
    !section ||
    section.institute_id !== input.instituteId ||
    section.academic_year_id !== input.academicYearId ||
    section.class_id !== input.classId
  ) {
    throw AppError.validation("Referenced resource is invalid", {
      section_id: ["Section does not match institute/year/class"],
    });
  }

  const subject = await findSubjectById(admin, input.subjectId);
  if (!subject || subject.institute_id !== input.instituteId) {
    throw AppError.validation("Referenced resource is invalid", {
      subject_id: ["Subject not found in this institute"],
    });
  }
}

async function assertTeacherOwner(
  admin: SupabaseClient,
  actor: Actor,
  row: HomeworkRow,
): Promise<void> {
  if (!actorHasInstituteRole(actor, row.institute_id, "teacher")) {
    throw AppError.forbidden("Insufficient institute role");
  }
  const identity = requireTeacherIdentity(actor, row.institute_id);
  if (identity.teacherId !== row.teacher_id) {
    throw AppError.forbidden("Cannot modify another teacher's homework");
  }
  await assertTeacherAssignment(admin, {
    teacherId: identity.teacherId,
    instituteId: row.institute_id,
    academicYearId: row.academic_year_id,
    classId: row.class_id,
    sectionId: row.section_id,
    subjectId: row.subject_id,
  });
}

/**
 * Authorize read of a single row. Throws forbidden/notFound without leaking drafts.
 */
async function assertCanReadHomework(
  admin: SupabaseClient,
  actor: Actor,
  row: HomeworkRow,
): Promise<void> {
  assertInstituteAccess(actor, row.institute_id);

  if (isFullInstituteReader(actor, row.institute_id)) return;

  if (actorHasInstituteRole(actor, row.institute_id, "teacher")) {
    const identity = requireTeacherIdentity(actor, row.institute_id);
    if (identity.teacherId === row.teacher_id) return;
    if (row.status === "published") {
      const assignments = await listActiveTeacherAssignments(admin, {
        teacherId: identity.teacherId,
        instituteId: row.institute_id,
      });
      if (assignments.some((a) => assignmentCoversHomework(a, row))) return;
    }
    throw AppError.forbidden("Insufficient permissions");
  }

  if (row.status !== "published") {
    throw AppError.forbidden("Insufficient permissions");
  }

  const accessible = await resolveAccessibleStudentIds(
    admin,
    actor,
    row.institute_id,
  );
  if (accessible.size === 0) {
    throw AppError.forbidden("Insufficient permissions");
  }
  const enrollments = await listActiveEnrollmentsForStudents(admin, {
    instituteId: row.institute_id,
    studentIds: [...accessible],
  });
  if (!homeworkVisibleToEnrollments(row, enrollments)) {
    throw AppError.forbidden("Insufficient permissions");
  }
}

async function filterHomeworkForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
  rows: HomeworkRow[],
): Promise<HomeworkRow[]> {
  if (isFullInstituteReader(actor, instituteId)) {
    return rows;
  }

  if (actorHasInstituteRole(actor, instituteId, "teacher")) {
    const identity = requireTeacherIdentity(actor, instituteId);
    const assignments = await listActiveTeacherAssignments(admin, {
      teacherId: identity.teacherId,
      instituteId,
    });
    return rows.filter((row) => {
      if (row.teacher_id === identity.teacherId) return true;
      return (
        row.status === "published" &&
        assignments.some((a) => assignmentCoversHomework(a, row))
      );
    });
  }

  const accessible = await resolveAccessibleStudentIds(admin, actor, instituteId);
  if (accessible.size === 0) {
    throw AppError.forbidden("Insufficient permissions");
  }
  const enrollments = await listActiveEnrollmentsForStudents(admin, {
    instituteId,
    studentIds: [...accessible],
  });
  return rows.filter((row) => homeworkVisibleToEnrollments(row, enrollments));
}

export async function listHomeworkForActor(
  admin: SupabaseClient,
  actor: Actor,
  filter: ListHomeworkFilter,
): Promise<HomeworkDto[]> {
  const instituteId = requireInstituteId(actor, filter.instituteId);
  const rows = await listHomework(admin, { ...filter, instituteId });
  const visible = await filterHomeworkForActor(admin, actor, instituteId, rows);
  return visible.map(toHomeworkDto);
}

export async function getHomeworkForActor(
  admin: SupabaseClient,
  actor: Actor,
  homeworkId: string,
): Promise<HomeworkDto> {
  const row = await findHomeworkById(admin, homeworkId);
  if (!row) throw AppError.notFound("Homework not found");

  await assertCanReadHomework(admin, actor, row);
  return toHomeworkDto(row);
}

export async function createHomeworkForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateHomeworkInput,
): Promise<HomeworkDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);

  if (!actorHasInstituteRole(actor, instituteId, "teacher")) {
    throw AppError.forbidden("Insufficient institute role");
  }

  // Client teacher_id never authorizes; always use JWT teacher identity.
  const identity = requireTeacherIdentity(actor, instituteId);

  await validateHomeworkGraph(admin, {
    instituteId,
    academicYearId: input.academicYearId,
    classId: input.classId,
    sectionId: input.sectionId,
    subjectId: input.subjectId,
  });

  await assertTeacherAssignment(admin, {
    teacherId: identity.teacherId,
    instituteId,
    academicYearId: input.academicYearId,
    classId: input.classId,
    sectionId: input.sectionId,
    subjectId: input.subjectId,
  });

  const row = await insertHomework(admin, {
    ...input,
    instituteId,
    teacherId: identity.teacherId,
  });
  return toHomeworkDto(row);
}

export async function updateHomeworkForActor(
  admin: SupabaseClient,
  actor: Actor,
  homeworkId: string,
  patch: UpdateHomeworkInput,
): Promise<HomeworkDto> {
  const existing = await findHomeworkById(admin, homeworkId);
  if (!existing) throw AppError.notFound("Homework not found");

  assertInstituteAccess(actor, existing.institute_id);
  await assertTeacherOwner(admin, actor, existing);

  if (existing.status !== "draft") {
    throw AppError.conflict("Homework is not editable in its current status");
  }

  const fieldPatch: Record<string, unknown> = {};
  if (patch.title !== undefined) fieldPatch.title = patch.title;
  if (patch.description !== undefined) fieldPatch.description = patch.description;
  if (patch.instructions !== undefined) fieldPatch.instructions = patch.instructions;
  if (patch.dueDate !== undefined) fieldPatch.due_date = patch.dueDate;
  if (patch.kind !== undefined) fieldPatch.kind = patch.kind;

  if (Object.keys(fieldPatch).length === 0) {
    return toHomeworkDto(existing);
  }

  const updated = await updateHomeworkFields(admin, homeworkId, fieldPatch);
  if (!updated) {
    throw AppError.conflict("Homework is not editable in its current status");
  }
  return toHomeworkDto(updated);
}

export async function publishHomeworkForActor(
  admin: SupabaseClient,
  actor: Actor,
  homeworkId: string,
): Promise<HomeworkDto> {
  const existing = await findHomeworkById(admin, homeworkId);
  if (!existing) throw AppError.notFound("Homework not found");

  assertInstituteAccess(actor, existing.institute_id);
  await assertTeacherOwner(admin, actor, existing);

  const published = await transitionHomeworkStatus(admin, {
    id: homeworkId,
    fromStatus: "draft",
    toStatus: "published",
    patch: { published_at: new Date().toISOString() },
  });
  if (!published) {
    throw AppError.conflict("Homework cannot be published in its current status");
  }
  return toHomeworkDto(published);
}

export async function expireHomeworkForActor(
  admin: SupabaseClient,
  actor: Actor,
  homeworkId: string,
): Promise<HomeworkDto> {
  const existing = await findHomeworkById(admin, homeworkId);
  if (!existing) throw AppError.notFound("Homework not found");

  assertInstituteAccess(actor, existing.institute_id);

  if (isGovernanceWriter(actor, existing.institute_id)) {
    // staff governance may expire without owning
  } else {
    await assertTeacherOwner(admin, actor, existing);
  }

  const expired = await transitionHomeworkStatus(admin, {
    id: homeworkId,
    fromStatus: "published",
    toStatus: "expired",
    patch: {},
  });
  if (!expired) {
    throw AppError.conflict("Homework cannot be expired in its current status");
  }
  return toHomeworkDto(expired);
}

export async function deleteHomeworkForActor(
  admin: SupabaseClient,
  actor: Actor,
  homeworkId: string,
): Promise<void> {
  const existing = await findHomeworkById(admin, homeworkId);
  if (!existing) throw AppError.notFound("Homework not found");

  assertInstituteAccess(actor, existing.institute_id);

  if (isGovernanceWriter(actor, existing.institute_id)) {
    // staff governance soft-delete
  } else {
    await assertTeacherOwner(admin, actor, existing);
  }

  const deleted = await softDeleteHomework(admin, homeworkId);
  if (!deleted) {
    throw AppError.conflict("Homework was already deleted");
  }
}
