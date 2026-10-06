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
      tripId: "trip-1",
      phase: "running",
      vehicleId: "veh-1",
      assignment: { driver: { id: "drv-1" }, bus: { vehicleId: "veh-1" } },
    });
    captureCurrentGps.mockResolvedValue({
      latitude: 12.9,
      longitude: 77.5,
      accuracyM: 15,
      capturedAt: new Date().toISOString(),
      source: "device",
    });
  });

  it("queues GPS into ops-outbox with trip context", async () => {
    const mod = await import("./gps-outbox");
    mod.startTripGpsPing();
    await vi.waitFor(() => expect(enqueueOpsEvent).toHaveBeenCalled());
    expect(enqueueOpsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "gps",
        tripId: "trip-1",
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
