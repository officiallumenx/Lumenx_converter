import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  actorHasInstituteRole,
  requireInstituteId,
} from "../../authorization/index.js";
import { ensureDbOk } from "../../db/errors.js";
import { emitNotificationForInstituteSystem } from "../notifications/service.js";
import {
  findParentById,
  listLinksForStudent,
  listParents,
} from "../parents/repository.js";
import { listTeachers } from "../teachers/repository.js";
import { findMemberRoleCodes } from "./repository.js";
import {
  findStudentById,
  listGuardianStudentIds,
  listStudents,
} from "../students/repository.js";
import {
  findActiveMembershipId,
  findMessageById,
  findProfileDisplayNames,
  findThreadById,
  insertMessage,
  insertThread,
  insertThreadParticipants,
  listMessagesForThread,
  listParticipantsForThread,
  listThreadIdsForParticipant,
  listThreads,
  softDeleteMessage,
  updateMessageFields,
  updateThreadFields,
} from "./repository.js";
import type {
  CreateGroupThreadInput,
  CreateMessageInput,
  CreateThreadInput,
  MessageDto,
  MessageRecipientDto,
  MessageRow,
  MessageThreadDto,
  MessageThreadRow,
  UpdateThreadInput,
} from "./types.js";

export const STAFF_READ_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "it_admin",
  "staff",
  "teacher",
  "accountant",
  "admissions_officer",
] as const;

export const STAFF_WRITE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "it_admin",
  "staff",
  "teacher",
] as const;

export function toThreadDto(
  row: MessageThreadRow,
  participantUserIds?: string[],
): MessageThreadDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    subject: row.subject,
    studentId: row.student_id,
    threadKind: row.thread_kind ?? "direct",
    groupClassLabel: row.group_class_label,
    groupSectionLabel: row.group_section_label,
    createdByUserId: row.created_by_user_id,
    counterpartUserId: row.counterpart_user_id,
    status: row.status,
    lastMessageAt: row.last_message_at,
    participantUserIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toMessageDto(row: MessageRow): MessageDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    threadId: row.thread_id,
    senderUserId: row.sender_user_id,
    body: row.body,
    sentAt: row.sent_at,
    readAt: row.read_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isMember(actor: Actor, instituteId: string): boolean {
  return (
    actor.isPlatformOperator ||
    actor.memberships.some(
      (m) => m.instituteId === instituteId && m.status === "active",
    )
  );
}

function isStaffReader(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  return STAFF_READ_ROLES.some((role) =>
    actorHasInstituteRole(actor, instituteId, role),
  );
}

function isStaffWriter(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  return STAFF_WRITE_ROLES.some((role) =>
    actorHasInstituteRole(actor, instituteId, role),
  );
}

function isDirectParticipant(actor: Actor, row: MessageThreadRow): boolean {
  return (
    row.created_by_user_id === actor.userId ||
    row.counterpart_user_id === actor.userId
  );
}

function canReadThread(
  actor: Actor,
  row: MessageThreadRow,
  groupThreadIds: Set<string>,
): boolean {
  if (!isMember(actor, row.institute_id)) return false;
  if (isStaffReader(actor, row.institute_id)) return true;
  if (row.thread_kind === "group") {
    return (
      row.created_by_user_id === actor.userId ||
      groupThreadIds.has(row.id)
    );
  }
  return isDirectParticipant(actor, row);
}

function canPostOnThread(
  actor: Actor,
  row: MessageThreadRow,
  groupThreadIds: Set<string>,
): boolean {
  if (!isMember(actor, row.institute_id)) return false;
  if (row.thread_kind === "group") {
    return (
      row.created_by_user_id === actor.userId ||
      groupThreadIds.has(row.id) ||
      isStaffReader(actor, row.institute_id)
    );
  }
  if (isDirectParticipant(actor, row)) return true;
  return isStaffReader(actor, row.institute_id);
}

function canMarkRead(
  actor: Actor,
  row: MessageThreadRow,
  groupThreadIds: Set<string>,
): boolean {
  if (row.thread_kind === "group") {
    return (
      row.created_by_user_id === actor.userId ||
      groupThreadIds.has(row.id)
    );
  }
  return isDirectParticipant(actor, row);
}

async function assertOptionalStudentId(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
  studentId: string | null | undefined,
): Promise<string | null> {
  if (studentId == null) return null;

  const student = await findStudentById(admin, studentId);
  if (!student || student.institute_id !== instituteId) {
    throw AppError.validation("Referenced resource is invalid", {
      student_id: ["Student not found in this institute"],
    });
  }

  if (isStaffReader(actor, instituteId)) return studentId;

  if (student.user_profile_id === actor.userId) return studentId;

  for (const p of actor.parents) {
    if (p.instituteId !== instituteId) continue;
    const linked = await listGuardianStudentIds(admin, p.parentId, instituteId);
    if (linked.includes(studentId)) return studentId;
  }

  throw AppError.validation("Referenced resource is invalid", {
    student_id: ["Student not linked to this actor"],
  });
}

function assertBody(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length < 1) {
    throw AppError.validation("Referenced resource is invalid", {
      body: ["Required"],
    });
  }
  return trimmed;
}

function normalizeSubject(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value == null) return null;
  const trimmed = value.trim();
  if (trimmed.length < 1) {
    throw AppError.validation("Referenced resource is invalid", {
      subject: ["Must be at least 1 character when provided"],
    });
  }
  return trimmed;
}

async function resolveSectionParticipantUserIds(
  admin: SupabaseClient,
  instituteId: string,
  classLabel: string,
  sectionLabel: string,
): Promise<string[]> {
  const students = await listStudents(admin, {
    instituteId,
    classLabel: classLabel.trim(),
    sectionLabel: sectionLabel.trim(),
    status: "active",
  });
  const userIds = new Set<string>();
  for (const student of students) {
    if (student.user_profile_id) userIds.add(student.user_profile_id);
    const links = await listLinksForStudent(admin, student.id, instituteId);
    for (const link of links) {
      const parent = await findParentById(admin, link.parent_id);
      if (parent?.user_profile_id) userIds.add(parent.user_profile_id);
    }
  }
  return [...userIds];
}

async function primaryRoleForUser(
  admin: SupabaseClient,
  userId: string,
  instituteId: string,
): Promise<MessageRecipientDto["role"]> {
  const roles = await findMemberRoleCodes(admin, userId, instituteId);
  if (roles.includes("teacher")) return "teacher";
  if (roles.includes("parent")) return "parent";
  if (roles.includes("student")) return "student";
  return "staff";
}

async function emitMessageNotifications(
  admin: SupabaseClient,
  actor: Actor,
  thread: MessageThreadRow,
  message: MessageRow,
): Promise<void> {
  const profileNames = await findProfileDisplayNames(admin, [actor.userId]);
  const senderName = profileNames.get(actor.userId) ?? "Someone";
  const preview =
    thread.subject?.trim() ||
    (thread.thread_kind === "group"
      ? `${thread.group_class_label ?? "Class"} ${thread.group_section_label ?? ""}`.trim()
      : "New message");

  const recipientIds = new Set<string>();

  if (thread.thread_kind === "direct") {
    if (thread.created_by_user_id !== actor.userId) {
      recipientIds.add(thread.created_by_user_id);
    }
    if (thread.counterpart_user_id && thread.counterpart_user_id !== actor.userId) {
      recipientIds.add(thread.counterpart_user_id);
    }
  } else {
    const participants = await listParticipantsForThread(admin, thread.id);
    for (const p of participants) {
      if (p.user_profile_id !== actor.userId) {
        recipientIds.add(p.user_profile_id);
      }
    }
  }

  if (recipientIds.size === 0) return;

  for (const recipientId of recipientIds) {
    const role = await primaryRoleForUser(admin, recipientId, thread.institute_id);
    const title =
      role === "teacher"
        ? "New message"
        : role === "parent"
          ? "New message from school"
          : "New message";
    const body = `${senderName}: ${preview.slice(0, 120)}`;

    try {
      await emitNotificationForInstituteSystem(admin, actor.userId, {
        instituteId: thread.institute_id,
        recipientUserIds: [recipientId],
        category: "messages",
        priority: "important",
        title,
        body,
        deepLink: "/messages",
        dedupeKey: `msg-${message.id}-${recipientId}`,
        payload: {
          messageId: message.id,
          threadId: thread.id,
          recipientRole: role,
        },
      });
    } catch {
      /* notification must not block message send */
    }
  }
}

// ── Recipients ─────────────────────────────────────────────────

export async function listRecipientsForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
  studentIdRaw?: string | null,
): Promise<MessageRecipientDto[]> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  if (!isMember(actor, instituteId)) {
    throw AppError.forbidden("Insufficient messages access");
  }

  if (studentIdRaw) {
    await assertOptionalStudentId(admin, actor, instituteId, studentIdRaw);
  }

  const result: MessageRecipientDto[] = [];
  const seen = new Set<string>();

  const add = (
    userId: string | null | undefined,
    displayName: string,
    role: MessageRecipientDto["role"],
  ) => {
    if (!userId || userId === actor.userId || seen.has(userId)) return;
    seen.add(userId);
    result.push({ userId, displayName, role });
  };

  const isParentOrStudent =
    actorHasInstituteRole(actor, instituteId, "parent") ||
    actorHasInstituteRole(actor, instituteId, "student");

  if (isParentOrStudent || !isStaffReader(actor, instituteId)) {
    const teachers = await listTeachers(admin, { instituteId });
    for (const t of teachers) {
      add(t.user_profile_id, t.display_name?.trim() || "Teacher", "teacher");
    }
  }

  if (isStaffReader(actor, instituteId)) {
    const teachers = await listTeachers(admin, { instituteId });
    for (const t of teachers) {
      add(t.user_profile_id, t.display_name?.trim() || "Teacher", "teacher");
    }
    const parents = await listParents(admin, { instituteId });
    for (const p of parents) {
      add(p.user_profile_id, p.name?.trim() || "Parent", "parent");
    }
    const students = await listStudents(admin, { instituteId, status: "active" });
    for (const s of students) {
      add(s.user_profile_id, s.display_name?.trim() || "Student", "student");
    }
  }

  return result.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

// ── Threads ──────────────────────────────────────────────────────

export async function listThreadsForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
): Promise<MessageThreadDto[]> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  const groupThreadIds = await listThreadIdsForParticipant(
    admin,
    actor.userId,
    instituteId,
  );
  const rows = await listThreads(admin, instituteId);
  return rows
    .filter((r) => canReadThread(actor, r, groupThreadIds))
    .map((r) => toThreadDto(r));
}

export async function getThreadForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<MessageThreadDto> {
  const row = await findThreadById(admin, id);
  if (!row) throw AppError.notFound("Message thread not found");
  const groupThreadIds = await listThreadIdsForParticipant(
    admin,
    actor.userId,
    row.institute_id,
  );
  if (!canReadThread(actor, row, groupThreadIds)) {
    throw AppError.notFound("Message thread not found");
  }
  const participants =
    row.thread_kind === "group"
      ? (await listParticipantsForThread(admin, row.id)).map(
          (p) => p.user_profile_id,
        )
      : undefined;
  return toThreadDto(row, participants);
}

export async function createThreadForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateThreadInput,
): Promise<MessageThreadDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);

  if (input.counterpartUserId === actor.userId) {
    throw AppError.validation("Referenced resource is invalid", {
      counterpart_user_id: ["Cannot create a thread with yourself"],
    });
  }

  const counterpartMembership = await findActiveMembershipId(
    admin,
    input.counterpartUserId,
    instituteId,
  );
  if (!counterpartMembership) {
    throw AppError.validation("Referenced resource is invalid", {
      counterpart_user_id: ["Counterpart is not an active member of this institute"],
    });
  }

  const studentId = await assertOptionalStudentId(
    admin,
    actor,
    instituteId,
    input.studentId,
  );
  const subject = normalizeSubject(input.subject) ?? null;
  const initialBody =
    input.body != null && input.body.trim().length > 0
      ? assertBody(input.body)
      : null;

  const now = new Date().toISOString();
  const thread = await insertThread(admin, {
    instituteId,
    subject,
    studentId,
    threadKind: "direct",
    createdByUserId: actor.userId,
    counterpartUserId: input.counterpartUserId,
    status: "open",
    lastMessageAt: initialBody ? now : null,
  });

  if (initialBody) {
    const msg = await insertMessage(admin, {
      instituteId,
      threadId: thread.id,
      senderUserId: actor.userId,
      body: initialBody,
      sentAt: now,
    });
    await emitMessageNotifications(admin, actor, thread, msg);
  }

  const fresh = await findThreadById(admin, thread.id);
  return toThreadDto(fresh ?? thread);
}

export async function createGroupThreadForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateGroupThreadInput,
): Promise<MessageThreadDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  if (!isStaffWriter(actor, instituteId)) {
    throw AppError.forbidden("Only staff can create class message threads");
  }

  const classLabel = input.classLabel.trim();
  const sectionLabel = input.sectionLabel.trim();
  if (!classLabel || !sectionLabel) {
    throw AppError.validation("Referenced resource is invalid", {
      class_label: ["Required"],
      section_label: ["Required"],
    });
  }

  const participantIds = await resolveSectionParticipantUserIds(
    admin,
    instituteId,
    classLabel,
    sectionLabel,
  );
  if (participantIds.length === 0) {
    throw AppError.validation("Referenced resource is invalid", {
      section_label: ["No students or parents found for this class"],
    });
  }

  const subject =
    normalizeSubject(input.subject) ??
    `${classLabel} ${sectionLabel}`.trim();
  const initialBody =
    input.body != null && input.body.trim().length > 0
      ? assertBody(input.body)
      : null;
  const now = new Date().toISOString();

  const thread = await insertThread(admin, {
    instituteId,
    subject,
    studentId: null,
    threadKind: "group",
    groupClassLabel: classLabel,
    groupSectionLabel: sectionLabel,
    createdByUserId: actor.userId,
    counterpartUserId: null,
    status: "open",
    lastMessageAt: initialBody ? now : null,
  });

  await insertThreadParticipants(
    admin,
    participantIds.map((userProfileId) => ({
      instituteId,
      threadId: thread.id,
      userProfileId,
    })),
  );

  if (initialBody) {
    const msg = await insertMessage(admin, {
      instituteId,
      threadId: thread.id,
      senderUserId: actor.userId,
      body: initialBody,
      sentAt: now,
    });
    await emitMessageNotifications(admin, actor, thread, msg);
  }

  const fresh = await findThreadById(admin, thread.id);
  return toThreadDto(fresh ?? thread, participantIds);
}

export async function updateThreadForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: UpdateThreadInput,
): Promise<MessageThreadDto> {
  const existing = await findThreadById(admin, id);
  if (!existing) throw AppError.notFound("Message thread not found");

  const groupThreadIds = await listThreadIdsForParticipant(
    admin,
    actor.userId,
    existing.institute_id,
  );
  if (!canReadThread(actor, existing, groupThreadIds)) {
    throw AppError.notFound("Message thread not found");
  }

  const participant =
    existing.thread_kind === "direct"
      ? isDirectParticipant(actor, existing)
      : existing.created_by_user_id === actor.userId ||
        groupThreadIds.has(existing.id);
  const writer = isStaffWriter(actor, existing.institute_id);

  if (!participant && !writer) {
    throw AppError.notFound("Message thread not found");
  }

  const patch: Record<string, unknown> = {};

  if (input.subject !== undefined) {
    patch.subject = normalizeSubject(input.subject) ?? null;
  }

  if (input.status !== undefined) {
    if (input.status === "archived") {
      if (!writer) throw AppError.notFound("Message thread not found");
      patch.status = "archived";
    } else if (input.status === "closed" || input.status === "open") {
      if (existing.status === "archived" && !writer) {
        throw AppError.notFound("Message thread not found");
      }
      patch.status = input.status;
    } else {
      throw AppError.validation("Referenced resource is invalid", {
        status: ["Invalid status"],
      });
    }
  }

  if (Object.keys(patch).length === 0) return toThreadDto(existing);
  const updated = await updateThreadFields(admin, id, patch);
  if (!updated) throw AppError.notFound("Message thread not found");
  return toThreadDto(updated);
}

// ── Messages ─────────────────────────────────────────────────────

export async function listMessagesForActor(
  admin: SupabaseClient,
  actor: Actor,
  threadId: string,
): Promise<MessageDto[]> {
  const thread = await findThreadById(admin, threadId);
  if (!thread) throw AppError.notFound("Message thread not found");
  const groupThreadIds = await listThreadIdsForParticipant(
    admin,
    actor.userId,
    thread.institute_id,
  );
  if (!canReadThread(actor, thread, groupThreadIds)) {
    throw AppError.notFound("Message thread not found");
  }
  const rows = await listMessagesForThread(admin, threadId);
  return rows.map(toMessageDto);
}

export async function createMessageForActor(
  admin: SupabaseClient,
  actor: Actor,
  threadId: string,
  input: CreateMessageInput,
): Promise<MessageDto> {
  const thread = await findThreadById(admin, threadId);
  if (!thread) throw AppError.notFound("Message thread not found");
  const groupThreadIds = await listThreadIdsForParticipant(
    admin,
    actor.userId,
    thread.institute_id,
  );
  if (!canPostOnThread(actor, thread, groupThreadIds)) {
    throw AppError.notFound("Message thread not found");
  }

  if (thread.status !== "open") {
    throw AppError.conflict("Cannot post to a closed or archived thread");
  }

  const body = assertBody(input.body);
  const now = new Date().toISOString();
  const row = await insertMessage(admin, {
    instituteId: thread.institute_id,
    threadId: thread.id,
    senderUserId: actor.userId,
    body,
    sentAt: now,
  });
  await updateThreadFields(admin, thread.id, { last_message_at: now });
  await emitMessageNotifications(admin, actor, thread, row);
  return toMessageDto(row);
}

export async function markMessageReadForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<MessageDto> {
  const message = await findMessageById(admin, id);
  if (!message) throw AppError.notFound("Message not found");

  const thread = await findThreadById(admin, message.thread_id);
  if (!thread) throw AppError.notFound("Message not found");

  const groupThreadIds = await listThreadIdsForParticipant(
    admin,
    actor.userId,
    thread.institute_id,
  );
  if (
    !canReadThread(actor, thread, groupThreadIds) ||
    !canMarkRead(actor, thread, groupThreadIds)
  ) {
    throw AppError.notFound("Message not found");
  }

  if (message.sender_user_id === actor.userId) {
    throw AppError.notFound("Message not found");
  }

  if (message.read_at != null) return toMessageDto(message);

  const updated = await updateMessageFields(admin, id, {
    read_at: new Date().toISOString(),
  });
  if (!updated) throw AppError.notFound("Message not found");
  return toMessageDto(updated);
}

export async function deleteMessageForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<void> {
  const message = await findMessageById(admin, id);
  if (!message) throw AppError.notFound("Message not found");

  const thread = await findThreadById(admin, message.thread_id);
  if (!thread) throw AppError.notFound("Message not found");

  const groupThreadIds = await listThreadIdsForParticipant(
    admin,
    actor.userId,
    thread.institute_id,
  );
  if (!canReadThread(actor, thread, groupThreadIds)) {
    throw AppError.notFound("Message not found");
  }

  const isOwner = message.sender_user_id === actor.userId;
  const writer = isStaffWriter(actor, message.institute_id);
  if (!isOwner && !writer) {
    throw AppError.notFound("Message not found");
  }

  const deleted = await softDeleteMessage(admin, id);
  if (!deleted) throw AppError.notFound("Message not found");
}
