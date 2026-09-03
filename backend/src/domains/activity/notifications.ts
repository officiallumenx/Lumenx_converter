import type { SupabaseClient } from "@supabase/supabase-js";
import { emitNotificationForInstituteSystem } from "../notifications/service.js";
import { listLinksForStudentIds } from "../parents/repository.js";
import { findStudentById } from "../students/repository.js";
import { listMemberships } from "./repository.js";
import type { AchievementDto, PracticeSessionDto } from "./types.js";

async function resolveTeamRecipientUserIds(
  admin: SupabaseClient,
  instituteId: string,
  activityTeamId: string,
): Promise<string[]> {
  const memberships = await listMemberships(admin, instituteId, activityTeamId);
  const studentIds = [
    ...new Set(
      memberships.filter((m) => m.status === "active").map((m) => m.student_id),
    ),
  ];
  if (studentIds.length === 0) return [];

  const studentResult = await admin
    .from("student")
    .select("id, user_profile_id")
    .eq("institute_id", instituteId)
    .in("id", studentIds)
    .is("deleted_at", null);
  const students = (studentResult.data ?? []) as Array<{
    user_profile_id: string | null;
  }>;

  const profileIds = new Set<string>();
  for (const s of students) {
    if (s.user_profile_id) profileIds.add(s.user_profile_id);
  }

  const links = await listLinksForStudentIds(admin, studentIds, instituteId);
  const parentIds = [...new Set(links.map((l) => l.parent_id))];
  if (parentIds.length > 0) {
    const parentResult = await admin
      .from("parent")
      .select("user_profile_id")
      .eq("institute_id", instituteId)
      .in("id", parentIds)
      .is("deleted_at", null);
    for (const p of (parentResult.data ?? []) as Array<{
      user_profile_id: string | null;
    }>) {
      if (p.user_profile_id) profileIds.add(p.user_profile_id);
    }
  }

  return [...profileIds];
}

async function resolveGuardianUserIds(
  admin: SupabaseClient,
  instituteId: string,
  studentId: string,
): Promise<string[]> {
  const links = await listLinksForStudentIds(admin, [studentId], instituteId);
  const parentIds = [...new Set(links.map((l) => l.parent_id))];
  if (parentIds.length === 0) return [];
  const result = await admin
    .from("parent")
    .select("user_profile_id")
    .eq("institute_id", instituteId)
    .in("id", parentIds)
    .is("deleted_at", null);
  const rows = (result.data ?? []) as Array<{ user_profile_id: string | null }>;
  return [
    ...new Set(
      rows
        .map((r) => r.user_profile_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
}

/** Fan-out practice schedule to team students + guardians. */
export async function emitPracticeScheduledNotifications(
  admin: SupabaseClient,
  createdByUserId: string,
  practice: PracticeSessionDto,
): Promise<void> {
  const recipients = await resolveTeamRecipientUserIds(
    admin,
    practice.instituteId,
    practice.teamId,
  );
  if (recipients.length === 0) return;

  const when = practice.startTime
    ? `${practice.scheduledOn} ${practice.startTime}`
    : practice.scheduledOn;

  try {
    await emitNotificationForInstituteSystem(admin, createdByUserId, {
      instituteId: practice.instituteId,
      category: "events",
      priority: "normal",
      title: `Practice: ${practice.title}`,
      body: `Scheduled for ${when}${practice.location ? ` · ${practice.location}` : ""}.`,
      deepLink: "/activity",
      dedupeKey: `activity:practice:${practice.id}`,
      recipientUserIds: recipients,
      payload: {
        practiceSessionId: practice.id,
        teamId: practice.teamId,
        kind: "practice_scheduled",
      },
    });
  } catch {
    // Non-fatal — practice create already succeeded
  }
}

/** Fan-out achievement award to student guardians (and student portal if linked). */
export async function emitAchievementAwardedNotifications(
  admin: SupabaseClient,
  createdByUserId: string,
  achievement: AchievementDto,
): Promise<void> {
  const student = await findStudentById(admin, achievement.studentId);
  const recipients = new Set<string>(
    await resolveGuardianUserIds(
      admin,
      achievement.instituteId,
      achievement.studentId,
    ),
  );
  if (student?.user_profile_id) recipients.add(student.user_profile_id);
  if (recipients.size === 0) return;

  try {
    await emitNotificationForInstituteSystem(admin, createdByUserId, {
      instituteId: achievement.instituteId,
      category: "events",
      priority: "important",
      title: `Achievement: ${achievement.title}`,
      body: `${student?.display_name ?? "Student"} earned ${achievement.title}.`,
      deepLink: "/activity",
      dedupeKey: `activity:achievement:${achievement.id}`,
      recipientUserIds: [...recipients],
      payload: {
        achievementId: achievement.id,
        studentId: achievement.studentId,
        kind: "achievement_awarded",
      },
    });
  } catch {
    // Non-fatal
  }
}
