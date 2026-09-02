import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import { emitNotificationForInstituteSystem } from "../notifications/service.js";
import { findParentById, listLinksForStudent } from "../parents/repository.js";
import { findStudentById } from "../students/repository.js";
import { findTeacherById } from "../teachers/repository.js";
import type { ComplaintDto, ComplaintRow } from "./types.js";

const ADMIN_TRIAGE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
] as const;

async function listInstituteStaffUserIdsByRoles(
  admin: SupabaseClient,
  instituteId: string,
  roleCodes: readonly string[],
): Promise<string[]> {
  const membershipResult = await admin
    .from("membership")
    .select("id, user_id")
    .eq("institute_id", instituteId)
    .eq("status", "active")
    .is("deleted_at", null);
  const memberships = ensureDbOk(membershipResult) as Array<{
    id: string;
    user_id: string;
  }>;
  if (memberships.length === 0) return [];

  const membershipIds = memberships.map((m) => m.id);
  const rolesResult = await admin
    .from("membership_role")
    .select("membership_id, role_code")
    .in("membership_id", membershipIds)
    .in("role_code", [...roleCodes]);
  const roleRows = ensureDbOk(rolesResult) as Array<{ membership_id: string }>;
  const matched = new Set(roleRows.map((r) => r.membership_id));
  return [
    ...new Set(
      memberships.filter((m) => matched.has(m.id)).map((m) => m.user_id),
    ),
  ];
}

async function listSectionTeacherUserIds(
  admin: SupabaseClient,
  instituteId: string,
  studentId: string,
): Promise<string[]> {
  const enrollResult = await admin
    .from("enrollment")
    .select("section_id")
    .eq("institute_id", instituteId)
    .eq("student_id", studentId)
    .eq("status", "active")
    .is("deleted_at", null);
  const enrollments = ensureDbOk(enrollResult) as Array<{ section_id: string }>;
  const sectionIds = [...new Set(enrollments.map((e) => e.section_id))];
  if (sectionIds.length === 0) return [];

  const assignResult = await admin
    .from("teacher_assignment")
    .select("teacher_id")
    .eq("institute_id", instituteId)
    .in("section_id", sectionIds)
    .eq("status", "active")
    .is("deleted_at", null);
  const assignments = ensureDbOk(assignResult) as Array<{ teacher_id: string }>;
  const teacherIds = [...new Set(assignments.map((a) => a.teacher_id))];
  const userIds: string[] = [];
  for (const teacherId of teacherIds) {
    const teacher = await findTeacherById(admin, teacherId);
    if (teacher?.user_profile_id) userIds.push(teacher.user_profile_id);
  }
  return [...new Set(userIds)];
}

async function listParentUserIdsForStudent(
  admin: SupabaseClient,
  studentId: string,
  instituteId: string,
): Promise<string[]> {
  const links = await listLinksForStudent(admin, studentId, instituteId);
  const ids: string[] = [];
  for (const link of links) {
    const parent = await findParentById(admin, link.parent_id);
    if (parent?.user_profile_id) ids.push(parent.user_profile_id);
  }
  return [...new Set(ids)];
}

async function emitComplaintNotification(
  admin: SupabaseClient,
  actorUserId: string,
  input: {
    instituteId: string;
    recipientUserIds: string[];
    title: string;
    body: string;
    dedupeKey: string;
    complaintId: string;
    kind: string;
    priority?: "normal" | "important";
  },
): Promise<void> {
  const recipients = input.recipientUserIds.filter((id) => id !== actorUserId);
  if (recipients.length === 0) return;
  try {
    await emitNotificationForInstituteSystem(admin, actorUserId, {
      instituteId: input.instituteId,
      recipientUserIds: recipients,
      category: "complaints",
      priority: input.priority ?? "normal",
      title: input.title,
      body: input.body,
      deepLink: "/complaints",
      dedupeKey: input.dedupeKey,
      payload: { complaintId: input.complaintId, kind: input.kind },
    });
  } catch {
    /* notification delivery must not block complaint writes */
  }
}

function rowToDto(row: ComplaintRow): ComplaintDto {
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

export async function emitComplaintCreatedNotifications(
  admin: SupabaseClient,
  actorUserId: string,
  row: ComplaintRow,
): Promise<void> {
  if (row.status === "draft") return;

  const dto = rowToDto(row);
  const preview =
    dto.title.length > 80 ? `${dto.title.slice(0, 80)}…` : dto.title;

  await emitComplaintNotification(admin, actorUserId, {
    instituteId: dto.instituteId,
    recipientUserIds: [dto.requestedByUserId],
    title: "Complaint submitted",
    body: `${preview} — we received your complaint.`,
    dedupeKey: `complaint-submitted:${dto.id}`,
    complaintId: dto.id,
    kind: "submitted",
  });

  if (dto.destination === "class_teacher" && dto.studentId) {
    const teacherIds = await listSectionTeacherUserIds(
      admin,
      dto.instituteId,
      dto.studentId,
    );
    const student = await findStudentById(admin, dto.studentId);
    const studentName = student?.display_name?.trim() || "Student";
    await emitComplaintNotification(admin, actorUserId, {
      instituteId: dto.instituteId,
      recipientUserIds: teacherIds,
      title: "New class complaint",
      body: `${studentName}: ${preview}`,
      dedupeKey: `complaint-class-new:${dto.id}`,
      complaintId: dto.id,
      kind: "class_queue",
      priority: dto.priority === "high" ? "important" : "normal",
    });
  }

  if (dto.destination === "principal_admin") {
    const adminIds = await listInstituteStaffUserIdsByRoles(
      admin,
      dto.instituteId,
      ADMIN_TRIAGE_ROLES,
    );
    await emitComplaintNotification(admin, actorUserId, {
      instituteId: dto.instituteId,
      recipientUserIds: adminIds,
      title: "New admin complaint",
      body: preview,
      dedupeKey: `complaint-admin-new:${dto.id}`,
      complaintId: dto.id,
      kind: "admin_queue",
      priority: dto.priority === "high" ? "important" : "normal",
    });
  }
}

export async function emitComplaintTransitionNotifications(
  admin: SupabaseClient,
  actorUserId: string,
  before: ComplaintRow,
  after: ComplaintRow,
): Promise<void> {
  if (before.status === after.status) return;

  if (before.status === "draft" && after.status === "pending") {
    await emitComplaintCreatedNotifications(admin, actorUserId, after);
    return;
  }

  const dto = rowToDto(after);
  const preview =
    dto.title.length > 80 ? `${dto.title.slice(0, 80)}…` : dto.title;

  const requesterRecipients = [dto.requestedByUserId];
  if (dto.studentId) {
    const parentIds = await listParentUserIdsForStudent(
      admin,
      dto.studentId,
      dto.instituteId,
    );
    requesterRecipients.push(...parentIds);
  }
  if (dto.teacherId) {
    const teacher = await findTeacherById(admin, dto.teacherId);
    if (teacher?.user_profile_id) requesterRecipients.push(teacher.user_profile_id);
  }

  if (after.status === "review") {
    await emitComplaintNotification(admin, actorUserId, {
      instituteId: dto.instituteId,
      recipientUserIds: [...new Set(requesterRecipients)],
      title: "Complaint under review",
      body: `${preview} is being reviewed.`,
      dedupeKey: `complaint-review:${dto.id}`,
      complaintId: dto.id,
      kind: "under_review",
    });
  }

  if (after.status === "forwarded") {
    const adminIds = await listInstituteStaffUserIdsByRoles(
      admin,
      dto.instituteId,
      ADMIN_TRIAGE_ROLES,
    );
    await emitComplaintNotification(admin, actorUserId, {
      instituteId: dto.instituteId,
      recipientUserIds: adminIds,
      title: "Complaint forwarded",
      body: `${preview} was forwarded to admin.`,
      dedupeKey: `complaint-forwarded:${dto.id}`,
      complaintId: dto.id,
      kind: "forwarded",
      priority: "important",
    });
    await emitComplaintNotification(admin, actorUserId, {
      instituteId: dto.instituteId,
      recipientUserIds: [...new Set(requesterRecipients)],
      title: "Complaint forwarded",
      body: `${preview} was escalated to Principal/Admin.`,
      dedupeKey: `complaint-forwarded-requester:${dto.id}`,
      complaintId: dto.id,
      kind: "forwarded_requester",
    });
  }

  if (after.status === "resolved") {
    const note = after.response_note?.trim();
    await emitComplaintNotification(admin, actorUserId, {
      instituteId: dto.instituteId,
      recipientUserIds: [...new Set(requesterRecipients)],
      title: "Complaint resolved",
      body: note ? `${preview} — ${note}` : `${preview} was resolved.`,
      dedupeKey: `complaint-resolved:${dto.id}`,
      complaintId: dto.id,
      kind: "resolved",
    });
  }

  if (after.status === "rejected") {
    const note = after.response_note?.trim() || "No reason provided";
    await emitComplaintNotification(admin, actorUserId, {
      instituteId: dto.instituteId,
      recipientUserIds: [...new Set(requesterRecipients)],
      title: "Complaint rejected",
      body: `${preview} — ${note}`,
      dedupeKey: `complaint-rejected:${dto.id}`,
      complaintId: dto.id,
      kind: "rejected",
      priority: "important",
    });
  }

  if (after.status === "closed") {
    await emitComplaintNotification(admin, actorUserId, {
      instituteId: dto.instituteId,
      recipientUserIds: [...new Set(requesterRecipients)],
      title: "Complaint closed",
      body: `${preview} was closed.`,
      dedupeKey: `complaint-closed:${dto.id}`,
      complaintId: dto.id,
      kind: "closed",
    });
  }
}
