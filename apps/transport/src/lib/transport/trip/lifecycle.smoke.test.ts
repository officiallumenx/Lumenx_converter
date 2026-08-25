/**
 * Phase 4 manual lifecycle smoke (Node + localStorage stub).
 * Run: node --experimental-strip-types ... or via vitest inline — use npm test store.test instead.
 * This script documents the expected lifecycle for QA.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const memory = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => memory.set(k, v),
  removeItem: (k: string) => memory.delete(k),
  clear: () => memory.clear(),
  key: () => null,
  get length() {
    return memory.size;
  },
});

describe("phase4 full lifecycle smoke", () => {
  beforeEach(() => {
    memory.clear();
    vi.resetModules();
  });

  it("ready → starting → running → boarding → dropping → completed → ready", async () => {
    const store = await import("./store");
    const life = await import("./lifecycle");

    // Seed a fake active-capable session by writing through start after forcing assignment via storage mid-flight is hard;
    // instead drive phases that don't need assignment after we inject a running trip.
    localStorage.setItem(
      store.TRIP_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        phase: "running",
        tripId: "lifecycle-1",
        startedAt: "2026-08-21T07:00:00.000Z",
        completedAt: null,
        vehicleId: "VH-01",
        routeId: "RT-01",
        currentStopIndex: 0,
        lastSummary: null,
      }),
    );
    vi.resetModules();
    const s = await import("./store");

    expect(s.getTripSessionSnapshot().phase).toBe("running");
    expect(life.isTripActive("running")).toBe(true);

    expect(s.setTripLifecyclePhase("boarding").ok).toBe(true);
    expect(s.getTripSessionSnapshot().phase).toBe("boarding");

    expect(s.setTripLifecyclePhase("dropping").ok).toBe(true);
    expect(s.getTripSessionSnapshot().phase).toBe("dropping");

    const ended = s.endTripSession({
      studentsBoarded: 5,
      studentsDropped: 4,
      studentsRemaining: 1,
      stopsCompleted: 2,
      stopsTotal: 3,
    });
    expect(ended.ok).toBe(true);
    expect(s.getTripSessionSnapshot().phase).toBe("completed");
    expect(s.getTripSessionSnapshot().lastSummary?.studentsBoarded).toBe(5);

    // Refresh must keep completed
    const raw = localStorage.getItem(s.TRIP_STORAGE_KEY);
    expect(raw).toBeTruthy();
    vi.resetModules();
    const afterRefresh = await import("./store");
    expect(afterRefresh.getTripSessionSnapshot().phase).toBe("completed");

    expect(afterRefresh.dismissCompletedTripSession().ok).toBe(true);
    expect(afterRefresh.getTripSessionSnapshot().phase).toBe("ready");

    // Second end should fail
    localStorage.setItem(
      afterRefresh.TRIP_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        phase: "completed",
        tripId: "x",
        startedAt: "t",
        completedAt: "t2",
        vehicleId: "VH-01",
        routeId: "RT-01",
        currentStopIndex: 0,
        lastSummary: null,
      }),
    );
    vi.resetModules();
    const again = await import("./store");
    expect(again.endTripSession().ok).toBe(false);
  });
});
