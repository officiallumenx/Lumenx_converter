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

  it("uses last route stop when dropStopId is missing (not pickup first)", () => {
    // Regression: falling back to pickup stop fails backend drop-stop validation
    // when enrollment.drop_stop_id is set server-side but omitted from client roster.
    expect(
      resolveDropStopIdForMark({
        dropStopId: null,
        pickupStopId: "pickup-gate",
        routeStopIds: ["pickup-gate", "mid", "school"],
      }),
    ).toBe("school");
  });

  it("falls back to pickup only when no route stops exist", () => {
    expect(
      resolveDropStopIdForMark({
        dropStopId: "  ",
        pickupStopId: "pickup-gate",
        routeStopIds: [],
      }),
    ).toBe("pickup-gate");
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
