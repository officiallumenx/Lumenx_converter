import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import { emitNotificationForInstituteSystem } from "../notifications/service.js";
import { findParentById, listLinksForStudent } from "../parents/repository.js";
import { findStudentById } from "../students/repository.js";
import type { AttendanceMarkRow, AttendanceRegisterRow } from "./types.js";

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

async function loadClassSectionLabels(
  admin: SupabaseClient,
  register: AttendanceRegisterRow,
): Promise<{ classLabel: string; section: string }> {
  const sectionRes = await admin
    .from("section")
    .select("code, name")
    .eq("id", register.section_id)
    .maybeSingle();
  const sectionRow = sectionRes.data as { code: string | null; name: string | null } | null;
  const section =
    sectionRow?.code?.trim() || sectionRow?.name?.trim() || "Section";

  const classRes = await admin
    .from("class")
    .select("code, name, grade_label")
    .eq("id", register.class_id)
    .maybeSingle();
  const classRow = classRes.data as {
    code: string | null;
    name: string | null;
    grade_label: string | null;
  } | null;
  const classLabel =
    classRow?.grade_label?.trim() ||
    classRow?.name?.trim() ||
    classRow?.code?.trim() ||
    "Class";

  return { classLabel, section };
}

async function emitAttendanceAlert(
  admin: SupabaseClient,
  actorUserId: string,
  input: {
    instituteId: string;
    recipientUserIds: string[];
    title: string;
    body: string;
    dedupeKey: string;
    registerId: string;
    studentId: string;
    status: "absent" | "leave";
  },
): Promise<void> {
  if (input.recipientUserIds.length === 0) return;
  try {
    await emitNotificationForInstituteSystem(admin, actorUserId, {
      instituteId: input.instituteId,
      recipientUserIds: input.recipientUserIds,
      category: "attendance",
      priority: "important",
      title: input.title,
      body: input.body,
      deepLink: "/attendance",
      dedupeKey: input.dedupeKey,
      payload: {
        kind: "attendance_register_submitted",
        registerId: input.registerId,
        studentId: input.studentId,
        status: input.status,
      },
    });
  } catch {
    /* notification delivery must not block attendance writes */
  }
}

export async function emitAttendanceRegisterSubmittedNotifications(
  admin: SupabaseClient,
  actorUserId: string,
  register: AttendanceRegisterRow,
  marks: AttendanceMarkRow[],
): Promise<void> {
  const { classLabel, section } = await loadClassSectionLabels(admin, register);
  const date = register.attendance_date;
  const slotLabel = register.slot_label.trim() || "Attendance";
  const isPeriod = register.slot_kind === "period";

  for (const mark of marks) {
    if (mark.status !== "absent" && mark.status !== "leave") continue;

    const student = await findStudentById(admin, mark.student_id);
    const studentName = student?.display_name?.trim() || "Student";
    const parentIds = await listParentUserIdsForStudent(
      admin,
      mark.student_id,
      register.institute_id,
    );
    const recipients = new Set(parentIds);
    if (student?.user_profile_id) recipients.add(student.user_profile_id);

    const statusWord = mark.status === "leave" ? "on leave" : "absent";
    const title = isPeriod
      ? `Period absence · ${studentName}`
      : `Absence recorded · ${studentName}`;
    const body = isPeriod
      ? `${studentName} was marked ${statusWord} for ${slotLabel} on ${date} (${classLabel}-${section}).`
      : `${studentName} was marked ${statusWord} (${slotLabel}) on ${date} for class ${classLabel}-${section}.`;

    await emitAttendanceAlert(admin, actorUserId, {
      instituteId: register.institute_id,
      recipientUserIds: [...recipients],
      title,
      body,
      dedupeKey: `attendance-submit:${register.id}:${mark.student_id}:${mark.status}`,
      registerId: register.id,
      studentId: mark.student_id,
      status: mark.status,
    });
  }
}
