import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SETUP_VERIFIED_FRESH_MS,
  scheduleDeferredSetupRefresh,
  shouldDeferSetupChecklistNetwork,
  verifiedCompletePlaceholderState,
} from "./defer";
import type { SetupChecklistState } from "./types";

function ready(complete: boolean): SetupChecklistState {
  return {
    status: "ready",
    errorMessage: null,
    counts: null,
    steps: [],
    coreDone: complete ? 7 : 2,
    coreTotal: 7,
    extendedDone: 0,
    extendedTotal: 0,
    coreComplete: complete,
  };
}

describe("shouldDeferSetupChecklistNetwork", () => {
  it("defers when in-memory cache is ready and core-complete", () => {
    expect(
      shouldDeferSetupChecklistNetwork({
        force: false,
        cached: ready(true),
        verifiedFresh: false,
      }),
    ).toBe(true);
  });

  it("defers when verified snapshot is fresh even without memory cache", () => {
    expect(
      shouldDeferSetupChecklistNetwork({
        force: false,
        cached: null,
        verifiedFresh: true,
      }),
    ).toBe(true);
  });

  it("does not defer when setup is incomplete in cache", () => {
    expect(
      shouldDeferSetupChecklistNetwork({
        force: false,
        cached: ready(false),
        verifiedFresh: false,
      }),
    ).toBe(false);
  });

  it("does not defer when verified snapshot is stale/missing and cache empty", () => {
    expect(
      shouldDeferSetupChecklistNetwork({
        force: false,
        cached: null,
        verifiedFresh: false,
      }),
    ).toBe(false);
  });

  it("never defers forced recounts", () => {
    expect(
      shouldDeferSetupChecklistNetwork({
        force: true,
        cached: ready(true),
        verifiedFresh: true,
      }),
    ).toBe(false);
  });
});

describe("scheduleDeferredSetupRefresh", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("runs via requestIdleCallback and cancel prevents duplicate run", () => {
    const callbacks: Array<() => void> = [];
    const cancelIdleCallback = vi.fn();
    vi.stubGlobal("requestIdleCallback", (cb: () => void) => {
      callbacks.push(cb);
      return 7;
    });
    vi.stubGlobal("cancelIdleCallback", cancelIdleCallback);

    const run = vi.fn();
    const cancel = scheduleDeferredSetupRefresh(run, { timeoutMs: 100 });
    expect(run).not.toHaveBeenCalled();
    expect(callbacks).toHaveLength(1);

    cancel();
    callbacks[0]?.();
    expect(run).not.toHaveBeenCalled();
    expect(cancelIdleCallback).toHaveBeenCalledWith(7);
  });

  it("falls back to setTimeout when requestIdleCallback is unavailable", () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestIdleCallback", undefined);
    const run = vi.fn();
    const cancel = scheduleDeferredSetupRefresh(run, { timeoutMs: 50 });
    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    expect(run).toHaveBeenCalledTimes(1);
    cancel();
  });

  it("cancel before timeout prevents the deferred refresh", () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestIdleCallback", undefined);
    const run = vi.fn();
    const cancel = scheduleDeferredSetupRefresh(run, { timeoutMs: 50 });
    cancel();
    vi.advanceTimersByTime(50);
    expect(run).not.toHaveBeenCalled();
  });
});

describe("verifiedCompletePlaceholderState", () => {
  it("is ready+coreComplete without inventing counts", () => {
    const state = verifiedCompletePlaceholderState();
    expect(state.status).toBe("ready");
    expect(state.coreComplete).toBe(true);
    expect(state.counts).toBeNull();
    expect(state.steps).toEqual([]);
  });
});

describe("SETUP_VERIFIED_FRESH_MS", () => {
  it("matches the intended soft freshness window", () => {
    expect(SETUP_VERIFIED_FRESH_MS).toBe(5 * 60_000);
  });
});
