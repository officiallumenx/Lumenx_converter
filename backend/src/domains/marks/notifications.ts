import type { SupabaseClient } from "@supabase/supabase-js";
import { emitNotificationForInstituteSystem } from "../notifications/service.js";
import { findParentById, listLinksForStudent } from "../parents/repository.js";
import { findStudentById } from "../students/repository.js";
import { findExamById } from "../exams/repository.js";
import type { MarkEntryDto, MarkScoreDto } from "./types.js";

function gradeLetter(total: number): string {
  if (total >= 90) return "A+";
  if (total >= 80) return "A";
  if (total >= 70) return "B+";
  if (total >= 60) return "B";
  if (total >= 50) return "C";
  if (total >= 33) return "D";
  return "F";
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

async function emitMarksNotification(
  admin: SupabaseClient,
  actorUserId: string,
  input: {
    instituteId: string;
    recipientUserIds: string[];
    title: string;
    body: string;
    dedupeKey: string;
    kind: string;
    studentId?: string;
    examId?: string;
    entryId?: string;
  },
): Promise<void> {
  if (input.recipientUserIds.length === 0) return;
  try {
    await emitNotificationForInstituteSystem(admin, actorUserId, {
      instituteId: input.instituteId,
      recipientUserIds: input.recipientUserIds,
      category: "exams",
      priority: "important",
      title: input.title,
      body: input.body,
      deepLink: "/marks",
      dedupeKey: input.dedupeKey,
      payload: {
        kind: input.kind,
        studentId: input.studentId,
        examId: input.examId,
        entryId: input.entryId,
      },
    });
  } catch {
    /* notification delivery must not block marks writes */
  }
}

export async function emitMarkEntryPublishedNotifications(
  admin: SupabaseClient,
  actorUserId: string,
  entry: MarkEntryDto,
  scores: MarkScoreDto[],
): Promise<void> {
  const exam = await findExamById(admin, entry.examId);
  const subjectRes = await admin
    .from("subject")
    .select("name, code")
    .eq("id", entry.subjectId)
    .maybeSingle();
  const examName = exam?.name?.trim() || "Exam";
  const subjectRow = subjectRes.data as { name: string | null; code: string | null } | null;
  const subjectName =
    subjectRow?.name?.trim() || subjectRow?.code?.trim() || "Subject";

  for (const score of scores) {
    if (score.marks == null) continue;
    const student = await findStudentById(admin, score.studentId);
    const studentName = student?.display_name?.trim() || "Student";
    const parentIds = await listParentUserIdsForStudent(
      admin,
      score.studentId,
      entry.instituteId,
    );
    const studentUserId = student?.user_profile_id;
    const recipients = new Set(parentIds);
    if (studentUserId) recipients.add(studentUserId);

    const total =
      entry.maxMarks > 0
        ? Math.round((score.marks / entry.maxMarks) * 100)
        : score.marks;
    const grade = gradeLetter(total);

    await emitMarksNotification(admin, actorUserId, {
      instituteId: entry.instituteId,
      recipientUserIds: [...recipients],
      title: "Marks published",
      body: `${examName} · ${subjectName}: ${studentName} scored ${score.marks}/${entry.maxMarks} (${grade})`,
      dedupeKey: `marks-publish:${entry.id}:${score.studentId}`,
      kind: "marks_published",
      studentId: score.studentId,
      examId: entry.examId,
      entryId: entry.id,
    });
  }

  // Flowchart SYSTEM fan-out: teacher also gets a publish notice to view locked marks.
  const teacherRes = await admin
    .from("teacher")
    .select("user_profile_id")
    .eq("id", entry.teacherId)
    .maybeSingle();
  const teacherUserId = (teacherRes.data as { user_profile_id: string | null } | null)
    ?.user_profile_id;
  if (teacherUserId) {
    await emitMarksNotification(admin, actorUserId, {
      instituteId: entry.instituteId,
      recipientUserIds: [teacherUserId],
      title: "Marks published",
      body: `${examName} · ${subjectName}: results published for parents and students.`,
      dedupeKey: `marks-publish-teacher:${entry.id}`,
      kind: "marks_published",
      examId: entry.examId,
      entryId: entry.id,
    });
  }
}

/** Notify teacher when Admin returns or rejects a submitted sheet (flowchart resubmit path). */
export async function emitMarkEntryWorkflowNotifications(
  admin: SupabaseClient,
  actorUserId: string,
  entry: MarkEntryDto,
  action: "returned" | "rejected",
): Promise<void> {
  const teacherRes = await admin
    .from("teacher")
    .select("user_profile_id, display_name")
    .eq("id", entry.teacherId)
    .maybeSingle();
  const teacher = teacherRes.data as {
    user_profile_id: string | null;
    display_name: string | null;
  } | null;
  if (!teacher?.user_profile_id) return;

  const exam = await findExamById(admin, entry.examId);
  const examName = exam?.name?.trim() || "Exam";
  const note = entry.adminNote?.trim();
  const title = action === "returned" ? "Marks returned for edits" : "Marks rejected";
  const body = note
    ? `${examName}: ${note}`
    : `${examName}: Admin ${action === "returned" ? "returned" : "rejected"} your marks — edit and resubmit.`;

  await emitMarksNotification(admin, actorUserId, {
    instituteId: entry.instituteId,
    recipientUserIds: [teacher.user_profile_id],
    title,
    body,
    dedupeKey: `marks-${action}:${entry.id}`,
    kind: action === "returned" ? "marks_returned" : "marks_rejected",
    examId: entry.examId,
    entryId: entry.id,
  });
}
