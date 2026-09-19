import { beforeEach, describe, expect, it, vi } from "vitest";

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
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true,
});

describe("trip session (in-memory + API sync)", () => {
  beforeEach(() => {
    memory.clear();
    vi.resetModules();
  });

  it("starts ready and clears legacy trip cache key", async () => {
    localStorage.setItem(
      "lumenx.transport.trip.v1",
      JSON.stringify({
        version: 1,
        phase: "running",
        tripId: "stale",
        startedAt: "2026-08-21T10:00:00.000Z",
        completedAt: null,
        vehicleId: "VH-01",
        routeId: "RT-01",
        currentStopIndex: 1,
        lastSummary: null,
      }),
    );

    const { getTripSessionSnapshot } = await import("./store");
    const { isTripActive } = await import("./lifecycle");
    const session = getTripSessionSnapshot();
    expect(session.phase).toBe("ready");
    expect(session.tripId).toBeNull();
    expect(isTripActive(session.phase)).toBe(false);
    expect(localStorage.getItem("lumenx.transport.trip.v1")).toBeNull();
  });

  it("syncTripFromApiDto applies server state", async () => {
    const { syncTripFromApiDto, getTripSessionSnapshot } = await import("./store");
    const { isTripActive } = await import("./lifecycle");

    syncTripFromApiDto({
      id: "trip-test-1",
      phase: "running",
      startedAt: "2026-08-21T10:00:00.000Z",
      completedAt: null,
      vehicleId: "VH-01",
      routeId: "RT-01",
      currentStopIndex: 1,
    });

    const session = getTripSessionSnapshot();
    expect(session.phase).toBe("running");
    expect(session.tripId).toBe("trip-test-1");
    expect(session.startedAt).toBe("2026-08-21T10:00:00.000Z");
    expect(session.currentStopIndex).toBe(1);
    expect(isTripActive(session.phase)).toBe(true);
  });

  it("rejects ending an already completed trip", async () => {
    const { syncTripFromApiDto, endTripSession, getTripSessionSnapshot } = await import("./store");
    syncTripFromApiDto({
      id: "done",
      phase: "completed",
      startedAt: "2026-08-21T08:00:00.000Z",
      completedAt: "2026-08-21T09:00:00.000Z",
      vehicleId: "VH-01",
      routeId: "RT-01",
      currentStopIndex: 2,
    });

    const result = endTripSession();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/already completed/i);
    }
    expect(getTripSessionSnapshot().phase).toBe("completed");
  });

  it("rejects starting a second trip while running", async () => {
    const { syncTripFromApiDto, startTripSession } = await import("./store");
    syncTripFromApiDto({
      id: "active",
      phase: "running",
      startedAt: "2026-08-21T10:00:00.000Z",
      completedAt: null,
      vehicleId: "VH-01",
      routeId: "RT-01",
      currentStopIndex: 0,
    });

    const result = startTripSession();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/already running/i);
    }
  });

  it("does not restore trip from localStorage after module reload", async () => {
    const { syncTripFromApiDto } = await import("./store");
    syncTripFromApiDto({
      id: "trip-live",
      phase: "boarding",
      startedAt: "2026-08-21T10:00:00.000Z",
      completedAt: null,
      vehicleId: "VH-01",
      routeId: "RT-01",
      currentStopIndex: 0,
    });
    // Simulate old cache write that must not become SoT.
    localStorage.setItem(
      "lumenx.transport.trip.v1",
      JSON.stringify({
        version: 1,
        phase: "boarding",
        tripId: "trip-live",
        startedAt: "2026-08-21T10:00:00.000Z",
        completedAt: null,
        vehicleId: "VH-01",
        routeId: "RT-01",
        currentStopIndex: 0,
        lastSummary: null,
      }),
    );

    vi.resetModules();
    const { getTripSessionSnapshot } = await import("./store");
    expect(getTripSessionSnapshot().phase).toBe("ready");
    expect(localStorage.getItem("lumenx.transport.trip.v1")).toBeNull();
  });
});

describe("trip lifecycle helpers", () => {
  it("labels phases and builds end summary", async () => {
    const { tripPhaseLabel, buildTripEndSummary, isTripActive } = await import("./lifecycle");
    expect(tripPhaseLabel("boarding")).toBe("Boarding");
    expect(isTripActive("running")).toBe(true);
    expect(isTripActive("ready")).toBe(false);
    expect(isTripActive("completed")).toBe(false);

    const summary = buildTripEndSummary(
      [
        {
          id: "1",
          name: "A",
          grade: "1",
          stopName: "S1",
          rollNo: "1",
          boarding: "boarded",
          dropping: "pending",
          boardedAt: "2026-08-21T07:10:00.000Z",
          droppedAt: null,
        },
        {
          id: "2",
          name: "B",
          grade: "1",
          stopName: "S1",
          rollNo: "2",
          boarding: "boarded",
          dropping: "dropped",
          boardedAt: "2026-08-21T07:11:00.000Z",
          droppedAt: "2026-08-21T07:40:00.000Z",
        },
      ],
      1,
      3,
    );
    expect(summary.studentsBoarded).toBe(2);
    expect(summary.studentsDropped).toBe(1);
    expect(summary.studentsRemaining).toBe(1);
    expect(summary.stopsCompleted).toBe(1);
  });
});
