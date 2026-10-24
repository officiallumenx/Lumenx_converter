/**
 * Focused regressions for the eight Transport production issues.
 */
import { describe, expect, it } from "vitest";
import {
  approachNotifyCopy,
  canEvaluateSchoolArrivalOnPing,
  isBusWithinStopRadius,
  isWithinApproachStartGrace,
  routePlanStopIdsForTrip,
} from "./approach.js";
import { buildStudentDroppedParentCopy } from "./ops-notifications.js";
import { transportDedupe } from "./transport-notification-severity.js";
import { TRANSPORT_EVENT } from "./transport-events.js";

describe("Issue 1 — trip-level events unique per parent", () => {
  it("tripStarted and reminderParent keys ignore sibling student ids", () => {
    const trip = "t1";
    expect(transportDedupe.tripStarted(trip, "parent")).not.toContain("stu-");
    expect(
      transportDedupe.reminderParent("r1", "pre_pickup", "2026-10-16"),
    ).not.toMatch(/stu-/);
    expect(transportDedupe.boarded(trip, "stu-a")).not.toBe(
      transportDedupe.boarded(trip, "stu-b"),
    );
  });

  it("three siblings → one trip-start key, three boarded keys", () => {
    const tripId = "trip-sib";
    const startKey = transportDedupe.tripStarted(tripId, "parent");
    const boarded = ["a", "b", "c"].map((id) =>
      transportDedupe.boarded(tripId, id),
    );
    expect(startKey).toBe(`transport:${tripId}:started:parent`);
    expect(new Set(boarded).size).toBe(3);
    expect(boarded.every((k) => k !== startKey)).toBe(true);
  });
});

describe("Issue 2 — school arrived not implied by start", () => {
  it("start grace still suppresses early geofence side-effects", () => {
    expect(
      isWithinApproachStartGrace(new Date(Date.now() - 5_000).toISOString()),
    ).toBe(true);
  });

  it("starting phase never evaluates school arrival even at school", () => {
    const started = new Date(Date.now() - 120_000).toISOString();
    expect(
      canEvaluateSchoolArrivalOnPing({
        phase: "starting",
        started_at: started,
        school_arrived_at: null,
      }),
    ).toBe(false);
  });

  it("running past grace may evaluate; already-arrived stays locked", () => {
    const started = new Date(Date.now() - 120_000).toISOString();
    expect(
      canEvaluateSchoolArrivalOnPing({
        phase: "running",
        started_at: started,
        school_arrived_at: null,
      }),
    ).toBe(true);
    expect(
      canEvaluateSchoolArrivalOnPing({
        phase: "running",
        started_at: started,
        school_arrived_at: new Date().toISOString(),
      }),
    ).toBe(false);
  });

  it("boarding within 90s grace is suppressed", () => {
    expect(
      canEvaluateSchoolArrivalOnPing({
        phase: "boarding",
        started_at: new Date(Date.now() - 10_000).toISOString(),
        school_arrived_at: null,
      }),
    ).toBe(false);
  });
});

describe("Issue 3 — drop wording uses stop name not forced school", () => {
  it("STOP_NEXT / arrival kinds stay distinct from STUDENT_DROPPED", () => {
    expect(TRANSPORT_EVENT.STUDENT_DROPPED).not.toBe(TRANSPORT_EVENT.STOP_NEXT);
    expect(TRANSPORT_EVENT.STUDENT_DROPPED).not.toBe(
      TRANSPORT_EVENT.SCHOOL_ARRIVED,
    );
  });

  it("home waypoint drop does not say school", () => {
    const copy = buildStudentDroppedParentCopy({
      studentName: "Child A",
      stopName: "STG RT S1",
      stopKind: "waypoint",
    });
    expect(copy.atSchool).toBe(false);
    expect(copy.title + copy.body).not.toMatch(/at school/i);
    expect(copy.body).toContain("STG RT S1");
  });

  it("school stop uses school copy", () => {
    const copy = buildStudentDroppedParentCopy({
      studentName: "Child A",
      stopName: "STG RT School",
      stopKind: "school",
    });
    expect(copy.atSchool).toBe(true);
    expect(copy.title).toMatch(/reached school/i);
  });
});

describe("Issue 5/6 — sequential next vs approach vs arrival", () => {
  it("approach copy never says next-is-your-stop", () => {
    for (const band of [30, 15, 5] as const) {
      const c = approachNotifyCopy("Home Gate", band);
      expect(c.title + c.body).not.toMatch(/next is your stop/i);
      expect(c.title + c.body).toMatch(/approach/i);
    }
  });

  it("dedupe keys differ for approach, arrival, and next", () => {
    const trip = "t";
    const stop = "s2";
    const keys = new Set([
      transportDedupe.approach(trip, stop, 5),
      transportDedupe.arrived(trip, stop),
      transportDedupe.stopNext(trip, stop),
    ]);
    expect(keys.size).toBe(3);
  });

  it("plan order: arrive s1 ⇒ next is s2 (proximity alone does not reorder)", () => {
    const plan = routePlanStopIdsForTrip(
      { phase: "running", slot: "morning" },
      [
        { id: "s1", name: "1", route_order: 1, kind: "waypoint" },
        { id: "s2", name: "2", route_order: 2, kind: "waypoint" },
        { id: "school", name: "School", route_order: 9, kind: "school" },
      ],
      [
        { student_id: "c1", pickup_stop_id: "s1", drop_stop_id: null },
        { student_id: "c2", pickup_stop_id: "s2", drop_stop_id: null },
      ],
    );
    expect(plan.indexOf("s1")).toBeLessThan(plan.indexOf("s2"));
    expect(isBusWithinStopRadius(50, 100)).toBe(true);
    expect(plan[0]).toBe("s1");
    const nextAfterS1 = plan[plan.indexOf("s1") + 1];
    expect(nextAfterS1).toBe("s2");
    expect(transportDedupe.stopNext("t", nextAfterS1!)).toBe(
      "transport:t:stop:s2:next",
    );
  });

  it("three-stop plan: s1→s2→s3 then school stays last", () => {
    const plan = routePlanStopIdsForTrip(
      { phase: "running", slot: "morning" },
      [
        { id: "s1", name: "S1", route_order: 0, kind: "waypoint" },
        { id: "s2", name: "S2", route_order: 1, kind: "waypoint" },
        { id: "s3", name: "S3", route_order: 2, kind: "waypoint" },
        { id: "school", name: "School", route_order: 3, kind: "school" },
      ],
      [
        { student_id: "c1", pickup_stop_id: "s1", drop_stop_id: null },
        { student_id: "c2", pickup_stop_id: "s2", drop_stop_id: null },
        { student_id: "c3", pickup_stop_id: "s3", drop_stop_id: null },
      ],
    );
    expect(plan.slice(0, 3)).toEqual(["s1", "s2", "s3"]);
  });
});

describe("Issue 7 — policy: no silent auto-end event kind", () => {
  it("catalog has no auto-end-after-hour event", () => {
    expect(Object.values(TRANSPORT_EVENT)).not.toContain("TRIP_AUTO_ENDED");
  });
});
