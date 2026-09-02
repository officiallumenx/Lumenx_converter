import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import { emitNotificationForInstituteSystem } from "../notifications/service.js";
import { listLinksForStudent } from "../parents/repository.js";
import { findParentById } from "../parents/repository.js";

const STAFF_NOTIFY_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "teacher",
  "staff",
] as const;

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

async function listSectionLearnerRecipientUserIds(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    sectionId: string;
    academicYearId: string;
  },
): Promise<string[]> {
  const enrollmentRes = await admin
    .from("enrollment")
    .select("student_id")
    .eq("institute_id", input.instituteId)
    .eq("academic_year_id", input.academicYearId)
    .eq("section_id", input.sectionId)
    .eq("status", "active")
    .is("deleted_at", null);
  const enrollments = ensureDbOk(enrollmentRes) as Array<{ student_id: string }>;
  if (enrollments.length === 0) return [];

  const studentIds = enrollments.map((e) => e.student_id);
  const studentRes = await admin
    .from("student")
    .select("id, user_profile_id")
    .eq("institute_id", input.instituteId)
    .eq("status", "active")
    .is("deleted_at", null)
    .in("id", studentIds);
  const students = ensureDbOk(studentRes) as Array<{
    id: string;
    user_profile_id: string | null;
  }>;

  const ids: string[] = [];
  for (const student of students) {
    if (student.user_profile_id) ids.push(student.user_profile_id);
    const parents = await listParentUserIdsForStudent(
      admin,
      student.id,
      input.instituteId,
    );
    ids.push(...parents);
  }
  return [...new Set(ids)];
}

async function listSectionTeacherUserIds(
  admin: SupabaseClient,
  input: { instituteId: string; sectionId: string },
): Promise<string[]> {
  const assignmentRes = await admin
    .from("teacher_assignment")
    .select("teacher_id")
    .eq("institute_id", input.instituteId)
    .eq("section_id", input.sectionId)
    .eq("status", "active")
    .is("deleted_at", null);
  const assignments = ensureDbOk(assignmentRes) as Array<{ teacher_id: string }>;
  if (assignments.length === 0) return [];

  const teacherIds = [...new Set(assignments.map((a) => a.teacher_id))];
  const teacherRes = await admin
    .from("teacher")
    .select("user_profile_id")
    .eq("institute_id", input.instituteId)
    .in("id", teacherIds)
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

export async function emitTimetableSectionPublishedNotifications(
  admin: SupabaseClient,
  actorUserId: string,
  input: {
    instituteId: string;
    sectionId: string;
    academicYearId: string;
    classLabel: string;
    sectionLabel: string;
    activatedCount: number;
  },
): Promise<void> {
  const classAudience = `${input.classLabel} · Sec ${input.sectionLabel}`;
  const body = `${input.activatedCount} period${input.activatedCount === 1 ? "" : "s"} now live`;

  const learnerIds = await listSectionLearnerRecipientUserIds(admin, {
    instituteId: input.instituteId,
    sectionId: input.sectionId,
    academicYearId: input.academicYearId,
  });
  const staffIds = await listInstituteUserIdsByRoles(
    admin,
    input.instituteId,
    STAFF_NOTIFY_ROLES,
  );
  const teacherIds = await listSectionTeacherUserIds(admin, {
    instituteId: input.instituteId,
    sectionId: input.sectionId,
  });
  const recipientUserIds = [
    ...new Set([...learnerIds, ...staffIds, ...teacherIds]),
  ];
  if (recipientUserIds.length === 0) return;

  try {
    await emitNotificationForInstituteSystem(admin, actorUserId, {
      instituteId: input.instituteId,
      recipientUserIds,
      category: "timetable",
      priority: "important",
      title: `Timetable published: ${classAudience}`,
      body,
      deepLink: "/timetable",
      dedupeKey: `timetable-published:${input.sectionId}`,
      payload: {
        kind: "timetable_section_published",
        sectionId: input.sectionId,
      },
    });
  } catch {
    /* notification delivery must not block timetable writes */
  }
}
