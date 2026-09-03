/**
 * End-of-day / overdue diary reminders.
 * Actor-scoped path runs on diary list; system path runs in the background worker.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  actorHasInstituteRole,
  requireInstituteId,
  requireTeacherIdentity,
} from "../../authorization/index.js";
import { emitNotificationForInstituteSystem } from "../notifications/service.js";
import { listActiveInstitutesForLogin } from "../identity/repository.js";
import { listTeachers, findTeacherById } from "../teachers/repository.js";
import { listDiaryDays } from "./repository.js";
import type { DiaryScope } from "./types.js";

/** Local end-of-day hour (24h) — diary reminder for today fires at or after this time. */
export const DIARY_END_OF_DAY_HOUR = 16;

const SCOPES: DiaryScope[] = ["subject", "activity"];

function diaryDeepLink(scope: DiaryScope): string {
  return scope === "activity" ? "/activity/diary" : "/diary";
}

function scopeLabel(scope: DiaryScope): string {
  return scope === "activity" ? "Activity diary" : "Class diary";
}

function yesterdayIso(now = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function todayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function isSubmittedForDate(
  days: Array<{ diary_date: string; scope: string; submitted_at: string | null }>,
  scope: DiaryScope,
  date: string,
): boolean {
  return days.some(
    (d) => d.diary_date === date && d.scope === scope && d.submitted_at != null,
  );
}

async function emitDiaryReminder(input: {
  admin: SupabaseClient;
  actorUserId: string;
  instituteId: string;
  recipientUserId: string;
  scope: DiaryScope;
  diaryDate: string;
  overdue: boolean;
}): Promise<boolean> {
  const label = scopeLabel(input.scope);
  const formatted = input.diaryDate;
  const title = input.overdue ? `${label} overdue` : `${label} due today`;
  const body = input.overdue
    ? `Your ${label.toLowerCase()} for ${formatted} was not submitted. Complete and submit it now.`
    : `End of day: submit your ${label.toLowerCase()} for ${formatted} to the principal.`;

  try {
    await emitNotificationForInstituteSystem(input.admin, input.actorUserId, {
      instituteId: input.instituteId,
      recipientUserIds: [input.recipientUserId],
      category: "leave",
      priority: input.overdue ? "important" : "normal",
      title,
      body,
      deepLink: diaryDeepLink(input.scope),
      dedupeKey: `diary-reminder:${input.recipientUserId}:${input.scope}:${input.diaryDate}`,
      payload: {
        diaryDate: input.diaryDate,
        scope: input.scope,
        overdue: input.overdue,
      },
    });
    return true;
  } catch (err) {
    if (err instanceof AppError && err.status === 400) return false;
    throw err;
  }
}

/** Core reminder logic for one teacher (used by actor path + worker). */
export async function processDiaryRemindersForTeacher(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    teacherId: string;
    recipientUserId: string;
    actorUserId: string;
    now?: Date;
  },
): Promise<{ emitted: number }> {
  const now = input.now ?? new Date();
  const days = await listDiaryDays(admin, {
    instituteId: input.instituteId,
    teacherId: input.teacherId,
    dateFrom: yesterdayIso(now),
    dateTo: todayIso(now),
  });

  const hour = now.getHours();
  const today = todayIso(now);
  const yesterday = yesterdayIso(now);
  let emitted = 0;

  for (const scope of SCOPES) {
    if (!isSubmittedForDate(days, scope, yesterday)) {
      const ok = await emitDiaryReminder({
        admin,
        actorUserId: input.actorUserId,
        instituteId: input.instituteId,
        recipientUserId: input.recipientUserId,
        scope,
        diaryDate: yesterday,
        overdue: true,
      });
      if (ok) emitted += 1;
    }

    if (
      hour >= DIARY_END_OF_DAY_HOUR &&
      !isSubmittedForDate(days, scope, today)
    ) {
      const ok = await emitDiaryReminder({
        admin,
        actorUserId: input.actorUserId,
        instituteId: input.instituteId,
        recipientUserId: input.recipientUserId,
        scope,
        diaryDate: today,
        overdue: false,
      });
      if (ok) emitted += 1;
    }
  }

  return { emitted };
}

/**
 * End-of-day diary reminders for the authenticated teacher.
 * - Yesterday not submitted → overdue reminder (any time).
 * - Today not submitted → reminder at/after DIARY_END_OF_DAY_HOUR.
 */
export async function processDiaryRemindersForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdInput: string,
  now = new Date(),
): Promise<void> {
  const instituteId = requireInstituteId(actor, instituteIdInput);
  if (!actorHasInstituteRole(actor, instituteId, "teacher")) return;

  const identity = requireTeacherIdentity(actor, instituteId);
  const teacher = await findTeacherById(admin, identity.teacherId);
  if (!teacher?.user_profile_id) return;

  await processDiaryRemindersForTeacher(admin, {
    instituteId,
    teacherId: identity.teacherId,
    recipientUserId: teacher.user_profile_id,
    actorUserId: actor.userId,
    now,
  });
}

/**
 * Background worker: scan active institutes / teachers and emit due diary reminders.
 */
export async function processDiaryRemindersSystem(
  admin: SupabaseClient,
  now: Date = new Date(),
): Promise<{ institutes: number; teachers: number; emitted: number }> {
  const institutes = await listActiveInstitutesForLogin(admin);
  let teachersScanned = 0;
  let emitted = 0;

  for (const institute of institutes) {
    const teachers = await listTeachers(admin, {
      instituteId: institute.id,
      status: "active",
    });
    for (const teacher of teachers) {
      if (!teacher.user_profile_id) continue;
      teachersScanned += 1;
      const result = await processDiaryRemindersForTeacher(admin, {
        instituteId: institute.id,
        teacherId: teacher.id,
        recipientUserId: teacher.user_profile_id,
        actorUserId: teacher.user_profile_id,
        now,
      });
      emitted += result.emitted;
    }
  }

  return {
    institutes: institutes.length,
    teachers: teachersScanned,
    emitted,
  };
}
