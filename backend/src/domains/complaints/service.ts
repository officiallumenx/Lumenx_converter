import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteAccess,
  actorHasInstituteRole,
  requireInstituteId,
  requireTeacherIdentity,
} from "../../authorization/index.js";
import {
  findStudentById,
  listGuardianStudentIds,
} from "../students/repository.js";
import {
  findComplaintById,
  insertComplaint,
  listComplaints,
  softDeleteComplaint,
  teacherCoversStudent,
  toComplaintUpdatePatch,
  updateComplaintFields,
} from "./repository.js";
import type {
  ComplaintDestination,
  ComplaintDto,
  ComplaintRow,
  ComplaintStatus,
  CreateComplaintInput,
  ListComplaintsFilter,
  TransitionComplaintInput,
  UpdateComplaintInput,
} from "./types.js";
import {
  emitComplaintCreatedNotifications,
  emitComplaintTransitionNotifications,
} from "./notifications.js";

/** Admin triage write roles (principal_admin destination). */
export const COMPLAINT_TRIAGE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
] as const;

export const COMPLAINT_STAFF_READ_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "it_admin",
  "accountant",
  "admissions_officer",
  "staff",
] as const;

const TERMINAL: ComplaintStatus[] = [
  "resolved",
  "rejected",
  "closed",
  "archived",
];

const ALLOWED_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  draft: ["pending"],
  pending: ["review", "forwarded", "resolved", "rejected", "closed"],
  review: ["forwarded", "resolved", "rejected", "closed", "pending"],
  forwarded: ["review", "resolved", "rejected", "closed"],
  resolved: ["archived", "closed"],
  rejected: ["archived"],
  closed: ["archived"],
  archived: [],
};

export function toComplaintDto(row: ComplaintRow): ComplaintDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    title: row.title,
    body: row.body,
    category: row.category,
    priority: row.priority,
    status: row.status,
    destination: row.destination,
    requestedByUserId: row.requested_by_user_id,
    studentId: row.student_id,
    teacherId: row.teacher_id,
    responseNote: row.response_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isTriageWriter(actor: Actor, instituteId: string): boolean {
  return COMPLAINT_TRIAGE_ROLES.some((role) =>
    actorHasInstituteRole(actor, instituteId, role),
  );
}

function isStaffWideReader(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  return COMPLAINT_STAFF_READ_ROLES.some((role) =>
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

async function canReadComplaint(
  admin: SupabaseClient,
  actor: Actor,
  row: ComplaintRow,
): Promise<boolean> {
  assertInstituteAccess(actor, row.institute_id);

  // Drafts: requester or triage only
  if (row.status === "draft") {
    if (row.requested_by_user_id === actor.userId) return true;
    if (isTriageWriter(actor, row.institute_id)) return true;
    return false;
  }

  if (isStaffWideReader(actor, row.institute_id)) return true;
  if (isTriageWriter(actor, row.institute_id)) return true;
  if (row.requested_by_user_id === actor.userId) return true;

  if (row.student_id) {
    const linked = await resolveLinkedStudentIds(
      admin,
      actor,
      row.institute_id,
    );
    if (linked.has(row.student_id)) return true;
  }

  if (row.teacher_id) {
    if (actorTeacherIds(actor, row.institute_id).has(row.teacher_id)) {
      return true;
    }
  }

  // Class-teacher queue: only teachers assigned to the student's section(s)
  if (
    row.destination === "class_teacher" &&
    row.student_id &&
    actorHasInstituteRole(actor, row.institute_id, "teacher")
  ) {
    const identity = actor.teachers.find(
      (t) => t.instituteId === row.institute_id && t.status === "active",
    );
    if (identity) {
      return teacherCoversStudent(admin, {
        instituteId: row.institute_id,
        teacherId: identity.teacherId,
        studentId: row.student_id,
      });
    }
  }

  return false;
}

async function assertCanRead(
  admin: SupabaseClient,
  actor: Actor,
  row: ComplaintRow,
): Promise<void> {
  if (!(await canReadComplaint(admin, actor, row))) {
    throw AppError.forbidden("Insufficient complaint access");
  }
}

function assertText(value: string, field: string, min: number): string {
  const trimmed = value.trim();
  if (trimmed.length < min) {
    throw AppError.validation("Referenced resource is invalid", {
      [field]: [`Must be at least ${min} characters`],
    });
  }
  return trimmed;
}

export async function listComplaintsForActor(
  admin: SupabaseClient,
  actor: Actor,
  filter: ListComplaintsFilter,
): Promise<ComplaintDto[]> {
  const instituteId = requireInstituteId(actor, filter.instituteId);
  const rows = await listComplaints(admin, { ...filter, instituteId });
  const out: ComplaintDto[] = [];
  for (const row of rows) {
    if (await canReadComplaint(admin, actor, row)) {
      out.push(toComplaintDto(row));
    }
  }
  return out;
}

export async function getComplaintForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<ComplaintDto> {
  const row = await findComplaintById(admin, id);
  if (!row) throw AppError.notFound("Complaint not found");
  await assertCanRead(admin, actor, row);
  return toComplaintDto(row);
}

export async function createComplaintForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateComplaintInput,
): Promise<ComplaintDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  const title = assertText(input.title, "title", 3);
  const body = assertText(input.body, "body", 12);
  const category = assertText(input.category, "category", 1);

  const asDraft = input.asDraft === true;
  const destination = input.destination ?? null;
  if (!asDraft && !destination) {
    throw AppError.validation("Referenced resource is invalid", {
      destination: ["Required when submitting (not draft)"],
    });
  }

  let studentId: string | null = input.studentId ?? null;
  let teacherId: string | null = null;

  const isTeacher = actorHasInstituteRole(actor, instituteId, "teacher");
  const isParentOrStudent =
    actor.parents.some((p) => p.instituteId === instituteId) ||
    actor.students.some((s) => s.instituteId === instituteId);
  const isStaffCreate = isTriageWriter(actor, instituteId);

  if (!isTeacher && !isParentOrStudent && !isStaffCreate) {
    throw AppError.forbidden("Cannot create complaints in this institute");
  }

  if (isTeacher && !isStaffCreate) {
    const identity = requireTeacherIdentity(actor, instituteId);
    teacherId = identity.teacherId;
    studentId = null;
  } else if (studentId) {
    const student = await findStudentById(admin, studentId);
    if (!student || student.institute_id !== instituteId) {
      throw AppError.validation("Referenced resource is invalid", {
        student_id: ["Student not found in this institute"],
      });
    }
    if (!isStaffCreate) {
      const linked = await resolveLinkedStudentIds(admin, actor, instituteId);
      if (!linked.has(studentId)) {
        throw AppError.forbidden("Cannot create complaint for this student");
      }
    }
  } else if (isParentOrStudent && !isStaffCreate) {
    // Student self: use own student id if single; parents must pass student_id
    const own = actor.students.filter((s) => s.instituteId === instituteId);
    if (own.length === 1) {
      studentId = own[0]!.studentId;
    } else if (actor.parents.some((p) => p.instituteId === instituteId)) {
      throw AppError.validation("Referenced resource is invalid", {
        student_id: ["Required for parent complaints"],
      });
    }
  }

  const row = await insertComplaint(admin, {
    instituteId,
    title,
    body,
    category,
    priority: input.priority ?? "medium",
    destination: asDraft ? destination : destination,
    studentId,
    asDraft,
    requestedByUserId: actor.userId,
    teacherId,
    status: asDraft ? "draft" : "pending",
  });
  await emitComplaintCreatedNotifications(admin, actor.userId, row);
  return toComplaintDto(row);
}

export async function updateComplaintForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: UpdateComplaintInput,
): Promise<ComplaintDto> {
  const existing = await findComplaintById(admin, id);
  if (!existing) throw AppError.notFound("Complaint not found");
  assertInstituteAccess(actor, existing.institute_id);

  const staff = isTriageWriter(actor, existing.institute_id);
  const isOwner = existing.requested_by_user_id === actor.userId;

  if (!staff && !isOwner) {
    throw AppError.forbidden("Cannot update this complaint");
  }
  if (!staff && existing.status !== "draft") {
    throw AppError.conflict("Only drafts can be edited by the requester");
  }
  if (existing.status === "archived") {
    throw AppError.conflict("Archived complaints cannot be edited");
  }

  if (input.title !== undefined) assertText(input.title, "title", 3);
  if (input.body !== undefined) assertText(input.body, "body", 12);
  if (input.category !== undefined) assertText(input.category, "category", 1);

  const patch = toComplaintUpdatePatch(input);
  if (Object.keys(patch).length === 0) return toComplaintDto(existing);

  const updated = await updateComplaintFields(admin, id, patch);
  if (!updated) throw AppError.notFound("Complaint not found");
  return toComplaintDto(updated);
}

function canTransition(
  actor: Actor,
  row: ComplaintRow,
  next: ComplaintStatus,
): boolean {
  const allowed = ALLOWED_TRANSITIONS[row.status] ?? [];
  if (!allowed.includes(next)) return false;

  if (isTriageWriter(actor, row.institute_id)) return true;

  // Requester may submit draft → pending
  if (
    row.requested_by_user_id === actor.userId &&
    row.status === "draft" &&
    next === "pending"
  ) {
    return true;
  }

  // Teacher on own complaint
  if (
    row.teacher_id &&
    actorTeacherIds(actor, row.institute_id).has(row.teacher_id) &&
    row.requested_by_user_id === actor.userId
  ) {
    return ["forwarded", "closed", "archived", "resolved"].includes(next);
  }

  return false;
}

async function canTeacherHandleClassQueue(
  admin: SupabaseClient,
  actor: Actor,
  row: ComplaintRow,
  next: ComplaintStatus,
): Promise<boolean> {
  const allowed = ALLOWED_TRANSITIONS[row.status] ?? [];
  if (!allowed.includes(next)) return false;
  if (row.destination !== "class_teacher" || row.status === "draft") return false;
  if (!actorHasInstituteRole(actor, row.institute_id, "teacher")) return false;
  if (!row.student_id) return false;

  // Teachers may only acknowledge / escalate — not close or reject
  if (!["review", "forwarded", "pending"].includes(next)) return false;

  const identity = actor.teachers.find(
    (t) => t.instituteId === row.institute_id && t.status === "active",
  );
  if (!identity) return false;

  return teacherCoversStudent(admin, {
    instituteId: row.institute_id,
    teacherId: identity.teacherId,
    studentId: row.student_id,
  });
}

export async function transitionComplaintForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: TransitionComplaintInput,
): Promise<ComplaintDto> {
  const existing = await findComplaintById(admin, id);
  if (!existing) throw AppError.notFound("Complaint not found");
  assertInstituteAccess(actor, existing.institute_id);

  if (!canTransition(actor, existing, input.status)) {
    const classOk = await canTeacherHandleClassQueue(
      admin,
      actor,
      existing,
      input.status,
    );
    if (!classOk) {
      throw AppError.forbidden("Transition not allowed");
    }
  }

  if (input.status === "pending" && !existing.destination) {
    throw AppError.validation("Referenced resource is invalid", {
      destination: ["Required before submitting"],
    });
  }

  if (
    (input.status === "rejected" || input.status === "resolved") &&
    input.responseNote !== undefined &&
    input.responseNote !== null
  ) {
    assertText(input.responseNote, "response_note", 1);
  }

  const patch: Record<string, unknown> = { status: input.status };
  if (input.responseNote !== undefined) {
    patch.response_note = input.responseNote?.trim() || null;
  }
  if (input.status === "forwarded") {
    patch.destination = "principal_admin" satisfies ComplaintDestination;
  }

  const updated = await updateComplaintFields(admin, id, patch);
  if (!updated) throw AppError.notFound("Complaint not found");
  await emitComplaintTransitionNotifications(
    admin,
    actor.userId,
    existing,
    updated,
  );
  return toComplaintDto(updated);
}

export async function deleteComplaintForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<void> {
  const existing = await findComplaintById(admin, id);
  if (!existing) throw AppError.notFound("Complaint not found");
  assertInstituteAccess(actor, existing.institute_id);

  const staff = isTriageWriter(actor, existing.institute_id);
  const isOwner = existing.requested_by_user_id === actor.userId;

  if (!staff && !(isOwner && existing.status === "draft")) {
    throw AppError.forbidden("Only draft complaints can be deleted by requester");
  }
  if (!staff && existing.status !== "draft") {
    throw AppError.conflict("Only drafts can be deleted");
  }

  const deleted = await softDeleteComplaint(admin, id);
  if (!deleted) throw AppError.notFound("Complaint not found");
}
