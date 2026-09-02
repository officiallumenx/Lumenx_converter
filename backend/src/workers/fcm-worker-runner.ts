import type { SupabaseClient } from "@supabase/supabase-js";
import type { Messaging } from "firebase-admin/messaging";
import type { Logger } from "../logger/logger.js";
import { processPendingFcmDeliveries } from "../domains/notifications/fcm-worker.js";

const DEFAULT_INTERVAL_MS = 4_000;

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

export function startFcmWorkerLoop(input: {
  admin: SupabaseClient;
  messaging: Messaging;
  logger: Logger;
  intervalMs?: number;
}): void {
  if (timer) return;

  const intervalMs = input.intervalMs ?? DEFAULT_INTERVAL_MS;
  const tick = () => {
    if (running) return;
    running = true;
    void processPendingFcmDeliveries(input.admin, input.messaging, input.logger, {
      limit: 50,
    })
      .then((result) => {
        if (result.sent > 0 || result.failed > 0) {
          input.logger.info({ msg: "fcm_worker_tick", ...result });
        }
      })
      .catch((err) => {
        input.logger.error({
          msg: "fcm_worker_tick_failed",
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

export function stopFcmWorkerLoop(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

/** One-shot flush — useful in tests and manual ops. */
export async function flushPendingFcmDeliveries(input: {
  admin: SupabaseClient;
  messaging: Messaging | null;
  logger: Logger;
  limit?: number;
}) {
  return processPendingFcmDeliveries(
    input.admin,
    input.messaging,
    input.logger,
    { limit: input.limit ?? 50 },
  );
}
