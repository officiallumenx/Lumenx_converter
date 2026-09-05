import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const memory = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, value);
  },
  removeItem: (key: string) => {
    memory.delete(key);
  },
  clear: () => memory.clear(),
  key: () => null,
  get length() {
    return memory.size;
  },
});

vi.stubGlobal("window", {
  dispatchEvent: () => true,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
});

import { seedTransportOps } from "@lumenx/utils";
import { transportStore } from "./transport-store";

describe("transportStore journey", () => {
  beforeEach(() => {
    memory.clear();
    vi.useFakeTimers();
    seedTransportOps();
    transportStore.reset();
  });

  afterEach(() => {
    transportStore.destroy();
    transportStore.reset();
    vi.useRealTimers();
  });

  it("moves awaiting_pickup -> picked_up -> reached_school without skipping pickup", () => {
    transportStore.init("C1", "parent");
    expect(transportStore.getTracking().learnerStatus).toBe("awaiting_pickup");
    expect(transportStore.getAssignment().bus.driverName).toBe("Rajesh Kumar");
    expect(transportStore.getAssignment().bus.busNumber).toBe("BUS-01");
    expect(transportStore.getAssignment().pickupStop.name).toContain("North Campus");

    // Soft-sim ticks until pickup (ETA countdown); do not assume a fixed starting ETA.
    let pickupTicks = 0;
    while (
      transportStore.getTracking().learnerStatus !== "picked_up" &&
      pickupTicks < 40
    ) {
      vi.advanceTimersByTime(6000);
      pickupTicks += 1;
    }

    const afterPickup = transportStore.getTracking();
    expect(afterPickup.learnerStatus).toBe("picked_up");
    expect(afterPickup.progressPercent).toBeLessThan(100);

    // After pickup, progress advances toward school.
    let ticks = 0;
    while (
      transportStore.getTracking().learnerStatus !== "reached_school" &&
      ticks < 40
    ) {
      vi.advanceTimersByTime(6000);
      ticks += 1;
    }

    const done = transportStore.getTracking();
    expect(done.learnerStatus).toBe("reached_school");
    expect(done.runStatus).toBe("completed");
    expect(done.progressPercent).toBe(100);
  });

  it("resets learner runtime when switching children", () => {
    transportStore.init("C1", "parent");
    let pickupTicks = 0;
    while (
      transportStore.getTracking().learnerStatus !== "picked_up" &&
      pickupTicks < 40
    ) {
      vi.advanceTimersByTime(6000);
      pickupTicks += 1;
    }
    expect(transportStore.getTracking().learnerStatus).toBe("picked_up");

    transportStore.selectLearner("C2");
    expect(transportStore.getTracking().learnerStatus).toBe("awaiting_pickup");
    expect(transportStore.getTracking().etaMinutes).toBeGreaterThan(0);
    expect(transportStore.getAssignment().bus.busNumber).toBe("BUS-02");
  });
});
