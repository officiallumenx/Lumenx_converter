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
      slot: "morning",
    });

    const result = startTripSession();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/already running/i);
    }
  });

  it("pickup complete → drop ready; dismiss keeps morning completed", async () => {
    const {
      syncTripFromApiDto,
      endTripSession,
      dismissCompletedTripSession,
      applyTodayTripCompletions,
      setRouteHydrated,
      getTripSessionSnapshot,
    } = await import("./store");

    setRouteHydrated(true);
    syncTripFromApiDto({
      id: "pickup-1",
      phase: "running",
      startedAt: "2026-08-21T07:00:00.000Z",
      completedAt: null,
      vehicleId: "VH-01",
      routeId: "RT-01",
      currentStopIndex: 0,
      slot: "morning",
    });
    expect(getTripSessionSnapshot().homeAction).toBe("continue_pickup");

    const ended = endTripSession({
      studentsBoarded: 2,
      studentsDropped: 0,
      studentsRemaining: 2,
      stopsCompleted: 1,
      stopsTotal: 2,
    });
    expect(ended.ok).toBe(true);
    expect(getTripSessionSnapshot().morningCompletedToday).toBe(true);
    expect(getTripSessionSnapshot().homeAction).toBe("start_drop");

    expect(dismissCompletedTripSession().ok).toBe(true);
    expect(getTripSessionSnapshot().phase).toBe("ready");
    expect(getTripSessionSnapshot().morningCompletedToday).toBe(true);
    expect(getTripSessionSnapshot().homeAction).toBe("start_drop");

    applyTodayTripCompletions({
      morningCompleted: true,
      eveningCompleted: false,
    });
    expect(getTripSessionSnapshot().homeAction).toBe("start_drop");

    // Authoritative empty list must not invent Drop, but can clear stale flags.
    applyTodayTripCompletions({
      morningCompleted: false,
      eveningCompleted: false,
      authoritative: true,
    });
    expect(getTripSessionSnapshot().morningCompletedToday).toBe(false);
    expect(getTripSessionSnapshot().homeAction).not.toBe("start_drop");
  });

  it("authoritative morning-only completions drive Start Drop after refresh", async () => {
    const {
      applyTodayTripCompletions,
      setRouteHydrated,
      beginStartTripSession,
      getTripSessionSnapshot,
    } = await import("./store");

    setRouteHydrated(true);
    applyTodayTripCompletions({
      morningCompleted: true,
      eveningCompleted: false,
      authoritative: true,
    });
    expect(getTripSessionSnapshot().homeAction).toBe("start_drop");
    const blockedPickup = beginStartTripSession("morning");
    expect(blockedPickup.ok).toBe(false);
    expect(blockedPickup.reason).toMatch(/Pickup is already completed/i);
  });

  it("offline end marks pending sync without completing the day", async () => {
    const {
      syncTripFromApiDto,
      markTripEndSyncPending,
      beginStartTripSession,
      getTripSessionSnapshot,
      clearTripEndSyncPending,
    } = await import("./store");

    syncTripFromApiDto({
      id: "live-1",
      phase: "running",
      startedAt: "2026-08-21T07:00:00.000Z",
      completedAt: null,
      vehicleId: "VH-01",
      routeId: "RT-01",
      currentStopIndex: 0,
      slot: "morning",
    });
    const pending = markTripEndSyncPending();
    expect(pending.ok).toBe(true);
    expect(getTripSessionSnapshot().endSyncPending).toBe(true);
    expect(getTripSessionSnapshot().phase).toBe("running");
    expect(getTripSessionSnapshot().morningCompletedToday).toBe(false);

    const blocked = beginStartTripSession("evening");
    expect(blocked.ok).toBe(false);
    expect(blocked.reason).toMatch(/syncing/i);

    clearTripEndSyncPending();
    syncTripFromApiDto({
      id: "live-1",
      phase: "completed",
      startedAt: "2026-08-21T07:00:00.000Z",
      completedAt: "2026-08-21T08:00:00.000Z",
      vehicleId: "VH-01",
      routeId: "RT-01",
      currentStopIndex: 0,
      slot: "morning",
    });
    expect(getTripSessionSnapshot().endSyncPending).toBe(false);
    expect(getTripSessionSnapshot().morningCompletedToday).toBe(true);
  });

  it("blocks Drop start when Pickup is not completed today", async () => {
    const {
      resetTripSession,
      beginStartTripSession,
      syncTripFromApiDto,
      dismissCompletedTripSession,
      getTripSessionSnapshot,
    } = await import("./store");

    resetTripSession();
    const blockedReady = beginStartTripSession("evening");
    expect(blockedReady.ok).toBe(false);
    expect(blockedReady.reason).toMatch(/Pickup/i);

    // Completed chrome with evening slot sets eveningCompletedToday, not morning —
    // Drop must still require Pickup (or already-completed Drop message).
    syncTripFromApiDto({
      id: "orphan-completed",
      phase: "completed",
      startedAt: "2026-08-21T07:00:00.000Z",
      completedAt: "2026-08-21T08:00:00.000Z",
      vehicleId: "VH-01",
      routeId: "RT-01",
      currentStopIndex: 0,
      slot: "evening",
    });
    dismissCompletedTripSession();
    const blockedAfterChrome = beginStartTripSession("evening");
    expect(blockedAfterChrome.ok).toBe(false);
    expect(blockedAfterChrome.reason).toMatch(/Pickup|Drop trip is already completed/i);
    expect(getTripSessionSnapshot().morningCompletedToday).toBe(false);
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
