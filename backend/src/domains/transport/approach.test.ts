import { describe, expect, it } from "vitest";
import {
  APPROACH_EVAL_RADIUS_M,
  APPROACH_START_GRACE_MS,
  approachBandForEta,
  approachDestinationModeForTrip,
  approachThresholdToEmit,
  enrollmentApproachStopId,
  isBusWithinStopRadius,
  isWithinApproachStartGrace,
  resolveStopGeofenceM,
} from "./approach.js";
import { shouldPersistGpsSample } from "./gps-persist.js";
import { severityForTransportEvent } from "./transport-notification-severity.js";
import { TRANSPORT_EVENT } from "./transport-events.js";
import { shouldNotifyTripPhaseChange } from "./trip-lifecycle.js";

describe("approach withinRadius radius handling", () => {
  it("keeps ETA bands unchanged", () => {
    expect(approachBandForEta(4)).toBe(5);
    expect(approachBandForEta(10)).toBe(15);
    expect(approachBandForEta(25)).toBe(30);
    expect(approachBandForEta(40)).toBeNull();
  });

  it("emits only the nearest band (no 30+15+5 fan-out on one ping)", () => {
    expect(approachThresholdToEmit(4)).toBe(5);
    expect(approachThresholdToEmit(10)).toBe(15);
    expect(approachThresholdToEmit(25)).toBe(30);
    expect(approachThresholdToEmit(40)).toBeNull();
  });

  it("suppresses approach bands briefly after trip start", () => {
    const started = new Date(Date.now() - 10_000).toISOString();
    expect(isWithinApproachStartGrace(started)).toBe(true);
    const older = new Date(Date.now() - APPROACH_START_GRACE_MS - 1_000).toISOString();
    expect(isWithinApproachStartGrace(older)).toBe(false);
  });

  it("maps approach severity without making every alert red", () => {
    expect(
      severityForTransportEvent(TRANSPORT_EVENT.STOP_APPROACHING, {
        approachThresholdMin: 30,
      }),
    ).toBe("info");
    expect(
      severityForTransportEvent(TRANSPORT_EVENT.STOP_APPROACHING, {
        approachThresholdMin: 5,
      }),
    ).toBe("attention");
    expect(severityForTransportEvent(TRANSPORT_EVENT.TRIP_STARTED)).toBe("info");
    expect(severityForTransportEvent(TRANSPORT_EVENT.TRIP_DELAYED)).toBe(
      "attention",
    );
    expect(
      severityForTransportEvent(TRANSPORT_EVENT.EMERGENCY_CREATED),
    ).toBe("critical");
  });

  it("skips phase-updated notify for automatic starting→running", () => {
    expect(shouldNotifyTripPhaseChange("starting", "running")).toBe(false);
    expect(shouldNotifyTripPhaseChange("running", "boarding")).toBe(true);
    expect(shouldNotifyTripPhaseChange("boarding", "dropping")).toBe(true);
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

describe("pickup vs drop destination stop selection", () => {
  it("uses pickup for morning running/boarding", () => {
    expect(
      approachDestinationModeForTrip({ phase: "running", slot: "morning" }),
    ).toBe("pickup");
    expect(
      approachDestinationModeForTrip({ phase: "boarding", slot: "morning" }),
    ).toBe("pickup");
  });

  it("uses drop for dropping phase and evening trips", () => {
    expect(
      approachDestinationModeForTrip({ phase: "dropping", slot: "morning" }),
    ).toBe("drop");
    expect(
      approachDestinationModeForTrip({ phase: "running", slot: "evening" }),
    ).toBe("drop");
  });

  it("skips students without the relevant stop assignment", () => {
    expect(
      enrollmentApproachStopId(
        { pickup_stop_id: null, drop_stop_id: "d1" },
        "pickup",
      ),
    ).toBeNull();
    expect(
      enrollmentApproachStopId(
        { pickup_stop_id: "p1", drop_stop_id: null },
        "drop",
      ),
    ).toBeNull();
    expect(
      enrollmentApproachStopId(
        { pickup_stop_id: "p1", drop_stop_id: "d1" },
        "drop",
      ),
    ).toBe("d1");
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
        capturedAt: "2026-10-06T10:00:01.000Z",
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
        capturedAt: "2026-10-06T10:00:03.000Z",
      },
    });
    expect(heartbeat.shouldPersist).toBe(true);
    expect(heartbeat.reason).toBe("heartbeat");
  });
});
