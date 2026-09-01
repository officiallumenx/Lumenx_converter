import type { SupabaseClient } from "@supabase/supabase-js";
import { emitNotificationForInstituteSystem } from "../notifications/service.js";
import { findParentById, listLinksForStudent } from "../parents/repository.js";
import { findStudentById } from "../students/repository.js";
import { findTeacherById } from "../teachers/repository.js";
import type { HomeworkRow } from "./types.js";

async function loadTeacherLabel(
  admin: SupabaseClient,
  teacherId: string,
): Promise<string> {
  const teacher = await findTeacherById(admin, teacherId);
  return teacher?.display_name?.trim() || "Teacher";
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

async function emitHomeworkNotification(
  admin: SupabaseClient,
  actorUserId: string,
  input: {
    instituteId: string;
    recipientUserIds: string[];
    title: string;
    body: string;
    dedupeKey: string;
    homeworkId: string;
    studentId?: string;
  },
): Promise<void> {
  if (input.recipientUserIds.length === 0) return;
  try {
    await emitNotificationForInstituteSystem(admin, actorUserId, {
      instituteId: input.instituteId,
      recipientUserIds: input.recipientUserIds,
      category: "homework",
      priority: "normal",
      title: input.title,
      body: input.body,
      deepLink: "/assignments",
      dedupeKey: input.dedupeKey,
      payload: {
        kind: "homework_published",
        homeworkId: input.homeworkId,
        studentId: input.studentId,
      },
    });
  } catch {
    /* notification delivery must not block homework writes */
  }
}

export async function emitHomeworkPublishedNotifications(
  admin: SupabaseClient,
  actorUserId: string,
  homework: HomeworkRow,
  studentIds: string[],
): Promise<void> {
  const subjectRes = await admin
    .from("subject")
    .select("name, code")
    .eq("id", homework.subject_id)
    .maybeSingle();
  const subjectRow = subjectRes.data as { name: string | null; code: string | null } | null;
  const subjectName =
    subjectRow?.name?.trim() || subjectRow?.code?.trim() || "Subject";
  const teacherName = await loadTeacherLabel(admin, homework.teacher_id);
  const kindLabel = homework.kind === "assignment" ? "Assignment" : "Homework";
  const title = `${kindLabel} published`;
  const body = `${subjectName} · ${homework.title} · Due ${homework.due_date} · ${teacherName}`;

  for (const studentId of studentIds) {
    const student = await findStudentById(admin, studentId);
    const studentUserId = student?.user_profile_id;
    const parentIds = await listParentUserIdsForStudent(
      admin,
      studentId,
      homework.institute_id,
    );
    const recipients = new Set(parentIds);
    if (studentUserId) recipients.add(studentUserId);

    await emitHomeworkNotification(admin, actorUserId, {
      instituteId: homework.institute_id,
      recipientUserIds: [...recipients],
      title,
      body,
      dedupeKey: `homework-publish:${homework.id}:${studentId}`,
      homeworkId: homework.id,
      studentId,
    });
  }
}
