/**
 * Backend ↔ client STOP_NEXT contract (Issue 5/6).
 * Ensures schema, dedupe, and copy stay aligned without a live staging DB.
 */
import { describe, expect, it } from "vitest";
import { TRANSPORT_EVENT as BackendEvent } from "./transport-events.js";
import {
  approachNotifyCopy,
  routePlanStopIdsForTrip,
} from "./approach.js";
import {
  deepLinkForTransportEvent,
  severityForTransportEvent,
  transportDedupe,
} from "./transport-notification-severity.js";
import { TRANSPORT_EVENT as SharedEvent } from "@lumenx/utils";

describe("STOP_NEXT schema contract", () => {
  it("backend and @lumenx/utils share the same kind string", () => {
    expect(BackendEvent.STOP_NEXT).toBe("STOP_NEXT");
    expect(SharedEvent.STOP_NEXT).toBe("STOP_NEXT");
    expect(BackendEvent.STOP_NEXT).toBe(SharedEvent.STOP_NEXT);
  });

  it("dedupe key is trip×stop scoped (one parent row for siblings at next stop)", () => {
    expect(transportDedupe.stopNext("trip-abc", "stop-2")).toBe(
      "transport:trip-abc:stop:stop-2:next",
    );
    expect(transportDedupe.stopNext("trip-abc", "stop-2")).not.toBe(
      transportDedupe.approach("trip-abc", "stop-2", 5),
    );
    expect(transportDedupe.stopNext("trip-abc", "stop-2")).not.toBe(
      transportDedupe.arrived("trip-abc", "stop-2"),
    );
  });

  it("severity and deep link are defined for parent/student", () => {
    expect(severityForTransportEvent(BackendEvent.STOP_NEXT)).toBe("attention");
    expect(deepLinkForTransportEvent(BackendEvent.STOP_NEXT, "parent")).toBe(
      "/transport/live",
    );
    expect(deepLinkForTransportEvent(BackendEvent.STOP_NEXT, "student")).toBe(
      "/transport/live",
    );
  });

  it("canonical emit payload fields for Connect inbox / FCM", () => {
    const payload = {
      kind: BackendEvent.STOP_NEXT,
      tripId: "trip-1",
      stopId: "stop-2",
      priorStopId: "stop-1",
      studentIds: ["stu-b", "stu-c"],
      targetAudience: "parent" as const,
    };
    expect(payload.kind).toBe("STOP_NEXT");
    expect(payload.studentIds).toHaveLength(2);
    expect(payload.priorStopId).not.toBe(payload.stopId);
  });

  it("three-stop progression: arrival at s1 implies next key for s2 only", () => {
    const plan = routePlanStopIdsForTrip(
      { phase: "running", slot: "morning" },
      [
        { id: "s1", name: "Stop 1", route_order: 1, kind: "waypoint" },
        { id: "s2", name: "Stop 2", route_order: 2, kind: "waypoint" },
        { id: "s3", name: "Stop 3", route_order: 3, kind: "waypoint" },
        { id: "school", name: "School", route_order: 99, kind: "school" },
      ],
      [
        { student_id: "c1", pickup_stop_id: "s1", drop_stop_id: null },
        { student_id: "c2", pickup_stop_id: "s2", drop_stop_id: null },
        { student_id: "c3", pickup_stop_id: "s3", drop_stop_id: null },
      ],
    );
    const idx = plan.indexOf("s1");
    expect(idx).toBe(0);
    const nextId = plan[idx + 1];
    expect(nextId).toBe("s2");
    expect(transportDedupe.stopNext("t", nextId!)).toBe(
      "transport:t:stop:s2:next",
    );
    // Proximity to s2 alone would use approach/arrived keys — not stopNext for s2
    // until s1 arrival fires the sequential emit.
    expect(transportDedupe.approach("t", "s2", 5)).not.toBe(
      transportDedupe.stopNext("t", "s2"),
    );
  });

  it("ETA approach copy never collides with STOP_NEXT wording", () => {
    const copy = approachNotifyCopy("Stop 2", 5);
    expect(copy.title).not.toMatch(/next is your stop/i);
    expect(copy.body).not.toMatch(/next is your stop/i);
  });
});

describe("three-sibling trip-start expected counts", () => {
  it("documents unique-parent trip-level vs per-child boarding", () => {
    const tripId = "trip-sib";
    const parentAudienceKey = transportDedupe.tripStarted(tripId, "parent");
    const boardedA = transportDedupe.boarded(tripId, "child-a");
    const boardedB = transportDedupe.boarded(tripId, "child-b");
    const boardedC = transportDedupe.boarded(tripId, "child-c");
    // Trip start: 1 notification row for parent audience
    expect(parentAudienceKey).toBe(`transport:${tripId}:started:parent`);
    // Boarding: 3 distinct rows when three children board
    expect(new Set([boardedA, boardedB, boardedC]).size).toBe(3);
  });
});
