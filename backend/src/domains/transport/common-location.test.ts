import { describe, expect, it } from "vitest";
import {
  commonLocationWritePair,
  hasConflictingPickupDrop,
  resolveCommonLocationStopId,
} from "./common-location.js";

describe("common-location", () => {
  it("resolves single common stop from pickup or drop", () => {
    // Only pickup
    expect(
      resolveCommonLocationStopId({ pickupStopId: "a", dropStopId: null }),
    ).toBe("a");
    // Only drop
    expect(
      resolveCommonLocationStopId({ pickupStopId: null, dropStopId: "b" }),
    ).toBe("b");
    // Both matching
    expect(
      resolveCommonLocationStopId({ pickupStopId: "a", dropStopId: "a" }),
    ).toBe("a");
    // Empty / whitespace
    expect(
      resolveCommonLocationStopId({ pickupStopId: "  ", dropStopId: null }),
    ).toBeNull();
    // Conflicting: prefers primary pickup stop
    expect(
      resolveCommonLocationStopId({ pickupStopId: "a", dropStopId: "b" }),
    ).toBe("a");
  });

  it("detects conflicting historical pickup/drop", () => {
    expect(hasConflictingPickupDrop({ pickupStopId: "a", dropStopId: "b" })).toBe(
      true,
    );
    expect(hasConflictingPickupDrop({ pickupStopId: "a", dropStopId: "a" })).toBe(
      false,
    );
    expect(
      hasConflictingPickupDrop({ pickupStopId: "a", dropStopId: null }),
    ).toBe(false);
  });

  it("dual-writes the same stop id", () => {
    expect(commonLocationWritePair(" stop-1 ")).toEqual({
      pickupStopId: "stop-1",
      dropStopId: "stop-1",
    });
  });
});
