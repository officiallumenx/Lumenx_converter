import { describe, expect, it } from "vitest";
import {
  APPROACH_EVAL_RADIUS_M,
  approachBandForEta,
  isBusWithinStopRadius,
  resolveStopGeofenceM,
} from "./approach.js";
import { shouldPersistGpsSample } from "./gps-persist.js";

describe("approach withinRadius radius handling", () => {
  it("keeps ETA bands unchanged", () => {
    expect(approachBandForEta(4)).toBe(5);
    expect(approachBandForEta(10)).toBe(15);
    expect(approachBandForEta(25)).toBe(30);
    expect(approachBandForEta(40)).toBeNull();
  });

  it("defines a finite spatial eval radius for scale", () => {
    expect(APPROACH_EVAL_RADIUS_M).toBeGreaterThan(10_000);
    expect(APPROACH_EVAL_RADIUS_M).toBeLessThan(50_000);
  });
});

describe("notification radius geofence (no 50m floor)", () => {
  it("uses stored radius below the old 50m floor", () => {
    expect(resolveStopGeofenceM(30)).toBe(30);
    expect(isBusWithinStopRadius(30, 30)).toBe(true);
    expect(isBusWithinStopRadius(31, 30)).toBe(false);
  });

  it("falls back to 150 when missing/invalid", () => {
    expect(resolveStopGeofenceM(null)).toBe(150);
    expect(resolveStopGeofenceM(0)).toBe(150);
    expect(resolveStopGeofenceM(-10)).toBe(150);
    expect(resolveStopGeofenceM("x")).toBe(150);
  });

  it("treats bus inside default 150m as arrived geofence", () => {
    expect(isBusWithinStopRadius(149, null)).toBe(true);
    expect(isBusWithinStopRadius(150, null)).toBe(true);
    expect(isBusWithinStopRadius(151, null)).toBe(false);
  });
});

describe("gps persist thinning (phase10)", () => {
  it("persists first sample and movement; thins near-stationary heartbeats", () => {
    const first = shouldPersistGpsSample({
      previous: null,
      next: {
        latitude: 12.97,
        longitude: 77.59,
        capturedAt: "2026-10-06T10:00:00.000Z",
      },
    });
    expect(first.shouldPersist).toBe(true);
    expect(first.reason).toBe("first");

    const moved = shouldPersistGpsSample({
      previous: {
        latitude: 12.97,
        longitude: 77.59,
        capturedAt: "2026-10-06T10:00:00.000Z",
      },
      next: {
        latitude: 12.9705,
        longitude: 77.59,
        capturedAt: "2026-10-06T10:00:15.000Z",
      },
    });
    expect(moved.shouldPersist).toBe(true);
    expect(moved.reason).toBe("moved");

    const thinned = shouldPersistGpsSample({
      previous: {
        latitude: 12.97,
        longitude: 77.59,
        capturedAt: "2026-10-06T10:00:00.000Z",
      },
      next: {
        latitude: 12.97001,
        longitude: 77.59,
        capturedAt: "2026-10-06T10:00:15.000Z",
      },
    });
    expect(thinned.shouldPersist).toBe(false);
    expect(thinned.reason).toBe("thinned");

    const heartbeat = shouldPersistGpsSample({
      previous: {
        latitude: 12.97,
        longitude: 77.59,
        capturedAt: "2026-10-06T10:00:00.000Z",
      },
      next: {
        latitude: 12.97001,
        longitude: 77.59,
        capturedAt: "2026-10-06T10:01:05.000Z",
      },
    });
    expect(heartbeat.shouldPersist).toBe(true);
    expect(heartbeat.reason).toBe("heartbeat");
  });
});
