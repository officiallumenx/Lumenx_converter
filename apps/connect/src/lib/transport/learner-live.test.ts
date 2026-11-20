import { describe, expect, it } from "vitest";

import type { LearnerTransportLiveDto, LearnerTransportSummary } from "./api-types";
import {
  buildLiveTrackingFromApi,
  mapLearnerSummaryToAssignment,
  reconcileLearnerLiveDto,
  summaryStopsToTimeline,
} from "./learner-live";

function baseSummary(
  overrides: Partial<LearnerTransportSummary> = {},
): LearnerTransportSummary {
  return {
    studentId: "stu-1",
    studentName: "loki vella",
    enrollmentId: "enr-1",
    enrollmentStatus: "active",
    approvalStatus: "approved",
    routeId: "route-1",
    routeName: "bus-01 route",
    busNumber: "bus-01",
    vehicleId: "veh-1",
    vehicleRegistration: "KA-O1-LX-2367",
    driverName: "srinu",
    driverPhone: "9000000000",
    pickupStop: null,
    dropStop: null,
    stops: [
      {
        id: "stop-tanuku",
        name: "tanuku",
        locationLabel: "16.76252, 81.67936",
        routeOrder: 10001,
        kind: "waypoint",
        latitude: 16.76252,
        longitude: 81.67936,
      },
      {
        id: "stop-school",
        name: "School",
        locationLabel: "School · 16.76243, 81.67909",
        routeOrder: 10000,
        kind: "school",
        latitude: 16.76243,
        longitude: 81.67909,
      },
    ],
    vehicleCapacity: 40,
    ...overrides,
  };
}

describe("Connect learner transport mapping (unassigned stops)", () => {
  it("maps null pickup/drop to explicit unassigned labels", () => {
    const assignment = mapLearnerSummaryToAssignment(baseSummary());
    expect(assignment.pickupStop.name).toBe("Stop not assigned");
    expect(assignment.dropStop.name).toBe("Drop stop not assigned");
  });

  it("builds pickup → school journey without dumping unrelated waypoints", () => {
    const timeline = summaryStopsToTimeline(baseSummary());
    expect(timeline.map((s) => s.name)).toEqual(["Stop not assigned", "School"]);
    expect(timeline.map((s) => s.order)).toEqual([1, 2]);
    expect(timeline.some((s) => s.name === "tanuku")).toBe(false);
  });

  it("uses real vehicle capacity when provided", () => {
    const assignment = mapLearnerSummaryToAssignment(baseSummary());
    expect(assignment.bus.capacity).toBe(40);
    expect(assignment.morningPickupTime).toBe("Not scheduled");
  });

  it("reports capacity not configured when vehicleCapacity is null", () => {
    const assignment = mapLearnerSummaryToAssignment(
      baseSummary({ vehicleCapacity: null }),
    );
    expect(assignment.bus.capacity).toBeNull();
  });

  it("uses the child's assigned stops when present and attaches coordinates", () => {
    const summary = baseSummary({
      pickupStop: {
        id: "stop-tanuku",
        name: "tanuku",
        locationLabel: "16.76252, 81.67936",
        routeOrder: 1,
        latitude: 16.76252,
        longitude: 81.67936,
      },
      dropStop: {
        id: "stop-school",
        name: "School",
        locationLabel: "School",
        routeOrder: 10000,
        kind: "school",
        latitude: 16.76243,
        longitude: 81.67909,
      },
    });
    const assignment = mapLearnerSummaryToAssignment(summary);
    expect(assignment.pickupStop.name).toBe("tanuku");
    expect(assignment.pickupStop.latitude).toBe(16.76252);
    expect(assignment.pickupStop.longitude).toBe(81.67936);

    const timeline = summaryStopsToTimeline(summary);
    expect(timeline.map((s) => s.name)).toEqual(["tanuku", "School"]);
    expect(timeline.map((s) => s.order)).toEqual([1, 2]);
    expect(timeline[0].latitude).toBe(16.76252);
    expect(timeline[0].longitude).toBe(81.67936);
  });

  it("mirrors pickup stop for common location when dropStop is null", () => {
    const summary = baseSummary({
      pickupStop: {
        id: "stop-gate",
        name: "Main Gate",
        locationLabel: "Main Gate Landmark",
        routeOrder: 2,
        latitude: 12.9716,
        longitude: 77.5946,
      },
      dropStop: null,
    });
    const assignment = mapLearnerSummaryToAssignment(summary);
    expect(assignment.pickupStop.name).toBe("Main Gate");
    expect(assignment.dropStop.name).toBe("Main Gate");
    expect(assignment.dropStop.latitude).toBe(12.9716);
    expect(assignment.dropStop.longitude).toBe(77.5946);
  });
});

describe("Connect live tracking, bus location & consistency tests", () => {
  const summaryWithStop = baseSummary({
    pickupStop: {
      id: "stop-pickup",
      name: "Residential Gate",
      locationLabel: "Residential Gate Landmark",
      routeOrder: 1,
      latitude: 16.7600,
      longitude: 81.6700,
    },
    dropStop: {
      id: "stop-pickup",
      name: "Residential Gate",
      locationLabel: "Residential Gate Landmark",
      routeOrder: 1,
      latitude: 16.7600,
      longitude: 81.6700,
    },
  });

  const assignment = mapLearnerSummaryToAssignment(summaryWithStop);

  it("requirement 5: stale GPS data is not shown as live", () => {
    const staleTime = new Date(Date.now() - 15 * 60_000).toISOString();
    const liveDto: LearnerTransportLiveDto = {
      activeTrip: {
        id: "trip-1",
        phase: "running",
        startedAt: null,
        completedAt: null,
        currentStopId: null,
        currentStopIndex: 0,
        finalized: false,
      },
      latestLocation: {
        latitude: 16.7625,
        longitude: 81.6793,
        capturedAt: staleTime,
      },
      gpsFreshness: "stale",
      boarding: null,
      openEmergency: null,
      approach: null,
    };

    const tracking = buildLiveTrackingFromApi(summaryWithStop, assignment, liveDto);
    // Stale GPS must not show as live coordinates
    expect(tracking.lat).toBe(0);
    expect(tracking.lng).toBe(0);
    expect(tracking.gpsFreshness).toBe("stale");
  });

  it("requirement 6: no GPS coordinates produces an appropriate unavailable state", () => {
    const liveDto: LearnerTransportLiveDto = {
      activeTrip: {
        id: "trip-1",
        phase: "running",
        startedAt: null,
        completedAt: null,
        currentStopId: null,
        currentStopIndex: 0,
        finalized: false,
      },
      latestLocation: null,
      gpsFreshness: "offline",
      boarding: null,
      openEmergency: null,
      approach: null,
    };

    const tracking = buildLiveTrackingFromApi(summaryWithStop, assignment, liveDto);
    expect(tracking.lat).toBe(0);
    expect(tracking.lng).toBe(0);
    expect(tracking.lastUpdated).toBe("Location unavailable");
  });

  it("requirement 7: previous trip location does not appear as current (completed trip)", () => {
    const liveDto: LearnerTransportLiveDto = {
      activeTrip: {
        id: "trip-completed-yesterday",
        phase: "completed",
        startedAt: null,
        completedAt: null,
        currentStopId: null,
        currentStopIndex: 0,
        finalized: true,
      },
      latestLocation: {
        latitude: 16.7625,
        longitude: 81.6793,
        capturedAt: new Date().toISOString(),
      },
      boarding: null,
      openEmergency: null,
      approach: null,
    };

    const tracking = buildLiveTrackingFromApi(summaryWithStop, assignment, liveDto);
    expect(tracking.sharedTripActive).toBe(false);
    expect(tracking.lat).toBe(0);
    expect(tracking.lng).toBe(0);
    expect(tracking.distanceM).toBeNull();
  });

  it("requirement 8: assigned student stop is not confused with bus location", () => {
    const liveTime = new Date().toISOString();
    const liveDto: LearnerTransportLiveDto = {
      activeTrip: {
        id: "trip-1",
        phase: "running",
        startedAt: null,
        completedAt: null,
        currentStopId: null,
        currentStopIndex: 0,
        finalized: false,
      },
      latestLocation: {
        latitude: 16.7800, // Distinct bus position
        longitude: 81.6900,
        capturedAt: liveTime,
      },
      gpsFreshness: "live",
      boarding: null,
      openEmergency: null,
      approach: null,
    };

    const tracking = buildLiveTrackingFromApi(summaryWithStop, assignment, liveDto);
    // Bus location must be the actual live bus location, not the stop coordinates
    expect(tracking.lat).toBe(16.7800);
    expect(tracking.lng).toBe(81.6900);
    expect(assignment.pickupStop.latitude).toBe(16.7600);
    expect(assignment.pickupStop.longitude).toBe(81.6700);
    expect(tracking.lat).not.toBe(assignment.pickupStop.latitude);
  });

  it("requirement 9: student common-stop consistency remains intact", () => {
    // Both pickupStop and dropStop resolve to the same stop ID and properties
    expect(assignment.pickupStop.id).toBe(assignment.dropStop.id);
    expect(assignment.pickupStop.name).toBe(assignment.dropStop.name);
    expect(assignment.pickupStop.latitude).toBe(assignment.dropStop.latitude);
    expect(assignment.pickupStop.longitude).toBe(assignment.dropStop.longitude);
  });

  it("requirement 10: older GPS responses cannot overwrite newer locations (out-of-order delayed response protection)", () => {
    const newerTime = "2026-11-14T04:35:00Z";
    const olderTime = "2026-11-14T04:34:00Z";

    const currentCacheState: LearnerTransportLiveDto = {
      activeTrip: {
        id: "trip-active-100",
        phase: "running",
        startedAt: null,
        completedAt: null,
        currentStopId: null,
        currentStopIndex: 0,
        finalized: false,
      },
      latestLocation: {
        latitude: 16.7850,
        longitude: 81.6950,
        capturedAt: newerTime,
      },
      gpsFreshness: "live",
      boarding: null,
      openEmergency: null,
      approach: {
        stopId: "stop-pickup",
        etaMinutes: 4,
        distanceM: 1200,
        stopName: "Residential Gate",
        band: 5,
        withinRadius: false,
        displayMode: "eta",
        confidence: "high",
        movementState: "moving",
      },
    };

    const delayedOlderResponse: LearnerTransportLiveDto = {
      activeTrip: {
        id: "trip-active-100",
        phase: "running",
        startedAt: null,
        completedAt: null,
        currentStopId: null,
        currentStopIndex: 0,
        finalized: false,
      },
      latestLocation: {
        latitude: 16.7700, // Older position from delayed network response
        longitude: 81.6800,
        capturedAt: olderTime,
      },
      gpsFreshness: "live",
      boarding: null,
      openEmergency: null,
      approach: {
        stopId: "stop-pickup",
        etaMinutes: 7,
        distanceM: 2200,
        stopName: "Residential Gate",
        band: 15,
        withinRadius: false,
        displayMode: "eta",
        confidence: "high",
        movementState: "moving",
      },
    };

    const reconciled = reconcileLearnerLiveDto(currentCacheState, delayedOlderResponse);
    // Must protect newer location: retain 16.7850, not overwritten by delayed 16.7700
    expect(reconciled?.latestLocation?.latitude).toBe(16.7850);
    expect(reconciled?.latestLocation?.capturedAt).toBe(newerTime);
    expect(reconciled?.approach?.etaMinutes).toBe(4);
  });

  it("requirement 4 & 7: when a new trip starts, previous trip location is replaced", () => {
    const prevTripState: LearnerTransportLiveDto = {
      activeTrip: {
        id: "trip-old",
        phase: "running",
        startedAt: null,
        completedAt: null,
        currentStopId: null,
        currentStopIndex: 0,
        finalized: false,
      },
      latestLocation: {
        latitude: 16.7500,
        longitude: 81.6500,
        capturedAt: "2026-11-14T04:00:00Z",
      },
      gpsFreshness: "live",
      boarding: null,
      openEmergency: null,
      approach: null,
    };

    const newTripState: LearnerTransportLiveDto = {
      activeTrip: {
        id: "trip-new",
        phase: "starting",
        startedAt: null,
        completedAt: null,
        currentStopId: null,
        currentStopIndex: 0,
        finalized: false,
      },
      latestLocation: {
        latitude: 16.8000,
        longitude: 81.7000,
        capturedAt: "2026-11-14T08:00:00Z",
      },
      gpsFreshness: "live",
      boarding: null,
      openEmergency: null,
      approach: null,
    };

    const reconciled = reconcileLearnerLiveDto(prevTripState, newTripState);
    // New trip must use its own coordinates, not retain old trip coordinates
    expect(reconciled?.activeTrip?.id).toBe("trip-new");
    expect(reconciled?.latestLocation?.latitude).toBe(16.8000);
  });

  it("advances currentStopIndex and currentStopName when bus arrives at student stop even if trip.currentStopId is null", () => {
    const summary = baseSummary({
      pickupStop: {
        id: "stop-school",
        name: "School",
        locationLabel: "School",
        routeOrder: 2,
        kind: "school",
        latitude: 16.76243,
        longitude: 81.67909,
      },
    });
    const assignment = mapLearnerSummaryToAssignment(summary);

    const liveDto: LearnerTransportLiveDto = {
      activeTrip: {
        id: "trip-active-1",
        phase: "running",
        startedAt: "2026-11-14T07:00:00Z",
        completedAt: null,
        currentStopId: null, // Lagging or not yet set in database
        currentStopIndex: 0,
        finalized: false,
      },
      latestLocation: {
        latitude: 16.76243,
        longitude: 81.67909,
        capturedAt: "2026-11-14T07:15:00Z",
      },
      gpsFreshness: "live",
      boarding: null,
      openEmergency: null,
      approach: {
        stopId: "stop-school",
        etaMinutes: 0,
        distanceM: 15,
        stopName: "School",
        band: null,
        withinRadius: true,
        displayMode: "arrived",
        confidence: "high",
        movementState: "stopped",
      },
    };

    const tracking = buildLiveTrackingFromApi(summary, assignment, liveDto);
    // stopIndex must resolve to index 1 (stop-school), not remain stuck at 0
    expect(tracking.currentStopIndex).toBe(1);
    expect(tracking.currentStopName).toBe("School");
    expect(tracking.runStatus).toBe("at_stop");
    expect(tracking.parentStatus).toBe("arrived");
  });
});
