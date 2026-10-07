import { beforeEach, describe, expect, it, vi } from "vitest";

const pingTripLocation = vi.fn();
const markTripBoarding = vi.fn();
const markTripDropping = vi.fn();
const startTransportTrip = vi.fn();
const updateTransportTripPhase = vi.fn();
const endTransportTrip = vi.fn();
const createTransportEmergency = vi.fn();

vi.mock("@/lib/transport-api", () => ({
  pingTripLocation: (...args: unknown[]) => pingTripLocation(...args),
  markTripBoarding: (...args: unknown[]) => markTripBoarding(...args),
  markTripDropping: (...args: unknown[]) => markTripDropping(...args),
  startTransportTrip: (...args: unknown[]) => startTransportTrip(...args),
  updateTransportTripPhase: (...args: unknown[]) => updateTransportTripPhase(...args),
  endTransportTrip: (...args: unknown[]) => endTransportTrip(...args),
  createTransportEmergency: (...args: unknown[]) => createTransportEmergency(...args),
}));

import {
  __resetOpsOutboxForTests,
  coalesceOpsEventsForPersist,
  enqueueOpsEvent,
  flushOpsOutbox,
  getOpsOutboxSnapshot,
  retryFailedOpsEvent,
} from "./ops-outbox";

const TRIP_ID = "11111111-1111-4111-8111-111111111111";
const STUDENT_ID = "22222222-2222-4222-8222-222222222222";
const STOP_ID = "33333333-3333-4333-8333-333333333333";

describe("ops-outbox Phase 8", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => store.clear(),
    });
    vi.stubGlobal("navigator", { onLine: true });
    __resetOpsOutboxForTests({ online: true, events: [] });
    pingTripLocation.mockResolvedValue(undefined);
    markTripBoarding.mockResolvedValue({ id: "be-1" });
  });

  it("returns a stable snapshot reference for useSyncExternalStore", () => {
    const a = getOpsOutboxSnapshot();
    const b = getOpsOutboxSnapshot();
    expect(a).toBe(b);
    enqueueOpsEvent({
      eventType: "gps",
      tripId: TRIP_ID,
      payload: { lat: 1, lng: 2 },
    });
    const c = getOpsOutboxSnapshot();
    expect(c).not.toBe(a);
    expect(getOpsOutboxSnapshot()).toBe(c);
  });

  it("queues offline and replays when online", async () => {
    __resetOpsOutboxForTests({ online: false, events: [] });
    enqueueOpsEvent({
      eventType: "boarding",
      tripId: TRIP_ID,
      studentId: STUDENT_ID,
      stopId: STOP_ID,
      clientEventId: "board-stable-1",
      payload: { boardingStatus: "boarded" },
    });
    expect(getOpsOutboxSnapshot().pendingCount).toBe(1);
    expect(markTripBoarding).not.toHaveBeenCalled();

    __resetOpsOutboxForTests({
      online: true,
      events: getOpsOutboxSnapshot().events,
    });
    // Re-seed after reset wiped — simulate restart with persisted events
    const storeRaw = localStorage.getItem("lumenx.transport.ops-outbox.v2");
    expect(storeRaw).toBeTruthy();

    enqueueOpsEvent({
      eventType: "boarding",
      tripId: TRIP_ID,
      studentId: STUDENT_ID,
      stopId: STOP_ID,
      clientEventId: "board-stable-1",
      payload: { boardingStatus: "boarded" },
    });
    // Force online flush of pending
    __resetOpsOutboxForTests({
      online: true,
      events: [
        {
          clientEventId: "board-stable-1",
          eventType: "boarding",
          tripId: TRIP_ID,
          studentId: STUDENT_ID,
          stopId: STOP_ID,
          capturedAt: new Date().toISOString(),
          sequence: 1,
          payload: { boardingStatus: "boarded" },
          retryCount: 0,
          status: "pending",
          createdAt: new Date().toISOString(),
        },
      ],
    });
    await flushOpsOutbox();
    expect(markTripBoarding).toHaveBeenCalledWith(
      TRIP_ID,
      expect.objectContaining({ clientEventId: "board-stable-1" }),
    );
    expect(getOpsOutboxSnapshot().pendingCount).toBe(0);
  });

  it("keeps stable client_event_id across retry (no duplicate invent)", async () => {
    markTripBoarding
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce({ id: "be-1" });

    enqueueOpsEvent({
      eventType: "boarding",
      tripId: TRIP_ID,
      studentId: STUDENT_ID,
      stopId: STOP_ID,
      clientEventId: "board-dup-1",
      payload: {},
    });
    await flushOpsOutbox();
    expect(getOpsOutboxSnapshot().pendingCount).toBe(1);
    const failedId = getOpsOutboxSnapshot().events[0]?.clientEventId;
    expect(failedId).toBe("board-dup-1");

    retryFailedOpsEvent("board-dup-1");
    await flushOpsOutbox();
    const ids = markTripBoarding.mock.calls.map(
      (c) => (c[1] as { clientEventId: string }).clientEventId,
    );
    expect(ids.every((id) => id === "board-dup-1")).toBe(true);
  });

  it("treats server conflict as reconciled (server wins)", async () => {
    markTripBoarding.mockRejectedValueOnce(
      new Error("client_event_id already used"),
    );
    enqueueOpsEvent({
      eventType: "boarding",
      tripId: TRIP_ID,
      studentId: STUDENT_ID,
      stopId: STOP_ID,
      clientEventId: "board-conflict-1",
      payload: {},
    });
    await flushOpsOutbox();
    expect(getOpsOutboxSnapshot().pendingCount).toBe(0);
    expect(getOpsOutboxSnapshot().lastConflictMessage).toMatch(/server/i);
  });

  it("preserves order: sequence flush GPS then boarding", async () => {
    const order: string[] = [];
    pingTripLocation.mockImplementation(async () => {
      order.push("gps");
    });
    markTripBoarding.mockImplementation(async () => {
      order.push("boarding");
      return { id: "be" };
    });

    enqueueOpsEvent({
      eventType: "gps",
      tripId: TRIP_ID,
      clientEventId: "gps-1",
      payload: { latitude: 1, longitude: 2, accuracyM: 10 },
    });
    enqueueOpsEvent({
      eventType: "boarding",
      tripId: TRIP_ID,
      studentId: STUDENT_ID,
      stopId: STOP_ID,
      clientEventId: "board-1",
      payload: {},
    });
    await flushOpsOutbox();
    expect(order).toEqual(["gps", "boarding"]);
  });

  it("survives app restart via localStorage hydrate", async () => {
    enqueueOpsEvent({
      eventType: "drop",
      tripId: TRIP_ID,
      studentId: STUDENT_ID,
      stopId: STOP_ID,
      clientEventId: "drop-persist-1",
      payload: {},
    });
    const raw = localStorage.getItem("lumenx.transport.ops-outbox.v2");
    expect(raw).toContain("drop-persist-1");

    // Simulate restart
    __resetOpsOutboxForTests({ online: true, events: [] });
    const parsed = JSON.parse(raw!) as { events: unknown[] };
    __resetOpsOutboxForTests({
      online: true,
      events: parsed.events as never[],
    });
    markTripDropping.mockResolvedValue({ id: "de-1" });
    await flushOpsOutbox();
    expect(markTripDropping).toHaveBeenCalledWith(
      TRIP_ID,
      expect.objectContaining({ clientEventId: "drop-persist-1" }),
    );
  });

  it("records last GPS upload time on successful flush", async () => {
    enqueueOpsEvent({
      eventType: "gps",
      tripId: TRIP_ID,
      clientEventId: "gps-up-1",
      capturedAt: new Date().toISOString(),
      payload: { latitude: 12.9, longitude: 77.5, accuracyM: 12 },
    });
    await flushOpsOutbox();
    expect(getOpsOutboxSnapshot().lastGpsUploadedAt).toBeTruthy();
  });

  it("drops poison non-UUID trip path events instead of Sync failed", async () => {
    __resetOpsOutboxForTests({
      online: true,
      events: [
        {
          clientEventId: "gps-poison",
          eventType: "gps",
          tripId: "trip-1770400000000",
          studentId: null,
          stopId: null,
          capturedAt: new Date().toISOString(),
          sequence: 1,
          payload: { latitude: 1, longitude: 2 },
          retryCount: 3,
          status: "failed",
          lastError: "Path parameter validation failed",
          createdAt: new Date().toISOString(),
        },
      ],
    });
    await flushOpsOutbox();
    expect(pingTripLocation).not.toHaveBeenCalled();
    expect(getOpsOutboxSnapshot().pendingCount).toBe(0);
  });

  it("never drops boarding/drop/SOS when GPS volume exceeds 400", () => {
    const now = Date.now();
    const events = [];
    for (let i = 0; i < 500; i++) {
      events.push({
        clientEventId: `gps-${i}`,
        eventType: "gps" as const,
        tripId: TRIP_ID,
        studentId: null,
        stopId: null,
        capturedAt: new Date(now + i * 1000).toISOString(),
        sequence: i + 1,
        payload: { latitude: 12.9, longitude: 77.5 },
        retryCount: 0,
        status: "pending" as const,
        createdAt: new Date().toISOString(),
      });
    }
    events.push({
      clientEventId: "board-keep",
      eventType: "boarding" as const,
      tripId: TRIP_ID,
      studentId: STUDENT_ID,
      stopId: STOP_ID,
      capturedAt: new Date().toISOString(),
      sequence: 600,
      payload: {},
      retryCount: 0,
      status: "pending" as const,
      createdAt: new Date().toISOString(),
    });
    events.push({
      clientEventId: "sos-keep",
      eventType: "emergency" as const,
      tripId: TRIP_ID,
      studentId: null,
      stopId: null,
      capturedAt: new Date().toISOString(),
      sequence: 601,
      payload: {},
      retryCount: 0,
      status: "pending" as const,
      createdAt: new Date().toISOString(),
    });
    events.push({
      clientEventId: "drop-keep",
      eventType: "drop" as const,
      tripId: TRIP_ID,
      studentId: STUDENT_ID,
      stopId: STOP_ID,
      capturedAt: new Date().toISOString(),
      sequence: 602,
      payload: {},
      retryCount: 0,
      status: "pending" as const,
      createdAt: new Date().toISOString(),
    });
    const kept = coalesceOpsEventsForPersist(events);
    expect(kept.some((e) => e.clientEventId === "board-keep")).toBe(true);
    expect(kept.some((e) => e.clientEventId === "sos-keep")).toBe(true);
    expect(kept.some((e) => e.clientEventId === "drop-keep")).toBe(true);
    expect(kept.filter((e) => e.eventType === "gps").length).toBeLessThan(500);
    expect(kept.filter((e) => e.eventType === "gps").length).toBeGreaterThan(0);
    const gpsKept = kept.filter((e) => e.eventType === "gps");
    expect(gpsKept[gpsKept.length - 1]?.clientEventId).toBe("gps-499");
  });
});
