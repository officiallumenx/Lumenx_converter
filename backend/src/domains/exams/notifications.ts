import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import { actorHasInstituteRole } from "../../authorization/index.js";
import { emitNotificationForInstituteSystem } from "../notifications/service.js";
import { listLinksForStudent } from "../parents/repository.js";
import { findParentById } from "../parents/repository.js";
import type { ExamDto, ExamTargetSectionDto } from "./types.js";

const STAFF_NOTIFY_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "teacher",
  "staff",
  "driver",
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

async function listLearnerRecipientUserIds(
  admin: SupabaseClient,
  exam: ExamDto,
  targets: ExamTargetSectionDto[],
): Promise<string[]> {
  const instituteId = exam.instituteId;
  const studentQuery = admin
    .from("student")
    .select("id, user_profile_id")
    .eq("institute_id", instituteId)
    .eq("status", "active")
    .is("deleted_at", null);
  const students = ensureDbOk(await studentQuery) as Array<{
    id: string;
    user_profile_id: string | null;
  }>;

  const enrollmentRes = await admin
    .from("enrollment")
    .select("student_id, section_id, academic_year_id")
    .eq("institute_id", instituteId)
    .eq("academic_year_id", exam.academicYearId)
    .eq("status", "active")
    .is("deleted_at", null);
  const enrollments = ensureDbOk(enrollmentRes) as Array<{
    student_id: string;
    section_id: string;
    academic_year_id: string;
  }>;

  const targetSectionIds = new Set(targets.map((t) => t.sectionId));
  const studentIds = new Set<string>();
  for (const enrollment of enrollments) {
    if (exam.audienceScope === "year") {
      studentIds.add(enrollment.student_id);
      continue;
    }
    if (targetSectionIds.has(enrollment.section_id)) {
      studentIds.add(enrollment.student_id);
    }
  }

  const ids: string[] = [];
  for (const student of students) {
    if (!studentIds.has(student.id)) continue;
    if (student.user_profile_id) ids.push(student.user_profile_id);
    const parents = await listParentUserIdsForStudent(
      admin,
      student.id,
      instituteId,
    );
    ids.push(...parents);
  }
  return [...new Set(ids)];
}

export async function emitExamSchedulePublishedNotifications(
  admin: SupabaseClient,
  actorUserId: string,
  exam: ExamDto,
): Promise<void> {
  const paperCount = exam.subjectSchedules.length;
  const when =
    exam.startDate === exam.endDate
      ? exam.startDate
      : `${exam.startDate} – ${exam.endDate}`;
  const body = `${paperCount} paper${paperCount === 1 ? "" : "s"} · ${when}`;

  const learnerIds = await listLearnerRecipientUserIds(
    admin,
    exam,
    exam.targetSections,
  );
  const staffIds = await listInstituteUserIdsByRoles(
    admin,
    exam.instituteId,
    STAFF_NOTIFY_ROLES,
  );
  const recipientUserIds = [...new Set([...learnerIds, ...staffIds])];
  if (recipientUserIds.length === 0) return;

  try {
    await emitNotificationForInstituteSystem(admin, actorUserId, {
      instituteId: exam.instituteId,
      recipientUserIds,
      category: "exams",
      priority: "important",
      title: `Exam schedule published: ${exam.name}`,
      body,
      deepLink: "/exams",
      dedupeKey: `exam-published:${exam.id}`,
      payload: {
        kind: "exam_schedule_published",
        examId: exam.id,
      },
    });
  } catch {
    /* notification delivery must not block exam writes */
  }
}

export function isInstituteDriver(actor: { memberships: Array<{ instituteId: string; roles: string[] }> }, instituteId: string): boolean {
  return actorHasInstituteRole(actor as Parameters<typeof actorHasInstituteRole>[0], instituteId, "driver");
}
