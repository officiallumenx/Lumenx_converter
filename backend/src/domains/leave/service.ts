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
import {
  findStudentById,
  listGuardianStudentIds,
} from "../students/repository.js";
import { findTeacherById } from "../teachers/repository.js";
import {
  findLeaveDecisionByRequestId,
  findLeaveRequestById,
  findPreferredActiveEnrollment,
  insertLeaveDecision,
  insertLeaveRequest,
  listLeaveRequests,
  updateLeaveRequestStatus,
} from "./repository.js";
import type {
  CreateStudentLeaveInput,
  CreateTeacherLeaveInput,
  DecideLeaveInput,
  LeaveDecisionDto,
  LeaveDecisionRow,
  LeaveRequestDto,
  LeaveRequestRow,
  LeaveStatus,
  LeaveSubjectKind,
  ListLeaveRequestsFilter,
} from "./types.js";

/** Staff who may decide student leave and view all institute leave. */
export const LEAVE_STAFF_READ_ROLES = [
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

/** Admin surface for teacher leave decisions (Accept / Reject / Ignore). */
export const TEACHER_LEAVE_DECIDE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
] as const;

/** Staff who may create student leave on behalf of a learner. */
export const STUDENT_LEAVE_STAFF_CREATE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "it_admin",
] as const;

/** Teachers + admins may decide student leave (class-teacher scope deferred). */
export const STUDENT_LEAVE_DECIDE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "teacher",
] as const;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function toLeaveRequestDto(row: LeaveRequestRow): LeaveRequestDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    subjectKind: row.subject_kind,
    studentId: row.student_id,
    teacherId: row.teacher_id,
    requestedByUserId: row.requested_by_user_id,
    leaveType: row.leave_type,
    intendedApproverRole: row.intended_approver_role,
    startDate: row.start_date,
    endDate: row.end_date,
    reason: row.reason,
    status: row.status,
    academicYearId: row.academic_year_id,
    classId: row.class_id,
    sectionId: row.section_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toLeaveDecisionDto(row: LeaveDecisionRow): LeaveDecisionDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    leaveRequestId: row.leave_request_id,
    outcome: row.outcome,
    note: row.note,
    decidedByUserId: row.decided_by_user_id,
    decidedAt: row.decided_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertDateRange(startDate: string, endDate: string): void {
  if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
    throw AppError.validation("Referenced resource is invalid", {
      start_date: ["Must be YYYY-MM-DD"],
      end_date: ["Must be YYYY-MM-DD"],
    });
  }
  if (endDate < startDate) {
    throw AppError.validation("Referenced resource is invalid", {
      end_date: ["Must be on or after start_date"],
    });
  }
}

function assertReason(reason: string, minLen: number): string {
  const trimmed = reason.trim();
  if (trimmed.length < minLen) {
    throw AppError.validation("Referenced resource is invalid", {
      reason: [`Must be at least ${minLen} characters`],
    });
  }
  return trimmed;
}

function isStaffReader(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  return LEAVE_STAFF_READ_ROLES.some((role) =>
    actorHasInstituteRole(actor, instituteId, role),
  );
}

async function resolveLinkedStudentIds(
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
    const linked = await listGuardianStudentIds(admin, p.parentId, instituteId);
    for (const sid of linked) ids.add(sid);
  }
  return ids;
}

function actorTeacherIds(actor: Actor, instituteId: string): Set<string> {
  return new Set(
    actor.teachers
      .filter((t) => t.instituteId === instituteId)
      .map((t) => t.teacherId),
  );
}

async function assertCanReadRequest(
  admin: SupabaseClient,
  actor: Actor,
  row: LeaveRequestRow,
): Promise<void> {
  assertInstituteAccess(actor, row.institute_id);
  if (isStaffReader(actor, row.institute_id)) return;
  if (row.requested_by_user_id === actor.userId) return;

  if (row.subject_kind === "student" && row.student_id) {
    const linked = await resolveLinkedStudentIds(admin, actor, row.institute_id);
    if (linked.has(row.student_id)) return;
  }

  if (row.subject_kind === "teacher" && row.teacher_id) {
    if (actorTeacherIds(actor, row.institute_id).has(row.teacher_id)) return;
  }

  throw AppError.forbidden("Insufficient leave access");
}

function filterVisibleRows(
  rows: LeaveRequestRow[],
  actor: Actor,
  instituteId: string,
  linkedStudentIds: Set<string>,
): LeaveRequestRow[] {
  if (isStaffReader(actor, instituteId)) return rows;
  const teacherIds = actorTeacherIds(actor, instituteId);
  return rows.filter((row) => {
    if (row.requested_by_user_id === actor.userId) return true;
    if (row.student_id && linkedStudentIds.has(row.student_id)) return true;
    if (row.teacher_id && teacherIds.has(row.teacher_id)) return true;
    return false;
  });
}

export async function listLeaveRequestsForActor(
  admin: SupabaseClient,
  actor: Actor,
  filter: ListLeaveRequestsFilter,
): Promise<LeaveRequestDto[]> {
  const instituteId = requireInstituteId(actor, filter.instituteId);

  const rows = await listLeaveRequests(admin, { ...filter, instituteId });
  const linked = await resolveLinkedStudentIds(admin, actor, instituteId);
  return filterVisibleRows(rows, actor, instituteId, linked).map(toLeaveRequestDto);
}

export async function getLeaveRequestForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<LeaveRequestDto> {
  const row = await findLeaveRequestById(admin, id);
  if (!row) throw AppError.notFound("Leave request not found");
  await assertCanReadRequest(admin, actor, row);
  return toLeaveRequestDto(row);
}

export async function getLeaveDecisionForActor(
  admin: SupabaseClient,
  actor: Actor,
  leaveRequestId: string,
): Promise<LeaveDecisionDto> {
  const request = await findLeaveRequestById(admin, leaveRequestId);
  if (!request) throw AppError.notFound("Leave request not found");
  await assertCanReadRequest(admin, actor, request);

  const decision = await findLeaveDecisionByRequestId(admin, leaveRequestId);
  if (!decision) throw AppError.notFound("Leave decision not found");
  return toLeaveDecisionDto(decision);
}

export async function createStudentLeaveForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateStudentLeaveInput,
): Promise<LeaveRequestDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertDateRange(input.startDate, input.endDate);
  const reason = assertReason(input.reason, 10);

  const student = await findStudentById(admin, input.studentId);
  if (!student || student.institute_id !== instituteId) {
    throw AppError.validation("Referenced resource is invalid", {
      student_id: ["Student not found in this institute"],
    });
  }

  const staffCreate = STUDENT_LEAVE_STAFF_CREATE_ROLES.some((role) =>
    actorHasInstituteRole(actor, instituteId, role),
  );
  if (!staffCreate) {
    const linked = await resolveLinkedStudentIds(admin, actor, instituteId);
    if (!linked.has(input.studentId)) {
      throw AppError.forbidden("Cannot create leave for this student");
    }
  }

  const enrollment = await findPreferredActiveEnrollment(admin, {
    instituteId,
    studentId: input.studentId,
  });

  const row = await insertLeaveRequest(admin, {
    instituteId,
    subjectKind: "student",
    studentId: input.studentId,
    teacherId: null,
    requestedByUserId: actor.userId,
    leaveType: "general",
    intendedApproverRole: null,
    startDate: input.startDate,
    endDate: input.endDate,
    reason,
    enrollment,
  });
  return toLeaveRequestDto(row);
}

export async function createTeacherLeaveForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateTeacherLeaveInput,
): Promise<LeaveRequestDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertInstituteRoles(actor, instituteId, ["teacher"]);
  assertDateRange(input.startDate, input.endDate);
  const reason = assertReason(input.reason, 8);

  const identity = requireTeacherIdentity(actor, instituteId);
  const teacher = await findTeacherById(admin, identity.teacherId);
  if (!teacher || teacher.institute_id !== instituteId) {
    throw AppError.forbidden("Teacher identity required");
  }

  const row = await insertLeaveRequest(admin, {
    instituteId,
    subjectKind: "teacher",
    studentId: null,
    teacherId: identity.teacherId,
    requestedByUserId: actor.userId,
    leaveType: input.leaveType,
    intendedApproverRole: input.intendedApproverRole,
    startDate: input.startDate,
    endDate: input.endDate,
    reason,
    enrollment: null,
  });
  return toLeaveRequestDto(row);
}

export async function decideLeaveForActor(
  admin: SupabaseClient,
  actor: Actor,
  leaveRequestId: string,
  input: DecideLeaveInput,
): Promise<{ request: LeaveRequestDto; decision: LeaveDecisionDto }> {
  const row = await findLeaveRequestById(admin, leaveRequestId);
  if (!row) throw AppError.notFound("Leave request not found");
  assertInstituteAccess(actor, row.institute_id);

  if (row.status !== "pending") {
    throw AppError.conflict("Leave request is not pending");
  }

  const existing = await findLeaveDecisionByRequestId(admin, leaveRequestId);
  if (existing) {
    throw AppError.conflict("Leave request already has a decision");
  }

  if (row.subject_kind === "student") {
    assertInstituteRoles(actor, row.institute_id, [...STUDENT_LEAVE_DECIDE_ROLES]);
  } else {
    assertInstituteRoles(actor, row.institute_id, [...TEACHER_LEAVE_DECIDE_ROLES]);
  }

  const note =
    input.note === undefined || input.note === null
      ? null
      : input.note.trim() || null;

  const decision = await insertLeaveDecision(admin, {
    instituteId: row.institute_id,
    leaveRequestId: row.id,
    outcome: input.outcome,
    note,
    decidedByUserId: actor.userId,
  });

  const updated = await updateLeaveRequestStatus(
    admin,
    row.id,
    input.outcome as LeaveStatus,
  );
  if (!updated) throw AppError.notFound("Leave request not found");

  return {
    request: toLeaveRequestDto(updated),
    decision: toLeaveDecisionDto(decision),
  };
}

export async function cancelLeaveForActor(
  admin: SupabaseClient,
  actor: Actor,
  leaveRequestId: string,
): Promise<LeaveRequestDto> {
  const row = await findLeaveRequestById(admin, leaveRequestId);
  if (!row) throw AppError.notFound("Leave request not found");
  assertInstituteAccess(actor, row.institute_id);

  if (row.status !== "pending") {
    throw AppError.conflict("Only pending leave can be cancelled");
  }

  const staffCancel = STUDENT_LEAVE_STAFF_CREATE_ROLES.some((role) =>
    actorHasInstituteRole(actor, row.institute_id, role),
  );

  let allowed = staffCancel || row.requested_by_user_id === actor.userId;

  if (!allowed && row.subject_kind === "student" && row.student_id) {
    const linked = await resolveLinkedStudentIds(admin, actor, row.institute_id);
    allowed = linked.has(row.student_id);
  }

  if (!allowed && row.subject_kind === "teacher" && row.teacher_id) {
    allowed = actorTeacherIds(actor, row.institute_id).has(row.teacher_id);
  }

  if (!allowed) {
    throw AppError.forbidden("Cannot cancel this leave request");
  }

  const updated = await updateLeaveRequestStatus(admin, row.id, "cancelled");
  if (!updated) throw AppError.notFound("Leave request not found");
  return toLeaveRequestDto(updated);
}

export type { LeaveSubjectKind, LeaveStatus };
