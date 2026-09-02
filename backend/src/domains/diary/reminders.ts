import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  actorHasInstituteRole,
  requireInstituteId,
  requireTeacherIdentity,
} from "../../authorization/index.js";
import { emitNotificationForInstituteSystem } from "../notifications/service.js";
import { findTeacherById } from "../teachers/repository.js";
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
}): Promise<void> {
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
  } catch (err) {
    if (err instanceof AppError && err.status === 400) return;
    throw err;
  }
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

  const days = await listDiaryDays(admin, {
    instituteId,
    teacherId: identity.teacherId,
    dateFrom: yesterdayIso(now),
    dateTo: todayIso(now),
  });

  const recipientUserId = teacher.user_profile_id;
  const hour = now.getHours();
  const today = todayIso(now);
  const yesterday = yesterdayIso(now);

  for (const scope of SCOPES) {
    if (!isSubmittedForDate(days, scope, yesterday)) {
      await emitDiaryReminder({
        admin,
        actorUserId: actor.userId,
        instituteId,
        recipientUserId,
        scope,
        diaryDate: yesterday,
        overdue: true,
      });
    }

    if (hour >= DIARY_END_OF_DAY_HOUR && !isSubmittedForDate(days, scope, today)) {
      await emitDiaryReminder({
        admin,
        actorUserId: actor.userId,
        instituteId,
        recipientUserId,
        scope,
        diaryDate: today,
        overdue: false,
      });
    }
  }
}
