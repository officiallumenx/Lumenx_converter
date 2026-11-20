import { describe, expect, it } from "vitest";
import {
  defaultAttendanceTabForSlot,
  resolveDropStopIdForMark,
} from "./drop-stop";

describe("defaultAttendanceTabForSlot", () => {
  it("opens Dropping for evening Drop trips (regression: not_dropped after End Trip)", () => {
    expect(defaultAttendanceTabForSlot("evening")).toBe("dropping");
  });

  it("opens Boarding for morning Pickup trips", () => {
    expect(defaultAttendanceTabForSlot("morning")).toBe("boarding");
    expect(defaultAttendanceTabForSlot(null)).toBe("boarding");
    expect(defaultAttendanceTabForSlot(undefined)).toBe("boarding");
  });
});

describe("resolveDropStopIdForMark", () => {
  it("prefers enrollment drop stop over pickup", () => {
    expect(
      resolveDropStopIdForMark({
        dropStopId: "drop-school",
        pickupStopId: "pickup-gate",
        routeStopIds: ["pickup-gate", "drop-school"],
      }),
    ).toBe("drop-school");
  });

  it("prefers pickup (home) over last route stop when dropStopId is missing", () => {
    // Avoid labeling home drops as School when enrollment drop_stop_id was omitted.
    expect(
      resolveDropStopIdForMark({
        dropStopId: null,
        pickupStopId: "pickup-gate",
        routeStopIds: ["pickup-gate", "mid", "school"],
      }),
    ).toBe("pickup-gate");
  });

  it("falls back to last route stop when neither drop nor pickup is set", () => {
    expect(
      resolveDropStopIdForMark({
        dropStopId: "  ",
        pickupStopId: null,
        routeStopIds: ["a", "b", "school"],
      }),
    ).toBe("school");
  });

  it("returns null when no stop context exists", () => {
    expect(
      resolveDropStopIdForMark({
        dropStopId: null,
        pickupStopId: null,
        routeStopIds: [null, ""],
      }),
    ).toBeNull();
  });
});
