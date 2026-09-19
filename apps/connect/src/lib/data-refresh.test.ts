import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  getDataRefreshGeneration,
  getDataRefreshSnapshot,
  requestDataRefresh,
} from "./data-refresh";

describe("data-refresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("bumps generation without clearing idle after settle", async () => {
    const before = getDataRefreshGeneration();
    const p = requestDataRefresh("manual");
    expect(getDataRefreshSnapshot().phase).toBe("refreshing");
    expect(getDataRefreshGeneration()).toBe(before + 1);
    await vi.runAllTimersAsync();
    await p;
    expect(getDataRefreshSnapshot().phase).toBe("idle");
    expect(getDataRefreshGeneration()).toBe(before + 1);
  });

  it("coalesces concurrent refresh calls into one generation bump", async () => {
    const before = getDataRefreshGeneration();
    const a = requestDataRefresh("manual");
    const b = requestDataRefresh("auto");
    expect(getDataRefreshGeneration()).toBe(before + 1);
    await vi.runAllTimersAsync();
    await Promise.all([a, b]);
    expect(getDataRefreshGeneration()).toBe(before + 1);
    expect(getDataRefreshSnapshot().phase).toBe("idle");
  });
});
