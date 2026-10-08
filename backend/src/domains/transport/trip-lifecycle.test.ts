import { describe, expect, it } from "vitest";
import { AppError } from "../../errors/app-error.js";
import {
  assertValidTripPhaseTransition,
  shouldNotifyTripPhaseChange,
} from "./trip-lifecycle.js";
import {
  buildDropStopSequence,
  buildPickupStopSequence,
  studentsForDropStop,
  studentsForPickupStop,
} from "./trip-stop-plan.js";

describe("trip-lifecycle transitions", () => {
  it("allows the productive journey transitions", () => {
    expect(() => assertValidTripPhaseTransition("starting", "running")).not.toThrow();
    expect(() => assertValidTripPhaseTransition("running", "boarding")).not.toThrow();
    expect(() => assertValidTripPhaseTransition("boarding", "dropping")).not.toThrow();
    expect(() => assertValidTripPhaseTransition("dropping", "completed")).not.toThrow();
  });

  it("rejects invalid transitions", () => {
    expect(() => assertValidTripPhaseTransition("ready", "running")).toThrow(AppError);
    expect(() => assertValidTripPhaseTransition("completed", "running")).toThrow(AppError);
    expect(() => assertValidTripPhaseTransition("starting", "boarding")).toThrow(AppError);
  });

  it("allows same-phase no-op", () => {
    expect(() => assertValidTripPhaseTransition("boarding", "boarding")).not.toThrow();
  });

  it("does not notify phase-updated for starting→running (covered by trip started)", () => {
    expect(shouldNotifyTripPhaseChange("starting", "running")).toBe(false);
    expect(shouldNotifyTripPhaseChange("running", "boarding")).toBe(true);
  });
});

describe("trip-stop-plan", () => {
  const stops = [
    { id: "park", name: "Yard", route_order: 0, kind: "parking" },
    { id: "s1", name: "Stop 1", route_order: 1, kind: "waypoint" },
    { id: "s2", name: "Stop 2", route_order: 2, kind: "waypoint" },
    { id: "school", name: "School", route_order: 99, kind: "school" },
  ];

  it("builds pickup with school last and parking excluded", () => {
    const pickup = buildPickupStopSequence(stops);
    expect(pickup.map((s) => s.id)).toEqual(["s1", "s2", "school"]);
  });

  it("builds drop from enrollment drop_stop_id — does not coerce all to school", () => {
    const drop = buildDropStopSequence(stops, [
      { student_id: "a", pickup_stop_id: "s1", drop_stop_id: "s1" },
      { student_id: "b", pickup_stop_id: "s2", drop_stop_id: "s2" },
    ]);
    expect(drop.map((s) => s.id)).toEqual(["s1", "s2"]);
  });

  it("falls back to reverse pickup when no drop stops configured", () => {
    const drop = buildDropStopSequence(stops, []);
    expect(drop.map((s) => s.id)).toEqual(["s2", "s1"]);
  });

  it("resolves expected students per stop", () => {
    const enrollments = [
      { student_id: "a", pickup_stop_id: "s1", drop_stop_id: "s1" },
      { student_id: "b", pickup_stop_id: "s2", drop_stop_id: "school" },
    ];
    expect(studentsForPickupStop(enrollments, "s1")).toEqual(["a"]);
    expect(studentsForDropStop(enrollments, "school", "school")).toEqual(["b"]);
  });
});
