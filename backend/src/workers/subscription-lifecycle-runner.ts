import type { SupabaseClient } from "@supabase/supabase-js";
import type { Logger } from "../logger/logger.js";
import { syncSubscriptionLifecycles } from "../domains/subscriptions/lifecycle-sync.js";

/** Default: hourly commercial lifecycle sync. */
const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

export function startSubscriptionLifecycleLoop(input: {
  admin: SupabaseClient;
  logger: Logger;
  intervalMs?: number;
}): void {
  if (timer) return;

  const intervalMs = input.intervalMs ?? DEFAULT_INTERVAL_MS;
  if (intervalMs <= 0) {
    input.logger.info({
      msg: "subscription_lifecycle_worker_disabled",
      reason: "interval_ms_lte_0",
    });
    return;
  }

  const tick = () => {
    if (running) return;
    running = true;
    void syncSubscriptionLifecycles(input.admin, { logger: input.logger })
      .then((result) => {
        if (result.updated > 0 || result.renewalsMarkedOverdue > 0) {
          input.logger.info({
            msg: "subscription_lifecycle_tick",
            scanned: result.scanned,
            updated: result.updated,
            renewalsMarkedOverdue: result.renewalsMarkedOverdue,
            transitions: result.transitions.map(
              (t) => `${t.instituteId}:${t.from}->${t.to}`,
            ),
          });
        }
      })
      .catch((err) => {
        input.logger.error({
          msg: "subscription_lifecycle_tick_failed",
          error: err instanceof Error ? err.message : String(err),
        });
      })
      .finally(() => {
        running = false;
      });
  };

  timer = setInterval(tick, intervalMs);
  tick();
}

export function stopSubscriptionLifecycleLoop(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

/** One-shot flush — tests and Nexus ops. */
export async function flushSubscriptionLifecycles(input: {
  admin: SupabaseClient;
  logger?: Logger;
  now?: Date;
}) {
  return syncSubscriptionLifecycles(input.admin, {
    logger: input.logger,
    now: input.now,
  });
}
