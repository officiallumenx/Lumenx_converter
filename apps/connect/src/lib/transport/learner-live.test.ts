import { describe, expect, it } from "vitest";

import type { LearnerTransportSummary } from "./api-types";
import {
  mapLearnerSummaryToAssignment,
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
      },
      {
        id: "stop-school",
        name: "School",
        locationLabel: "School · 16.76243, 81.67909",
        routeOrder: 10000,
        kind: "school",
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

  it("uses the child's assigned stops when present", () => {
    const summary = baseSummary({
      pickupStop: {
        id: "stop-tanuku",
        name: "tanuku",
        locationLabel: "16.76252, 81.67936",
        routeOrder: 1,
      },
      dropStop: {
        id: "stop-school",
        name: "School",
        locationLabel: "School",
        routeOrder: 10000,
        kind: "school",
      },
    });
    const timeline = summaryStopsToTimeline(summary);
    expect(timeline.map((s) => s.name)).toEqual(["tanuku", "School"]);
    expect(timeline.map((s) => s.order)).toEqual([1, 2]);
  });
});
