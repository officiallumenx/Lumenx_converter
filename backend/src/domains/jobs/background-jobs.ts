/**
 * Phase 2 Step 7 — scheduled background jobs that used to run only on list/read.
 * - Publish due announcements
 * - Evaluate institute alert rules
 * - Emit diary overdue / end-of-day reminders
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Logger } from "../../logger/logger.js";
import { publishDueScheduledAnnouncementsSystem } from "../announcements/service.js";
import { evaluateAlertRulesSystem } from "../alert-rules/service.js";
import { processDiaryRemindersSystem } from "../diary/reminders.js";

export type BackgroundJobsResult = {
  announcements: { scanned: number; published: number };
  alerts: { institutes: number; newlyFired: number };
  diary: { institutes: number; teachers: number; emitted: number };
};

export async function runBackgroundJobs(
  admin: SupabaseClient,
  options?: { now?: Date; logger?: Logger },
): Promise<BackgroundJobsResult> {
  const now = options?.now ?? new Date();

  const announcements = await publishDueScheduledAnnouncementsSystem(admin, now);
  const alerts = await evaluateAlertRulesSystem(admin);
  const diary = await processDiaryRemindersSystem(admin, now);

  return { announcements, alerts, diary };
}
