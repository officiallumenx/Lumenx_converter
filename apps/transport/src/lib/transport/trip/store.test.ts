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

describe("trip lifecycle persistence", () => {
  beforeEach(() => {
    memory.clear();
    vi.resetModules();
  });

  it("persists active trip across module reload (refresh)", async () => {
    const { TRIP_STORAGE_KEY } = await import("./store");
    localStorage.setItem(
      TRIP_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        phase: "running",
        tripId: "trip-test-1",
        startedAt: "2026-08-21T10:00:00.000Z",
        completedAt: null,
        vehicleId: "VH-01",
        routeId: "RT-01",
        currentStopIndex: 1,
        lastSummary: null,
      }),
    );

    vi.resetModules();
    const { getTripSessionSnapshot } = await import("./store");
    const { isTripActive } = await import("./lifecycle");
    const session = getTripSessionSnapshot();
    expect(session.phase).toBe("running");
    expect(session.tripId).toBe("trip-test-1");
    expect(session.startedAt).toBe("2026-08-21T10:00:00.000Z");
    expect(session.currentStopIndex).toBe(1);
    expect(isTripActive(session.phase)).toBe(true);
  });

  it("maps legacy in_progress to running", async () => {
    const { TRIP_STORAGE_KEY } = await import("./store");
    localStorage.setItem(
      TRIP_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        phase: "in_progress",
        tripId: "legacy",
        startedAt: "2026-08-21T09:00:00.000Z",
        completedAt: null,
        vehicleId: "VH-01",
        routeId: "RT-01",
        currentStopIndex: 0,
        lastSummary: null,
      }),
    );
    vi.resetModules();
    const { getTripSessionSnapshot } = await import("./store");
    expect(getTripSessionSnapshot().phase).toBe("running");
  });

  it("rejects ending an already completed trip", async () => {
    const { TRIP_STORAGE_KEY } = await import("./store");
    localStorage.setItem(
      TRIP_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        phase: "completed",
        tripId: "done",
        startedAt: "2026-08-21T08:00:00.000Z",
        completedAt: "2026-08-21T09:00:00.000Z",
        vehicleId: "VH-01",
        routeId: "RT-01",
        currentStopIndex: 2,
        lastSummary: {
          studentsBoarded: 3,
          studentsDropped: 3,
          studentsRemaining: 0,
          stopsCompleted: 3,
          stopsTotal: 3,
        },
      }),
    );
    vi.resetModules();
    const { endTripSession, getTripSessionSnapshot } = await import("./store");
    const result = endTripSession();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/already completed/i);
    }
    expect(getTripSessionSnapshot().phase).toBe("completed");
  });

  it("rejects starting a second trip while running", async () => {
    const { TRIP_STORAGE_KEY } = await import("./store");
    localStorage.setItem(
      TRIP_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        phase: "running",
        tripId: "active",
        startedAt: "2026-08-21T10:00:00.000Z",
        completedAt: null,
        vehicleId: "VH-01",
        routeId: "RT-01",
        currentStopIndex: 0,
        lastSummary: null,
      }),
    );
    vi.resetModules();
    const { startTripSession } = await import("./store");
    const result = startTripSession();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/already running/i);
    }
  });

  it("reverts incomplete STARTING to ready after refresh", async () => {
    const { TRIP_STORAGE_KEY } = await import("./store");
    localStorage.setItem(
      TRIP_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        phase: "starting",
        tripId: null,
        startedAt: null,
        completedAt: null,
        vehicleId: "VH-01",
        routeId: "RT-01",
        currentStopIndex: 0,
        lastSummary: null,
      }),
    );
    vi.resetModules();
    const { getTripSessionSnapshot } = await import("./store");
    const { isTripActive } = await import("./lifecycle");
    const session = getTripSessionSnapshot();
    expect(session.phase).toBe("ready");
    expect(session.tripId).toBeNull();
    expect(isTripActive(session.phase)).toBe(false);
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
