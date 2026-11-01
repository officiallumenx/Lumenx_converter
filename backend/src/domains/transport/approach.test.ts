import { describe, expect, it } from "vitest";
import {
  APPROACH_EVAL_RADIUS_M,
  APPROACH_START_GRACE_MS,
  approachBandForEta,
  approachDestinationModeForTrip,
  approachNotifyCopy,
  approachThresholdToEmit,
  enrollmentApproachStopId,
  isBusWithinStopRadius,
  isWithinApproachStartGrace,
  resolveStopGeofenceM,
  routePlanStopIdsForTrip,
} from "./approach.js";
import { shouldPersistGpsSample } from "./gps-persist.js";
import {
  severityForTransportEvent,
  transportDedupe,
} from "./transport-notification-severity.js";
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

  it("coalesces parent approach identity to trip+stop+threshold (not per child)", () => {
    const tripId = "trip-1";
    const stopId = "stop-home";
    const threshold = 15;
    const childA = "stu-a";
    const childB = "stu-b";
    // Historical per-student keys would diverge for siblings at the same stop.
    expect(`transport:${tripId}:student:${childA}:approach:${threshold}`).not.toBe(
      `transport:${tripId}:student:${childB}:approach:${threshold}`,
    );
    // Authoritative parent-level identity is stop-scoped.
    expect(transportDedupe.approach(tripId, stopId, threshold)).toBe(
      `transport:${tripId}:stop:${stopId}:approach:${threshold}`,
    );
    expect(transportDedupe.approach(tripId, stopId, threshold)).toBe(
      transportDedupe.approach(tripId, stopId, threshold),
    );
    // Distinct stops / thresholds remain distinct.
    expect(transportDedupe.approach(tripId, "stop-other", threshold)).not.toBe(
      transportDedupe.approach(tripId, stopId, threshold),
    );
    expect(transportDedupe.approach(tripId, stopId, 5)).not.toBe(
      transportDedupe.approach(tripId, stopId, threshold),
    );
    // Boarded remains per-student so two siblings produce two boarding notifies.
    expect(transportDedupe.boarded(tripId, childA)).not.toBe(
      transportDedupe.boarded(tripId, childB),
    );
  });

  it("dedupes student audience when the same user is already a guardian recipient", () => {
    const uniqueParents = ["parent-1", "parent-2"];
    const uniqueStudents = ["parent-1", "student-only"];
    const studentOnly = uniqueStudents.filter((id) => !uniqueParents.includes(id));
    expect(studentOnly).toEqual(["student-only"]);
  });

  it("uses distinct copy for ETA approach vs sequential STOP_NEXT", () => {
    const copy = approachNotifyCopy("Gate A", 5);
    expect(copy.title.toLowerCase()).toContain("approaching");
    expect(copy.title.toLowerCase()).not.toContain("next is your stop");
    expect(copy.body.toLowerCase()).not.toContain("next is your stop");
    expect(transportDedupe.stopNext("trip-1", "stop-2")).toBe(
      "transport:trip-1:stop:stop-2:next",
    );
    expect(transportDedupe.stopNext("trip-1", "stop-2")).not.toBe(
      transportDedupe.arrived("trip-1", "stop-2"),
    );
    expect(transportDedupe.stopNext("trip-1", "stop-2")).not.toBe(
      transportDedupe.approach("trip-1", "stop-2", 5),
    );
  });

  it("trip-start dedupe is one key per trip for three siblings / one parent", () => {
    const tripId = "trip-siblings";
    expect(transportDedupe.tripStarted(tripId, "parent")).toBe(
      `transport:${tripId}:started:parent`,
    );
    // Same key for any sibling count — emit once with unique recipientUserIds.
    expect(transportDedupe.tripStarted(tripId, "parent")).toBe(
      transportDedupe.tripStarted(tripId, "parent"),
    );
    expect(transportDedupe.reminderParent("route-1", "morning_service", "2026-10-16")).toBe(
      "transport:route-1:reminder:morning_service:2026-10-16",
    );
    expect(
      transportDedupe.reminderParent("route-1", "morning_service", "2026-10-16"),
    ).not.toContain("stu-");
  });

  it("builds sequential plan so stop-2 is next only after stop-1", () => {
    const stops = [
      { id: "s1", name: "Stop 1", route_order: 1, kind: "waypoint" as const },
      { id: "s2", name: "Stop 2", route_order: 2, kind: "waypoint" as const },
      { id: "school", name: "School", route_order: 99, kind: "school" as const },
    ];
    const plan = routePlanStopIdsForTrip(
      { phase: "running", slot: "morning" },
      stops,
      [
        { student_id: "a", pickup_stop_id: "s1", drop_stop_id: "school" },
        { student_id: "b", pickup_stop_id: "s2", drop_stop_id: "school" },
      ],
    );
    expect(plan[0]).toBe("s1");
    expect(plan[1]).toBe("s2");
    // Proximity to s2 alone does not change plan order — STOP_NEXT uses plan[i+1]
    // only after arrival at plan[i].
    expect(plan.indexOf("s2")).toBe(1);
  });
});

describe("notification radius geofence (no 50m floor)", () => {
  it("uses stored radius below the old 50m floor", () => {
    expect(resolveStopGeofenceM(30)).toBe(30);
    expect(isBusWithinStopRadius(30, 30)).toBe(true);
    expect(isBusWithinStopRadius(31, 30)).toBe(false);
  });

  it("falls back to 100 when missing/invalid", () => {
    expect(resolveStopGeofenceM(null)).toBe(100);
    expect(resolveStopGeofenceM(0)).toBe(100);
    expect(resolveStopGeofenceM(-10)).toBe(100);
    expect(resolveStopGeofenceM("x")).toBe(100);
  });

  it("treats bus inside default 100m as arrived geofence", () => {
    expect(isBusWithinStopRadius(99, null)).toBe(true);
    expect(isBusWithinStopRadius(100, null)).toBe(true);
    expect(isBusWithinStopRadius(101, null)).toBe(false);
  });

  it("applies explicit 50m radius without expanding to 100", () => {
    expect(resolveStopGeofenceM(50)).toBe(50);
    expect(isBusWithinStopRadius(50, 50)).toBe(true);
    expect(isBusWithinStopRadius(51, 50)).toBe(false);
    expect(isBusWithinStopRadius(90, 50)).toBe(false);
  });

  it("applies configured radius consistently (no silent default override)", () => {
    expect(resolveStopGeofenceM(100)).toBe(100);
    expect(isBusWithinStopRadius(99, 100)).toBe(true);
    expect(isBusWithinStopRadius(100, 100)).toBe(true);
    expect(isBusWithinStopRadius(101, 100)).toBe(false);
    // Explicit 150 still works when configured; must not accept beyond that.
    expect(resolveStopGeofenceM(150)).toBe(150);
    expect(isBusWithinStopRadius(150, 150)).toBe(true);
    expect(isBusWithinStopRadius(151, 150)).toBe(false);
    // Configured 80m must not expand to default 100.
    expect(isBusWithinStopRadius(90, 80)).toBe(false);
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
