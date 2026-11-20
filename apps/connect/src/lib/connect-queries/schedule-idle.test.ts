import { afterEach, describe, expect, it, vi } from "vitest";
import { runPrefetchTiers, scheduleIdle } from "./schedule-idle";

describe("scheduleIdle / runPrefetchTiers", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("runs the idle task via setTimeout fallback when requestIdleCallback is missing", () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", {
      setTimeout,
      clearTimeout,
    });
    const task = vi.fn();
    scheduleIdle(task, 100);
    expect(task).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("cancel prevents the idle task from running", () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", {
      setTimeout,
      clearTimeout,
    });
    const task = vi.fn();
    const cancel = scheduleIdle(task, 100);
    cancel();
    vi.advanceTimersByTime(500);
    expect(task).not.toHaveBeenCalled();
  });

  it("runs critical immediately and deferred on idle; cancel stops remaining deferred", () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", {
      setTimeout,
      clearTimeout,
    });
    const critical = vi.fn();
    const deferredA = vi.fn();
    const deferredB = vi.fn();

    const cancel = runPrefetchTiers({
      critical: [critical],
      deferred: [deferredA, deferredB],
    });

    expect(critical).toHaveBeenCalledTimes(1);
    expect(deferredA).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);
    expect(deferredA).toHaveBeenCalledTimes(1);
    expect(deferredB).not.toHaveBeenCalled();

    cancel();
    vi.advanceTimersByTime(500);
    expect(deferredB).not.toHaveBeenCalled();
  });

  it("does not start duplicate critical work when tiers are re-run after cancel", () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", {
      setTimeout,
      clearTimeout,
    });
    const critical = vi.fn();
    const cancel1 = runPrefetchTiers({ critical: [critical], deferred: [] });
    cancel1();
    runPrefetchTiers({ critical: [critical], deferred: [] });
    expect(critical).toHaveBeenCalledTimes(2);
  });
});
