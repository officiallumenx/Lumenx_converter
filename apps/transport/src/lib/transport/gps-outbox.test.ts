import { beforeEach, describe, expect, it, vi } from "vitest";

const enqueueOpsEvent = vi.fn();
const flushOpsOutbox = vi.fn(async () => undefined);
const getOpsOutboxSnapshot = vi.fn(() => ({
  events: [],
  pendingCount: 0,
  online: true,
  lastError: null,
  lastGpsUploadedAt: null,
  lastConflictMessage: null,
  gpsStaleRejectedCount: 0,
  lastGpsStaleRejectMessage: null,
}));
const subscribeOpsOutbox = vi.fn(() => () => undefined);
const captureCurrentGps = vi.fn();
const getTripSessionSnapshot = vi.fn();
const subscribeTripSession = vi.fn(() => () => undefined);

vi.mock("./ops-outbox", () => ({
  enqueueOpsEvent: (...args: unknown[]) => enqueueOpsEvent(...args),
  flushOpsOutbox: (...args: unknown[]) => flushOpsOutbox(...args),
  getOpsOutboxSnapshot: () => getOpsOutboxSnapshot(),
  subscribeOpsOutbox: (fn: () => void) => subscribeOpsOutbox(fn),
}));

vi.mock("./capture-gps", () => ({
  GpsCaptureError: class GpsCaptureError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
  captureCurrentGps: (...args: unknown[]) => captureCurrentGps(...args),
}));

vi.mock("./trip/store", () => ({
  getTripSessionSnapshot: () => getTripSessionSnapshot(),
  subscribeTripSession: (fn: () => void) => subscribeTripSession(fn),
}));

describe("gps-outbox", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal("document", {
      visibilityState: "visible",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal("window", {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });
    getTripSessionSnapshot.mockReturnValue({
      tripId: "11111111-1111-4111-8111-111111111111",
      phase: "running",
      vehicleId: "22222222-2222-4222-8222-222222222222",
      assignment: {
        driver: { id: "33333333-3333-4333-8333-333333333333" },
        bus: { vehicleId: "22222222-2222-4222-8222-222222222222" },
      },
    });
    captureCurrentGps.mockResolvedValue({
      latitude: 12.9,
      longitude: 77.5,
      accuracyM: 15,
      speedKmh: null,
      capturedAt: new Date().toISOString(),
      source: "device",
    });
  });

  it("returns a stable snapshot reference for useSyncExternalStore", async () => {
    const mod = await import("./gps-outbox");
    const a = mod.getGpsOutboxSnapshot();
    const b = mod.getGpsOutboxSnapshot();
    expect(a).toBe(b);
    expect(a.pendingCount).toBe(0);
  });

  it("queues GPS into ops-outbox with trip context", async () => {
    const mod = await import("./gps-outbox");
    mod.startTripGpsPing();
    await vi.waitFor(() => expect(enqueueOpsEvent).toHaveBeenCalled());
    expect(enqueueOpsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "gps",
        tripId: "11111111-1111-4111-8111-111111111111",
        payload: expect.objectContaining({
          latitude: 12.9,
          longitude: 77.5,
        }),
      }),
    );
    mod.stopTripGpsPing();
  });

  it("does not silently drop poor GPS — surfaces gps_error", async () => {
    captureCurrentGps.mockResolvedValue({
      latitude: 12.9,
      longitude: 77.5,
      accuracyM: 900,
      speedKmh: null,
      capturedAt: new Date().toISOString(),
      source: "device",
    });
    const mod = await import("./gps-outbox");
    mod.startTripGpsPing();
    await vi.waitFor(() => {
      expect(mod.getGpsOutboxSnapshot().connection).toBe("gps_error");
    });
    expect(enqueueOpsEvent).not.toHaveBeenCalled();
    mod.stopTripGpsPing();
  });
});
