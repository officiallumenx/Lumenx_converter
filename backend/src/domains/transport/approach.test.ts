import { describe, expect, it } from "vitest";
import {
  approachBandForEta,
  isBusWithinStopRadius,
  resolveStopGeofenceM,
} from "./approach.js";

describe("approach withinRadius radius handling", () => {
  it("keeps ETA bands unchanged", () => {
    expect(approachBandForEta(4)).toBe(5);
    expect(approachBandForEta(10)).toBe(15);
    expect(approachBandForEta(25)).toBe(30);
    expect(approachBandForEta(40)).toBeNull();
  });
});

describe("notification radius geofence (no 50m floor)", () => {
  it("uses stored radius below the old 50m floor", () => {
    expect(resolveStopGeofenceM(30)).toBe(30);
    expect(isBusWithinStopRadius(30, 30)).toBe(true);
    expect(isBusWithinStopRadius(31, 30)).toBe(false);
  });

  it("falls back to 150 when missing/invalid", () => {
    expect(resolveStopGeofenceM(null)).toBe(150);
    expect(resolveStopGeofenceM(0)).toBe(150);
    expect(resolveStopGeofenceM(-10)).toBe(150);
    expect(resolveStopGeofenceM("x")).toBe(150);
  });

  it("treats bus inside default 150m as arrived geofence", () => {
    expect(isBusWithinStopRadius(149, null)).toBe(true);
    expect(isBusWithinStopRadius(150, null)).toBe(true);
    expect(isBusWithinStopRadius(151, null)).toBe(false);
  });
});
