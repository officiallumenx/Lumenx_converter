import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteAccess,
  actorHasInstituteRole,
  requireInstituteId,
  requireTeacherIdentity,
} from "../../authorization/index.js";
import { listGuardianStudentIds, findStudentById } from "../students/repository.js";
import { findTeacherById } from "../teachers/repository.js";
import { ensureDbOk } from "../../db/errors.js";
import {
  findStudentRemarkById,
  insertStudentRemark,
  listStudentRemarks,
  softDeleteStudentRemark,
  updateStudentRemarkBody,
} from "./repository.js";
import type {
  CreateStudentRemarkInput,
  ListStudentRemarksFilter,
  StudentRemarkDto,
  StudentRemarkRow,
  UpdateStudentRemarkInput,
} from "./types.js";

const STAFF_FULL_READ_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "staff",
] as const;

const VISIBLE_TO: StudentRemarkDto["visibleTo"] = ["teacher", "parent", "admin"];

function isFullStaffReader(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  return STAFF_FULL_READ_ROLES.some((role) =>
    actorHasInstituteRole(actor, instituteId, role),
  );
}

function toDto(
  row: StudentRemarkRow,
  extras: { studentName: string | null; authorName: string | null },
): StudentRemarkDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    studentId: row.student_id,
    studentName: extras.studentName,
    authorTeacherId: row.author_teacher_id,
    authorUserId: row.author_user_id,
    authorName: extras.authorName,
    type: row.remark_type,
    text: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    visibleTo: [...VISIBLE_TO],
  };
}

async function enrich(
  admin: SupabaseClient,
  rows: StudentRemarkRow[],
): Promise<StudentRemarkDto[]> {
  const out: StudentRemarkDto[] = [];
  for (const row of rows) {
    const student = await findStudentById(admin, row.student_id);
    const teacher = await findTeacherById(admin, row.author_teacher_id);
    out.push(
      toDto(row, {
        studentName: student?.display_name ?? null,
        authorName: teacher?.display_name ?? null,
      }),
    );
  }
  return out;
}

/** Students in sections where the teacher is class teacher or has an assignment. */
async function listTeacherScopedStudentIds(
  admin: SupabaseClient,
  instituteId: string,
  teacherId: string,
): Promise<Set<string>> {
  const sectionResult = await admin
    .from("section")
    .select("id")
    .eq("institute_id", instituteId)
    .eq("class_teacher_id", teacherId)
    .is("deleted_at", null);
  if (sectionResult.error) ensureDbOk(sectionResult);
  const classTeacherSections = ((sectionResult.data ?? []) as Array<{ id: string }>).map(
    (r) => r.id,
  );

  const assignResult = await admin
    .from("teacher_assignment")
    .select("section_id")
    .eq("institute_id", instituteId)
    .eq("teacher_id", teacherId)
    .eq("status", "active")
    .is("deleted_at", null);
  if (assignResult.error) ensureDbOk(assignResult);
  const assignedSections = ((assignResult.data ?? []) as Array<{ section_id: string }>).map(
    (r) => r.section_id,
  );

  const sectionIds = [...new Set([...classTeacherSections, ...assignedSections])];
  if (sectionIds.length === 0) return new Set();

  const enrollResult = await admin
    .from("enrollment")
    .select("student_id")
    .eq("institute_id", instituteId)
    .in("section_id", sectionIds)
    .eq("status", "active")
    .is("deleted_at", null);
  if (enrollResult.error) ensureDbOk(enrollResult);
  return new Set(
    ((enrollResult.data ?? []) as Array<{ student_id: string }>).map((r) => r.student_id),
  );
}

async function listParentStudentIds(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
): Promise<Set<string>> {
  const ids = new Set<string>();
  for (const p of actor.parents) {
    if (p.instituteId !== instituteId) continue;
    const linked = await listGuardianStudentIds(admin, p.parentId, instituteId);
    for (const sid of linked) ids.add(sid);
  }
  return ids;
}

export async function listStudentRemarksForActor(
  admin: SupabaseClient,
  actor: Actor,
  filter: ListStudentRemarksFilter,
): Promise<StudentRemarkDto[]> {
  requireInstituteId(actor, filter.instituteId);
  assertInstituteAccess(actor, filter.instituteId);

  const rows = await listStudentRemarks(admin, filter);

  if (isFullStaffReader(actor, filter.instituteId)) {
    return enrich(admin, rows);
  }

  if (actorHasInstituteRole(actor, filter.instituteId, "teacher")) {
    const identity = requireTeacherIdentity(actor, filter.instituteId);
    const scoped = await listTeacherScopedStudentIds(
      admin,
      filter.instituteId,
      identity.teacherId,
    );
    const filtered = rows.filter(
      (row) =>
        row.author_teacher_id === identity.teacherId || scoped.has(row.student_id),
    );
    return enrich(admin, filtered);
  }

  const parentKids = await listParentStudentIds(admin, actor, filter.instituteId);
  if (parentKids.size === 0) {
    throw AppError.forbidden("Insufficient institute role");
  }
  return enrich(
    admin,
    rows.filter((row) => parentKids.has(row.student_id)),
  );
}

export async function createStudentRemarkForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateStudentRemarkInput,
): Promise<StudentRemarkDto> {
  requireInstituteId(actor, input.instituteId);
  assertInstituteAccess(actor, input.instituteId);

  if (!actorHasInstituteRole(actor, input.instituteId, "teacher")) {
    throw AppError.forbidden("Only teachers can create remarks");
  }

  const identity = requireTeacherIdentity(actor, input.instituteId);
  const scoped = await listTeacherScopedStudentIds(
    admin,
    input.instituteId,
    identity.teacherId,
  );
  if (!scoped.has(input.studentId)) {
    throw AppError.forbidden("Student is not in your teaching scope");
  }

  const student = await findStudentById(admin, input.studentId);
  if (!student || student.institute_id !== input.instituteId) {
    throw AppError.notFound("Student not found");
  }

  const text = input.text.trim();
  if (text.length < 8) {
    throw AppError.validation("Remark text must be at least 8 characters");
  }

  const row = await insertStudentRemark(admin, {
    ...input,
    text,
    authorTeacherId: identity.teacherId,
    authorUserId: actor.userId,
  });
  return (await enrich(admin, [row]))[0]!;
}

export async function updateStudentRemarkForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: UpdateStudentRemarkInput,
): Promise<StudentRemarkDto> {
  const existing = await findStudentRemarkById(admin, id);
  if (!existing) throw AppError.notFound("Remark not found");

  requireInstituteId(actor, existing.institute_id);
  assertInstituteAccess(actor, existing.institute_id);

  if (!actorHasInstituteRole(actor, existing.institute_id, "teacher")) {
    throw AppError.forbidden("Only teachers can update remarks");
  }

  const identity = requireTeacherIdentity(actor, existing.institute_id);
  if (existing.author_teacher_id !== identity.teacherId) {
    throw AppError.forbidden("Only the author can edit this remark");
  }

  const text = input.text.trim();
  if (text.length < 8) {
    throw AppError.validation("Remark text must be at least 8 characters");
  }

  const row = await updateStudentRemarkBody(admin, id, { text });
  return (await enrich(admin, [row]))[0]!;
}

export async function deleteStudentRemarkForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<void> {
  const existing = await findStudentRemarkById(admin, id);
  if (!existing) throw AppError.notFound("Remark not found");

  requireInstituteId(actor, existing.institute_id);
  assertInstituteAccess(actor, existing.institute_id);

  if (!actorHasInstituteRole(actor, existing.institute_id, "teacher")) {
    throw AppError.forbidden("Only teachers can delete remarks");
  }

  const identity = requireTeacherIdentity(actor, existing.institute_id);
  if (existing.author_teacher_id !== identity.teacherId) {
    throw AppError.forbidden("Only the author can delete this remark");
  }

  await softDeleteStudentRemark(admin, id);
}
