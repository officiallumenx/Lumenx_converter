import type { SupabaseClient } from "@supabase/supabase-js";
import type { Logger } from "../logger/logger.js";
import { runBackgroundJobs } from "../domains/jobs/background-jobs.js";

/** Default: every 60s — announcements can be time-sensitive. */
const DEFAULT_INTERVAL_MS = 60_000;

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

export function startBackgroundJobsLoop(input: {
  admin: SupabaseClient;
  logger: Logger;
  intervalMs?: number;
}): void {
  if (timer) return;

  const intervalMs = input.intervalMs ?? DEFAULT_INTERVAL_MS;
  if (intervalMs <= 0) {
    input.logger.info({
      msg: "background_jobs_worker_disabled",
      reason: "interval_ms_lte_0",
    });
    return;
  }

  const tick = () => {
    if (running) return;
    running = true;
    void runBackgroundJobs(input.admin, { logger: input.logger })
      .then((result) => {
        const meaningful =
          result.announcements.published > 0 ||
          result.alerts.newlyFired > 0 ||
          result.diary.emitted > 0;
        if (meaningful) {
          input.logger.info({
            msg: "background_jobs_tick",
            announcementsPublished: result.announcements.published,
            alertsNewlyFired: result.alerts.newlyFired,
            diaryEmitted: result.diary.emitted,
          });
        }
      })
      .catch((err) => {
        const details =
          err instanceof Error && "details" in err
            ? (err as { details?: { dbCode?: string; dbMessage?: string } })
                .details
            : undefined;
        input.logger.error({
          msg: "background_jobs_tick_failed",
          error: err instanceof Error ? err.message : String(err),
          dbCode: details?.dbCode,
          dbMessage: details?.dbMessage,
        });
      })
      .finally(() => {
        running = false;
      });
  };

  timer = setInterval(tick, intervalMs);
  tick();
}

export function stopBackgroundJobsLoop(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

/** One-shot flush — tests and ops. */
export async function flushBackgroundJobs(input: {
  admin: SupabaseClient;
  logger?: Logger;
  now?: Date;
}) {
  return runBackgroundJobs(input.admin, {
    logger: input.logger,
    now: input.now,
  });
}
