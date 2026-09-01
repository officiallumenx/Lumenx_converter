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
  findEnrollmentById,
  findExamGraph,
  findMarkEntryById,
  findSectionById,
  findSubjectById,
  findTeacherAssignmentMatch,
  findTeacherById,
  insertMarkEntry,
  insertScores,
  listGuardianStudentIds,
  listMarkEntries,
  listScoresForEntry,
  listScoresForEntryIds,
  softDeleteMarkEntry,
  softDeleteScoresForEntry,
  transitionMarkEntryStatus,
  updateMarkEntryFields,
} from "./repository.js";
import type {
  CreateMarkEntryInput,
  ListMarkEntriesFilter,
  MarkEntryDto,
  MarkEntryRow,
  MarkEntryStatus,
  MarkScoreDto,
  MarkScoreRow,
  ScoreInput,
  UpdateMarkEntryInput,
  WorkflowNoteInput,
} from "./types.js";

export const MARKS_STAFF_WRITE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
] as const;

export const MARKS_STAFF_READ_ROLES = [
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

const EDITABLE_STATUSES: MarkEntryStatus[] = ["pending", "returned", "rejected"];
const SUBMIT_FROM: MarkEntryStatus[] = ["pending", "returned", "rejected"];

export function toScoreDto(row: MarkScoreRow): MarkScoreDto {
  return {
    id: row.id,
    enrollmentId: row.enrollment_id,
    studentId: row.student_id,
    marks: row.marks,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toEntryDto(
  row: MarkEntryRow,
  scores?: MarkScoreRow[],
): MarkEntryDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    academicYearId: row.academic_year_id,
    classId: row.class_id,
    sectionId: row.section_id,
    examId: row.exam_id,
    subjectId: row.subject_id,
    teacherId: row.teacher_id,
    maxMarks: row.max_marks,
    status: row.status,
    submittedAt: row.submitted_at,
    publishedAt: row.published_at,
    adminNote: row.admin_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    scores: scores?.map(toScoreDto),
  };
}

function isStaffWriter(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  return MARKS_STAFF_WRITE_ROLES.some((role) =>
    actorHasInstituteRole(actor, instituteId, role),
  );
}

function isStaffReader(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  const membership = actor.memberships.find((m) => m.instituteId === instituteId);
  if (!membership) return false;
  return MARKS_STAFF_READ_ROLES.some((role) => membership.roles.includes(role));
}

function assertStaffWriter(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  if (actor.isPlatformOperator) return;
  assertInstituteRoles(actor, instituteId, [...MARKS_STAFF_WRITE_ROLES]);
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

export async function assertCanAccessStudentMarks(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
  studentId: string,
): Promise<void> {
  assertInstituteAccess(actor, instituteId);
  if (isStaffReader(actor, instituteId)) return;

  const accessible = await resolveAccessibleStudentIds(admin, actor, instituteId);
  if (!accessible.has(studentId)) {
    throw AppError.forbidden("Insufficient permissions");
  }
}

function filterScoresForAccessibleStudents(
  scores: MarkScoreRow[],
  accessible: Set<string> | null,
): MarkScoreRow[] {
  if (accessible === null) return scores;
  return scores.filter((s) => accessible.has(s.student_id));
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

/**
 * Resolve teacher_id for create: staff may override with validated teacher UUID;
 * teachers always use requireTeacherIdentity (ignore client teacher_id).
 */
async function resolveTeacherIdForCreate(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateMarkEntryInput,
): Promise<string> {
  const instituteId = input.instituteId;

  if (isStaffWriter(actor, instituteId)) {
    if (!input.teacherId) {
      throw AppError.validation("teacher_id is required for staff-created entries", {
        teacher_id: ["Required"],
      });
    }
    const teacher = await findTeacherById(admin, input.teacherId);
    if (
      !teacher ||
      teacher.institute_id !== instituteId ||
      teacher.status !== "active"
    ) {
      throw AppError.validation("Referenced resource is invalid", {
        teacher_id: ["Teacher not found in this institute"],
      });
    }
    return teacher.id;
  }

  if (!actorHasInstituteRole(actor, instituteId, "teacher")) {
    throw AppError.forbidden("Insufficient institute role");
  }

  const identity = requireTeacherIdentity(actor, instituteId);
  await assertTeacherAssignment(admin, {
    teacherId: identity.teacherId,
    instituteId,
    academicYearId: input.academicYearId,
    classId: input.classId,
    sectionId: input.sectionId,
    subjectId: input.subjectId,
  });
  return identity.teacherId;
}

async function assertCanEditScores(
  admin: SupabaseClient,
  actor: Actor,
  entry: MarkEntryRow,
): Promise<void> {
  if (isStaffWriter(actor, entry.institute_id)) return;

  if (!actorHasInstituteRole(actor, entry.institute_id, "teacher")) {
    throw AppError.forbidden("Insufficient institute role");
  }
  const identity = requireTeacherIdentity(actor, entry.institute_id);
  if (identity.teacherId !== entry.teacher_id) {
    throw AppError.forbidden("Cannot modify another teacher's mark entry");
  }
  await assertTeacherAssignment(admin, {
    teacherId: identity.teacherId,
    instituteId: entry.institute_id,
    academicYearId: entry.academic_year_id,
    classId: entry.class_id,
    sectionId: entry.section_id,
    subjectId: entry.subject_id,
  });
}

function assertMarksValue(marks: number | null, maxMarks: number): void {
  if (marks == null) return;
  if (!Number.isInteger(marks) || marks < 0) {
    throw AppError.validation("marks must be null or a non-negative integer", {
      marks: ["Invalid"],
    });
  }
  if (marks > maxMarks) {
    throw AppError.validation("marks cannot exceed max_marks", {
      marks: ["Must be <= max_marks"],
    });
  }
}

async function resolveScores(
  admin: SupabaseClient,
  entryGraph: {
    instituteId: string;
    academicYearId: string;
    classId: string;
    sectionId: string;
  },
  maxMarks: number,
  scores: ScoreInput[],
): Promise<Array<ScoreInput & { studentId: string }>> {
  const enrollmentIds = scores.map((s) => s.enrollmentId);
  if (new Set(enrollmentIds).size !== enrollmentIds.length) {
    throw AppError.validation("Duplicate enrollment_id in scores", {
      scores: ["Each enrollment_id must be unique"],
    });
  }

  const resolved: Array<ScoreInput & { studentId: string }> = [];
  for (const score of scores) {
    assertMarksValue(score.marks, maxMarks);
    const enrollment = await findEnrollmentById(admin, score.enrollmentId);
    if (!enrollment || enrollment.status !== "active") {
      throw AppError.validation("Referenced resource is invalid", {
        enrollment_id: ["Enrollment not found or inactive"],
      });
    }
    if (
      enrollment.institute_id !== entryGraph.instituteId ||
      enrollment.academic_year_id !== entryGraph.academicYearId ||
      enrollment.class_id !== entryGraph.classId ||
      enrollment.section_id !== entryGraph.sectionId
    ) {
      throw AppError.validation("Referenced resource is invalid", {
        enrollment_id: ["Enrollment does not match mark entry section graph"],
      });
    }
    resolved.push({
      enrollmentId: enrollment.id,
      studentId: enrollment.student_id,
      marks: score.marks,
    });
  }
  return resolved;
}

async function validateEntryGraph(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    academicYearId: string;
    classId: string;
    sectionId: string;
    examId: string;
    subjectId: string;
  },
): Promise<void> {
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

  const exam = await findExamGraph(admin, input.examId);
  if (
    !exam ||
    exam.institute_id !== input.instituteId ||
    exam.academic_year_id !== input.academicYearId
  ) {
    throw AppError.validation("Referenced resource is invalid", {
      exam_id: ["Exam not found in this institute/year"],
    });
  }

  const subject = await findSubjectById(admin, input.subjectId);
  if (!subject || subject.institute_id !== input.instituteId) {
    throw AppError.validation("Referenced resource is invalid", {
      subject_id: ["Subject not found in this institute"],
    });
  }
}

export async function listMarkEntriesForActor(
  admin: SupabaseClient,
  actor: Actor,
  filter: ListMarkEntriesFilter,
): Promise<MarkEntryDto[]> {
  const instituteId = requireInstituteId(actor, filter.instituteId);
  const rows = await listMarkEntries(admin, { ...filter, instituteId });

  if (isStaffReader(actor, instituteId)) {
    return rows.map((r) => toEntryDto(r));
  }

  const accessible = await resolveAccessibleStudentIds(admin, actor, instituteId);
  if (accessible.size === 0) {
    throw AppError.forbidden("Insufficient permissions");
  }

  const published = rows.filter((r) => r.status === "published");
  const scores = await listScoresForEntryIds(
    admin,
    published.map((r) => r.id),
  );
  const byEntry = new Map<string, MarkScoreRow[]>();
  for (const s of scores) {
    const list = byEntry.get(s.mark_entry_id) ?? [];
    list.push(s);
    byEntry.set(s.mark_entry_id, list);
  }

  return published
    .filter((r) => {
      const entryScores = byEntry.get(r.id) ?? [];
      return entryScores.some((s) => accessible.has(s.student_id));
    })
    .map((r) => toEntryDto(r));
}

export async function getMarkEntryForActor(
  admin: SupabaseClient,
  actor: Actor,
  entryId: string,
): Promise<MarkEntryDto> {
  const entry = await findMarkEntryById(admin, entryId);
  if (!entry) throw AppError.notFound("Mark entry not found");

  assertInstituteAccess(actor, entry.institute_id);
  const scores = await listScoresForEntry(admin, entry.id);

  if (isStaffReader(actor, entry.institute_id)) {
    return toEntryDto(entry, scores);
  }

  if (entry.status !== "published") {
    throw AppError.forbidden("Insufficient permissions");
  }

  const accessible = await resolveAccessibleStudentIds(
    admin,
    actor,
    entry.institute_id,
  );
  if (accessible.size === 0) {
    throw AppError.forbidden("Insufficient permissions");
  }

  const visible = filterScoresForAccessibleStudents(scores, accessible);
  if (visible.length === 0) {
    throw AppError.forbidden("Insufficient permissions");
  }

  return toEntryDto(entry, visible);
}

export async function createMarkEntryForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateMarkEntryInput,
): Promise<MarkEntryDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);

  if (input.maxMarks <= 0 || !Number.isInteger(input.maxMarks)) {
    throw AppError.validation("max_marks must be a positive integer", {
      max_marks: ["Must be > 0"],
    });
  }

  await validateEntryGraph(admin, {
    instituteId,
    academicYearId: input.academicYearId,
    classId: input.classId,
    sectionId: input.sectionId,
    examId: input.examId,
    subjectId: input.subjectId,
  });

  const teacherId = await resolveTeacherIdForCreate(admin, actor, {
    ...input,
    instituteId,
  });

  const resolvedScores = await resolveScores(
    admin,
    {
      instituteId,
      academicYearId: input.academicYearId,
      classId: input.classId,
      sectionId: input.sectionId,
    },
    input.maxMarks,
    input.scores ?? [],
  );

  const entry = await insertMarkEntry(admin, {
    ...input,
    instituteId,
    teacherId,
  });
  const scoreRows = await insertScores(admin, entry, resolvedScores);
  return toEntryDto(entry, scoreRows);
}

export async function updateMarkEntryForActor(
  admin: SupabaseClient,
  actor: Actor,
  entryId: string,
  patch: UpdateMarkEntryInput,
): Promise<MarkEntryDto> {
  const existing = await findMarkEntryById(admin, entryId);
  if (!existing) throw AppError.notFound("Mark entry not found");

  await assertCanEditScores(admin, actor, existing);

  if (!EDITABLE_STATUSES.includes(existing.status)) {
    throw AppError.conflict("Mark entry is not editable in its current status");
  }

  const nextMax = patch.maxMarks ?? existing.max_marks;
  if (nextMax <= 0 || !Number.isInteger(nextMax)) {
    throw AppError.validation("max_marks must be a positive integer", {
      max_marks: ["Must be > 0"],
    });
  }

  const fieldPatch: Record<string, unknown> = {};
  if (patch.maxMarks !== undefined) fieldPatch.max_marks = patch.maxMarks;
  if (patch.adminNote !== undefined && isStaffWriter(actor, existing.institute_id)) {
    fieldPatch.admin_note = patch.adminNote;
  }

  let entry = existing;
  if (Object.keys(fieldPatch).length > 0) {
    entry = await updateMarkEntryFields(admin, entryId, fieldPatch);
  }

  let scores = await listScoresForEntry(admin, entryId);

  if (patch.scores !== undefined) {
    const resolved = await resolveScores(
      admin,
      {
        instituteId: existing.institute_id,
        academicYearId: existing.academic_year_id,
        classId: existing.class_id,
        sectionId: existing.section_id,
      },
      nextMax,
      patch.scores,
    );
    await softDeleteScoresForEntry(admin, entryId);
    scores = await insertScores(admin, entry, resolved);
  } else if (patch.maxMarks !== undefined) {
    for (const s of scores) {
      assertMarksValue(s.marks, nextMax);
    }
  }

  return toEntryDto(entry, scores);
}

export async function submitMarkEntryForActor(
  admin: SupabaseClient,
  actor: Actor,
  entryId: string,
): Promise<MarkEntryDto> {
  const existing = await findMarkEntryById(admin, entryId);
  if (!existing) throw AppError.notFound("Mark entry not found");

  await assertCanEditScores(admin, actor, existing);

  const submitted = await transitionMarkEntryStatus(admin, {
    id: entryId,
    fromStatuses: SUBMIT_FROM,
    toStatus: "submitted",
    patch: { submitted_at: new Date().toISOString() },
  });
  if (!submitted) {
    throw AppError.conflict("Mark entry cannot be submitted in its current status");
  }
  const scores = await listScoresForEntry(admin, entryId);
  return toEntryDto(submitted, scores);
}

export async function publishMarkEntryForActor(
  admin: SupabaseClient,
  actor: Actor,
  entryId: string,
): Promise<MarkEntryDto> {
  const existing = await findMarkEntryById(admin, entryId);
  if (!existing) throw AppError.notFound("Mark entry not found");

  assertStaffWriter(actor, existing.institute_id);

  const published = await transitionMarkEntryStatus(admin, {
    id: entryId,
    fromStatuses: ["submitted"],
    toStatus: "published",
    patch: { published_at: new Date().toISOString() },
  });
  if (!published) {
    throw AppError.conflict("Mark entry cannot be published in its current status");
  }
  const scores = await listScoresForEntry(admin, entryId);
  const dto = toEntryDto(published, scores);
  const { emitMarkEntryPublishedNotifications } = await import("./notifications.js");
  await emitMarkEntryPublishedNotifications(admin, actor.userId, dto, dto.scores ?? []);
  return dto;
}

export async function returnMarkEntryForActor(
  admin: SupabaseClient,
  actor: Actor,
  entryId: string,
  input: WorkflowNoteInput = {},
): Promise<MarkEntryDto> {
  const existing = await findMarkEntryById(admin, entryId);
  if (!existing) throw AppError.notFound("Mark entry not found");

  assertStaffWriter(actor, existing.institute_id);

  const returned = await transitionMarkEntryStatus(admin, {
    id: entryId,
    fromStatuses: ["submitted"],
    toStatus: "returned",
    patch: {
      submitted_at: null,
      admin_note: input.adminNote ?? existing.admin_note,
    },
  });
  if (!returned) {
    throw AppError.conflict("Mark entry cannot be returned in its current status");
  }
  const scores = await listScoresForEntry(admin, entryId);
  return toEntryDto(returned, scores);
}

export async function rejectMarkEntryForActor(
  admin: SupabaseClient,
  actor: Actor,
  entryId: string,
  input: WorkflowNoteInput = {},
): Promise<MarkEntryDto> {
  const existing = await findMarkEntryById(admin, entryId);
  if (!existing) throw AppError.notFound("Mark entry not found");

  assertStaffWriter(actor, existing.institute_id);

  const rejected = await transitionMarkEntryStatus(admin, {
    id: entryId,
    fromStatuses: ["submitted"],
    toStatus: "rejected",
    patch: {
      submitted_at: null,
      admin_note: input.adminNote ?? existing.admin_note,
    },
  });
  if (!rejected) {
    throw AppError.conflict("Mark entry cannot be rejected in its current status");
  }
  const scores = await listScoresForEntry(admin, entryId);
  return toEntryDto(rejected, scores);
}

export async function deleteMarkEntryForActor(
  admin: SupabaseClient,
  actor: Actor,
  entryId: string,
): Promise<void> {
  const existing = await findMarkEntryById(admin, entryId);
  if (!existing) throw AppError.notFound("Mark entry not found");

  assertStaffWriter(actor, existing.institute_id);

  await softDeleteScoresForEntry(admin, entryId);
  await softDeleteMarkEntry(admin, entryId);
}
