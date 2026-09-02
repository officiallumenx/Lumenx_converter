import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import { emitNotificationForInstituteSystem } from "../notifications/service.js";
import { findParentById, listLinksForStudent } from "../parents/repository.js";
import { findStudentById } from "../students/repository.js";
import { findTeacherById } from "../teachers/repository.js";
import type { LeaveDecisionDto, LeaveRequestDto } from "./types.js";

const ADMIN_LEAVE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
] as const;

function formatDateRange(start: string, end: string): string {
  return start === end ? start : `${start} – ${end}`;
}

function reasonPreview(reason: string, max = 80): string {
  const t = reason.trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

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
  sectionId: string | null,
): Promise<string[]> {
  if (!sectionId) return [];
  const assignResult = await admin
    .from("teacher_assignment")
    .select("teacher_id")
    .eq("institute_id", instituteId)
    .eq("section_id", sectionId)
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

async function emitLeaveNotification(
  admin: SupabaseClient,
  actorUserId: string,
  input: {
    instituteId: string;
    recipientUserIds: string[];
    title: string;
    body: string;
    dedupeKey: string;
    leaveId: string;
    kind: string;
    /** When true, surfaces as urgent in-app alert (teachers on /alerts). */
    asAlert?: boolean;
  },
): Promise<void> {
  if (input.recipientUserIds.length === 0) return;
  try {
    await emitNotificationForInstituteSystem(admin, actorUserId, {
      instituteId: input.instituteId,
      recipientUserIds: input.recipientUserIds,
      category: "leave",
      priority: input.asAlert ? "critical" : "important",
      title: input.title,
      body: input.body,
      deepLink: input.asAlert ? "/alerts" : "/leave",
      dedupeKey: input.dedupeKey,
      payload: input.asAlert
        ? { leaveId: input.leaveId, kind: input.kind, presentation: "alert" }
        : { leaveId: input.leaveId, kind: input.kind },
    });
  } catch {
    /* notification delivery must not block leave writes */
  }
}

export async function emitStudentLeaveCreatedNotifications(
  admin: SupabaseClient,
  actorUserId: string,
  request: LeaveRequestDto,
): Promise<void> {
  if (!request.studentId) return;

  const student = await findStudentById(admin, request.studentId);
  const studentName = student?.display_name?.trim() || "Student";
  const dateRange = formatDateRange(request.startDate, request.endDate);
  const preview = reasonPreview(request.reason);

  const teacherIds = await listSectionTeacherUserIds(
    admin,
    request.instituteId,
    request.sectionId,
  );
  await emitLeaveNotification(admin, actorUserId, {
    instituteId: request.instituteId,
    recipientUserIds: teacherIds.filter((id) => id !== actorUserId),
    title: "New leave request",
    body: `${studentName} · ${dateRange}: ${preview}`,
    dedupeKey: `leave-student-req:${request.id}`,
    leaveId: request.id,
    kind: "student_request",
    asAlert: true,
  });

  const parentIds = await listParentUserIdsForStudent(
    admin,
    request.studentId,
    request.instituteId,
  );
  const parentRecipients = parentIds.filter((id) => id !== actorUserId);
  if (parentRecipients.length === 0 && request.requestedByUserId !== actorUserId) {
    parentRecipients.push(request.requestedByUserId);
  }
  await emitLeaveNotification(admin, actorUserId, {
    instituteId: request.instituteId,
    recipientUserIds: [...new Set(parentRecipients)],
    title: "Leave submitted",
    body: `${studentName} · ${dateRange} — pending class teacher review.`,
    dedupeKey: `leave-parent-pending:${request.id}`,
    leaveId: request.id,
    kind: "parent_pending",
  });
}

export async function emitTeacherLeaveCreatedNotifications(
  admin: SupabaseClient,
  actorUserId: string,
  request: LeaveRequestDto,
): Promise<void> {
  if (!request.teacherId) return;

  const teacher = await findTeacherById(admin, request.teacherId);
  const teacherName = teacher?.display_name?.trim() || "Teacher";
  const dateRange = formatDateRange(request.startDate, request.endDate);
  const preview = reasonPreview(request.reason);

  const adminIds = await listInstituteStaffUserIdsByRoles(
    admin,
    request.instituteId,
    ADMIN_LEAVE_ROLES,
  );
  await emitLeaveNotification(admin, actorUserId, {
    instituteId: request.instituteId,
    recipientUserIds: adminIds.filter((id) => id !== actorUserId),
    title: "Teacher leave request",
    body: `${teacherName} · ${request.leaveType} · ${dateRange}: ${preview}`,
    dedupeKey: `leave-teacher-req:${request.id}`,
    leaveId: request.id,
    kind: "teacher_request",
  });

  if (teacher?.user_profile_id) {
    const reviewer =
      request.intendedApproverRole === "principal" ? "principal" : "admin";
    await emitLeaveNotification(admin, actorUserId, {
      instituteId: request.instituteId,
      recipientUserIds: [teacher.user_profile_id],
      title: "Leave request sent",
      body: `${dateRange} — pending ${reviewer} approval.`,
      dedupeKey: `leave-teacher-pending:${request.id}`,
      leaveId: request.id,
      kind: "teacher_pending",
    });
  }
}

export async function emitStudentLeaveDecidedNotifications(
  admin: SupabaseClient,
  actorUserId: string,
  request: LeaveRequestDto,
  decision: LeaveDecisionDto,
): Promise<void> {
  if (!request.studentId) return;

  const student = await findStudentById(admin, request.studentId);
  const studentName = student?.display_name?.trim() || "Student";
  const dateRange = formatDateRange(request.startDate, request.endDate);
  const outcome =
    decision.outcome === "approved"
      ? "approved"
      : decision.outcome === "rejected"
        ? "rejected"
        : "ignored";
  const note = decision.note?.trim();
  const body =
    outcome === "approved"
      ? `${studentName} · ${dateRange} — approved by class teacher.`
      : `${studentName} · ${dateRange} — ${outcome}${note ? `. ${note}` : "."}`;

  const parentIds = await listParentUserIdsForStudent(
    admin,
    request.studentId,
    request.instituteId,
  );
  await emitLeaveNotification(admin, actorUserId, {
    instituteId: request.instituteId,
    recipientUserIds: parentIds,
    title: `Leave ${outcome}`,
    body,
    dedupeKey: `leave-parent-decision:${request.id}:${outcome}`,
    leaveId: request.id,
    kind: "parent_decision",
  });
}

export async function emitTeacherLeaveDecidedNotifications(
  admin: SupabaseClient,
  actorUserId: string,
  request: LeaveRequestDto,
  decision: LeaveDecisionDto,
): Promise<void> {
  if (!request.teacherId) return;

  const teacher = await findTeacherById(admin, request.teacherId);
  if (!teacher?.user_profile_id) return;

  const dateRange = formatDateRange(request.startDate, request.endDate);
  const outcome =
    decision.outcome === "approved"
      ? "approved"
      : decision.outcome === "rejected"
        ? "rejected"
        : "ignored";
  const note = decision.note?.trim();
  const body =
    outcome === "approved"
      ? `${dateRange} — approved by school office.`
      : `${dateRange} — ${outcome}${note ? `. ${note}` : "."}`;

  await emitLeaveNotification(admin, actorUserId, {
    instituteId: request.instituteId,
    recipientUserIds: [teacher.user_profile_id],
    title: `Leave ${outcome}`,
    body,
    dedupeKey: `leave-teacher-decision:${request.id}:${outcome}`,
    leaveId: request.id,
    kind: "teacher_decision",
  });
}
