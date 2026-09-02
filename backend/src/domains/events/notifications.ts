import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import { emitNotificationForInstituteSystem } from "../notifications/service.js";
import { listLinksForStudent } from "../parents/repository.js";
import { findParentById } from "../parents/repository.js";
import { findTeacherById } from "../teachers/repository.js";
import type { EventDto, EventRow } from "./types.js";
import { toEventDto } from "./service.js";

const STAFF_NOTIFY_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "teacher",
  "staff",
  "driver",
] as const;

function formatEventWhen(row: EventRow): string {
  const date = row.starts_on;
  const time = row.start_time?.trim().slice(0, 5);
  if (!time) return date;
  return `${date} · ${time}`;
}

async function listInstituteUserIdsByRoles(
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

async function listAudienceRecipientUserIds(
  admin: SupabaseClient,
  row: EventRow,
): Promise<string[]> {
  const instituteId = row.institute_id;
  switch (row.audience_scope) {
    case "all":
      return listInstituteUserIdsByRoles(admin, instituteId, STAFF_NOTIFY_ROLES);
    case "students": {
      const studentRes = await admin
        .from("student")
        .select("id, user_profile_id")
        .eq("institute_id", instituteId)
        .eq("status", "active")
        .is("deleted_at", null);
      const students = ensureDbOk(studentRes) as Array<{
        id: string;
        user_profile_id: string | null;
      }>;
      const ids = students
        .map((s) => s.user_profile_id)
        .filter((id): id is string => Boolean(id));
      for (const student of students) {
        const parents = await listParentUserIdsForStudent(
          admin,
          student.id,
          instituteId,
        );
        ids.push(...parents);
      }
      return [...new Set(ids)];
    }
    case "parents":
      return listInstituteUserIdsByRoles(admin, instituteId, ["parent"]);
    case "teachers": {
      const teacherRes = await admin
        .from("teacher")
        .select("user_profile_id")
        .eq("institute_id", instituteId)
        .eq("status", "active")
        .is("deleted_at", null);
      const teachers = ensureDbOk(teacherRes) as Array<{
        user_profile_id: string | null;
      }>;
      return [
        ...new Set(
          teachers
            .map((t) => t.user_profile_id)
            .filter((id): id is string => Boolean(id)),
        ),
      ];
    }
    case "classes": {
      if (!row.section_id && !row.class_id) return [];
      let query = admin
        .from("enrollment")
        .select("student_id")
        .eq("institute_id", instituteId)
        .eq("status", "active")
        .is("deleted_at", null);
      if (row.section_id) query = query.eq("section_id", row.section_id);
      if (row.class_id) query = query.eq("class_id", row.class_id);
      const enrollRes = await query;
      const enrollments = ensureDbOk(enrollRes) as Array<{ student_id: string }>;
      const ids: string[] = [];
      for (const enroll of enrollments) {
        const parents = await listParentUserIdsForStudent(
          admin,
          enroll.student_id,
          instituteId,
        );
        ids.push(...parents);
        const studentRes = await admin
          .from("student")
          .select("user_profile_id")
          .eq("id", enroll.student_id)
          .maybeSingle();
        const student = studentRes.data as { user_profile_id: string | null } | null;
        if (student?.user_profile_id) ids.push(student.user_profile_id);
      }
      return [...new Set(ids)];
    }
    default:
      return [];
  }
}

async function emitEventNotification(
  admin: SupabaseClient,
  actorUserId: string,
  input: {
    instituteId: string;
    recipientUserIds: string[];
    title: string;
    body: string;
    dedupeKey: string;
    eventId: string;
    kind: string;
    priority?: "normal" | "important";
  },
): Promise<void> {
  const recipients = [...new Set(input.recipientUserIds)].filter(
    (id) => id !== actorUserId,
  );
  if (recipients.length === 0) return;
  try {
    await emitNotificationForInstituteSystem(admin, actorUserId, {
      instituteId: input.instituteId,
      recipientUserIds: recipients,
      category: "events",
      priority: input.priority ?? "normal",
      title: input.title,
      body: input.body,
      deepLink: `/events?id=${encodeURIComponent(input.eventId)}`,
      dedupeKey: input.dedupeKey,
      payload: { eventId: input.eventId, kind: input.kind },
    });
  } catch {
    /* notification delivery must not block event writes */
  }
}

export async function emitEventPublishedNotifications(
  admin: SupabaseClient,
  actorUserId: string,
  row: EventRow,
): Promise<void> {
  const dto = toEventDto(row);
  const recipients = await listAudienceRecipientUserIds(admin, row);
  const preview =
    dto.title.length > 80 ? `${dto.title.slice(0, 80)}…` : dto.title;
  await emitEventNotification(admin, actorUserId, {
    instituteId: dto.instituteId,
    recipientUserIds: recipients,
    title: "New school event",
    body: `${preview} · ${formatEventWhen(row)}`,
    dedupeKey: `event-published:${dto.id}`,
    eventId: dto.id,
    kind: "published",
  });
}

export async function emitEventCancelledNotifications(
  admin: SupabaseClient,
  actorUserId: string,
  row: EventRow,
): Promise<void> {
  const dto = toEventDto(row);
  const recipients = await listAudienceRecipientUserIds(admin, row);
  const reason = row.cancellation_reason?.trim() || "This event was cancelled.";
  await emitEventNotification(admin, actorUserId, {
    instituteId: dto.instituteId,
    recipientUserIds: recipients,
    title: "Event cancelled",
    body: `${dto.title} — ${reason}`,
    dedupeKey: `event-cancelled:${dto.id}`,
    eventId: dto.id,
    kind: "cancelled",
    priority: "important",
  });
}

export async function emitEventUpdatedNotifications(
  admin: SupabaseClient,
  actorUserId: string,
  row: EventRow,
  changeSummary: string,
): Promise<void> {
  if (!row.published || row.cancelled) return;
  const dto = toEventDto(row);
  const recipients = await listAudienceRecipientUserIds(admin, row);
  await emitEventNotification(admin, actorUserId, {
    instituteId: dto.instituteId,
    recipientUserIds: recipients,
    title: "Event updated",
    body: `${dto.title} — ${changeSummary}`,
    dedupeKey: `event-updated:${dto.id}:${row.updated_at}`,
    eventId: dto.id,
    kind: "updated",
  });
}
