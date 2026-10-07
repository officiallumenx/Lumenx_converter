import type { SupabaseClient } from "@supabase/supabase-js";
import type { Messaging } from "firebase-admin/messaging";
import type { Logger } from "../logger/logger.js";
import { processPendingFcmDeliveries } from "../domains/notifications/fcm-worker.js";

export const FCM_WORKER_DEFAULT_INTERVAL_MS = 4_000;
export const FCM_WORKER_DEFAULT_BATCH = 50;

let timer: ReturnType<typeof setInterval> | null = null;
let tickBusy = false;
let startedAt: string | null = null;
let lastIntervalMs: number = FCM_WORKER_DEFAULT_INTERVAL_MS;
let lastBatchSize: number = FCM_WORKER_DEFAULT_BATCH;

export type FcmWorkerRuntimeStatus = {
  workerRunning: boolean;
  startedAt: string | null;
  intervalMs: number;
  batchSize: number;
  tickBusy: boolean;
};

export function getFcmWorkerRuntimeStatus(): FcmWorkerRuntimeStatus {
  return {
    workerRunning: timer != null,
    startedAt,
    intervalMs: lastIntervalMs,
    batchSize: lastBatchSize,
    tickBusy,
  };
}

export function startFcmWorkerLoop(input: {
  admin: SupabaseClient;
  messaging: Messaging;
  logger: Logger;
  intervalMs?: number;
  batchSize?: number;
}): void {
  if (timer) return;

  const intervalMs = input.intervalMs ?? FCM_WORKER_DEFAULT_INTERVAL_MS;
  const batchSize = input.batchSize ?? FCM_WORKER_DEFAULT_BATCH;
  lastIntervalMs = intervalMs;
  lastBatchSize = batchSize;
  startedAt = new Date().toISOString();

  const tick = () => {
    if (tickBusy) return;
    tickBusy = true;
    void processPendingFcmDeliveries(input.admin, input.messaging, input.logger, {
      limit: batchSize,
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
        tickBusy = false;
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
  startedAt = null;
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
    { limit: input.limit ?? FCM_WORKER_DEFAULT_BATCH },
  );
}
