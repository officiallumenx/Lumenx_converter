import { describe, expect, it } from "vitest";
import {
  commonLocationWritePair,
  hasConflictingPickupDrop,
  resolveCommonLocationStopId,
} from "./common-location.js";

describe("common-location", () => {
  it("prefers pickup then drop", () => {
    expect(
      resolveCommonLocationStopId({ pickupStopId: "a", dropStopId: "b" }),
    ).toBe("a");
    expect(
      resolveCommonLocationStopId({ pickupStopId: null, dropStopId: "b" }),
    ).toBe("b");
    expect(
      resolveCommonLocationStopId({ pickupStopId: "  ", dropStopId: null }),
    ).toBeNull();
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
