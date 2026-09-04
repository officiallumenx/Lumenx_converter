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

async function runIsolated<T>(
  name: string,
  fn: () => Promise<T>,
  fallback: T,
  logger?: Logger,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const details =
      err instanceof Error && "details" in err
        ? (err as { details?: { dbCode?: string; dbMessage?: string } }).details
        : undefined;
    logger?.error({
      msg: "background_jobs_job_failed",
      job: name,
      error: err instanceof Error ? err.message : String(err),
      dbCode: details?.dbCode,
      dbMessage: details?.dbMessage,
    });
    return fallback;
  }
}

export async function runBackgroundJobs(
  admin: SupabaseClient,
  options?: { now?: Date; logger?: Logger },
): Promise<BackgroundJobsResult> {
  const now = options?.now ?? new Date();
  const logger = options?.logger;

  const announcements = await runIsolated(
    "announcements",
    () => publishDueScheduledAnnouncementsSystem(admin, now),
    { scanned: 0, published: 0 },
    logger,
  );
  const alerts = await runIsolated(
    "alerts",
    () => evaluateAlertRulesSystem(admin),
    { institutes: 0, newlyFired: 0 },
    logger,
  );
  const diary = await runIsolated(
    "diary",
    () => processDiaryRemindersSystem(admin, now),
    { institutes: 0, teachers: 0, emitted: 0 },
    logger,
  );

  return { announcements, alerts, diary };
}
