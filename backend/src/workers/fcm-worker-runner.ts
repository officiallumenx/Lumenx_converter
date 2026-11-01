import type { SupabaseClient } from "@supabase/supabase-js";
import type { Messaging } from "firebase-admin/messaging";
import type { Logger } from "../logger/logger.js";
import { processPendingFcmDeliveries } from "../domains/notifications/fcm-worker.js";

export const FCM_WORKER_DEFAULT_INTERVAL_MS = 4_000;
export const FCM_WORKER_DEFAULT_BATCH = 50;
/** Cap idle backoff so push latency stays bounded when the queue is empty. */
export const FCM_WORKER_MAX_IDLE_INTERVAL_MS = 30_000;

let timer: ReturnType<typeof setTimeout> | null = null;
let tickBusy = false;
let startedAt: string | null = null;
let lastIntervalMs: number = FCM_WORKER_DEFAULT_INTERVAL_MS;
let lastBatchSize: number = FCM_WORKER_DEFAULT_BATCH;
let currentDelayMs: number = FCM_WORKER_DEFAULT_INTERVAL_MS;
let baseIntervalMs: number = FCM_WORKER_DEFAULT_INTERVAL_MS;
let maxIdleIntervalMs: number = FCM_WORKER_MAX_IDLE_INTERVAL_MS;

export type FcmWorkerRuntimeStatus = {
  workerRunning: boolean;
  startedAt: string | null;
  intervalMs: number;
  batchSize: number;
  tickBusy: boolean;
  currentDelayMs: number;
};

export function getFcmWorkerRuntimeStatus(): FcmWorkerRuntimeStatus {
  return {
    workerRunning: timer != null || tickBusy,
    startedAt,
    intervalMs: lastIntervalMs,
    batchSize: lastBatchSize,
    tickBusy,
    currentDelayMs,
  };
}

/** Exported for unit tests — next delay after a tick. */
export function nextFcmWorkerDelayMs(input: {
  baseIntervalMs: number;
  maxIdleIntervalMs: number;
  previousDelayMs: number;
  pendingFound: number;
}): number {
  if (input.pendingFound > 0) {
    return input.baseIntervalMs;
  }
  const grown = Math.min(
    input.maxIdleIntervalMs,
    Math.max(input.baseIntervalMs, Math.floor(input.previousDelayMs * 1.5)),
  );
  return grown;
}

export function startFcmWorkerLoop(input: {
  admin: SupabaseClient;
  messaging: Messaging;
  logger: Logger;
  intervalMs?: number;
  batchSize?: number;
  maxIdleIntervalMs?: number;
}): void {
  // Already scheduled or in-flight — do not stack loops.
  if (timer || tickBusy) return;

  baseIntervalMs = input.intervalMs ?? FCM_WORKER_DEFAULT_INTERVAL_MS;
  maxIdleIntervalMs = input.maxIdleIntervalMs ?? FCM_WORKER_MAX_IDLE_INTERVAL_MS;
  lastIntervalMs = baseIntervalMs;
  lastBatchSize = input.batchSize ?? FCM_WORKER_DEFAULT_BATCH;
  currentDelayMs = baseIntervalMs;
  startedAt = new Date().toISOString();

  const schedule = (delayMs: number) => {
    currentDelayMs = delayMs;
    timer = setTimeout(() => {
      timer = null;
      void runTick();
    }, delayMs);
  };

  const runTick = async () => {
    if (tickBusy) {
      schedule(baseIntervalMs);
      return;
    }
    tickBusy = true;
    try {
      const result = await processPendingFcmDeliveries(
        input.admin,
        input.messaging,
        input.logger,
        { limit: lastBatchSize },
      );
      if (result.sent > 0 || result.failed > 0) {
        input.logger.info({ msg: "fcm_worker_tick", ...result });
      }
      const next = nextFcmWorkerDelayMs({
        baseIntervalMs,
        maxIdleIntervalMs,
        previousDelayMs: currentDelayMs,
        pendingFound: result.pendingFound,
      });
      schedule(next);
    } catch (err) {
      input.logger.error({
        msg: "fcm_worker_tick_failed",
        error: err instanceof Error ? err.message : String(err),
      });
      schedule(baseIntervalMs);
    } finally {
      tickBusy = false;
    }
  };

  // Immediate first tick, then adaptive schedule.
  void runTick();
}

export function stopFcmWorkerLoop(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  startedAt = null;
  currentDelayMs = FCM_WORKER_DEFAULT_INTERVAL_MS;
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
