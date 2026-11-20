import { describe, expect, it } from "vitest";
import { isOperationallyUsable } from "./approval.js";
import {
  buildDropStopSequence,
  buildPickupStopSequence,
  type TripStopRef,
} from "./trip-stop-plan.js";

describe("isOperationallyUsable", () => {
  it("treats pending and approved as usable", () => {
    expect(isOperationallyUsable("pending")).toBe(true);
    expect(isOperationallyUsable("approved")).toBe(true);
  });

  it("treats rejected as unusable", () => {
    expect(isOperationallyUsable("rejected")).toBe(false);
  });

  it("treats null/undefined as unusable", () => {
    expect(isOperationallyUsable(null)).toBe(false);
    expect(isOperationallyUsable(undefined)).toBe(false);
    expect(isOperationallyUsable("")).toBe(false);
  });
});

describe("trip stop plans with usable-only stops", () => {
  const usable: TripStopRef[] = [
    { id: "s1", name: "A", route_order: 1, kind: "waypoint" },
    { id: "s2", name: "School", route_order: 2, kind: "school" },
  ];

  it("pickup plan never includes stops that were filtered out before call", () => {
    // Callers must filter with isOperationallyUsable before building plans
    // (enrichTrip contract). Rejected id "rej" is absent from input.
    const plan = buildPickupStopSequence(usable);
    expect(plan.map((s) => s.id)).toEqual(["s1", "s2"]);
    expect(plan.some((s) => s.id === "rej")).toBe(false);
  });

  it("drop plan only uses drop stops present in usable stop list", () => {
    const plan = buildDropStopSequence(usable, [
      { student_id: "st1", pickup_stop_id: "s1", drop_stop_id: "s2" },
      {
        student_id: "st2",
        pickup_stop_id: "s1",
        drop_stop_id: "rejected-stop",
      },
    ]);
    expect(plan.map((s) => s.id)).toEqual(["s2"]);
    expect(plan.some((s) => s.id === "rejected-stop")).toBe(false);
  });
});
