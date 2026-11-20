import { describe, it, expect } from "vitest";
import {
  FCM_WORKER_DEFAULT_INTERVAL_MS,
  FCM_WORKER_MAX_IDLE_INTERVAL_MS,
  nextFcmWorkerDelayMs,
} from "./fcm-worker-runner.js";

describe("nextFcmWorkerDelayMs", () => {
  it("resets to base interval when pending work was found", () => {
    expect(
      nextFcmWorkerDelayMs({
        baseIntervalMs: FCM_WORKER_DEFAULT_INTERVAL_MS,
        maxIdleIntervalMs: FCM_WORKER_MAX_IDLE_INTERVAL_MS,
        previousDelayMs: 30_000,
        pendingFound: 3,
      }),
    ).toBe(FCM_WORKER_DEFAULT_INTERVAL_MS);
  });

  it("grows delay on empty queue without exceeding the idle cap", () => {
    const step1 = nextFcmWorkerDelayMs({
      baseIntervalMs: 4_000,
      maxIdleIntervalMs: 30_000,
      previousDelayMs: 4_000,
      pendingFound: 0,
    });
    expect(step1).toBe(6_000);

    const step2 = nextFcmWorkerDelayMs({
      baseIntervalMs: 4_000,
      maxIdleIntervalMs: 30_000,
      previousDelayMs: step1,
      pendingFound: 0,
    });
    expect(step2).toBe(9_000);

    let delay = 20_000;
    for (let i = 0; i < 8; i++) {
      delay = nextFcmWorkerDelayMs({
        baseIntervalMs: 4_000,
        maxIdleIntervalMs: 30_000,
        previousDelayMs: delay,
        pendingFound: 0,
      });
    }
    expect(delay).toBe(30_000);
  });
});
