/**
 * Phase 4 lifecycle smoke — in-memory session driven by API sync helper.
 * Refresh restore is via active-trip API (hydrateActiveTripFromApi), not localStorage.
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

vi.stubGlobal("window", {
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true,
});

describe("phase4 full lifecycle smoke", () => {
  beforeEach(() => {
    memory.clear();
    vi.resetModules();
  });

  it("ready → running → boarding → dropping → completed → ready", async () => {
    const s = await import("./store");
    const life = await import("./lifecycle");

    s.syncTripFromApiDto({
      id: "lifecycle-1",
      phase: "running",
      startedAt: "2026-08-21T07:00:00.000Z",
      completedAt: null,
      vehicleId: "VH-01",
      routeId: "RT-01",
      currentStopIndex: 0,
    });

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

    expect(s.dismissCompletedTripSession().ok).toBe(true);
    expect(s.getTripSessionSnapshot().phase).toBe("ready");

    s.syncTripFromApiDto({
      id: "x",
      phase: "completed",
      startedAt: "t",
      completedAt: "t2",
      vehicleId: "VH-01",
      routeId: "RT-01",
      currentStopIndex: 0,
    });
    expect(s.endTripSession().ok).toBe(false);
  });
});
