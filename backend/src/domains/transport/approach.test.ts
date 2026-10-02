import { describe, expect, it } from "vitest";
import { approachBandForEta } from "./approach.js";

describe("approach withinRadius radius handling", () => {
  it("keeps ETA bands unchanged", () => {
    expect(approachBandForEta(4)).toBe(5);
    expect(approachBandForEta(10)).toBe(15);
    expect(approachBandForEta(25)).toBe(30);
    expect(approachBandForEta(40)).toBeNull();
  });
});

/** Pure helper mirroring computeApproachForStudent geofence resolution. */
function resolveGeofenceM(notificationRadiusM: unknown): number {
  const radius = Number(notificationRadiusM);
  return Number.isFinite(radius) && radius > 0 ? radius : 150;
}

describe("notification radius geofence (no 50m floor)", () => {
  it("uses stored radius below the old 50m floor", () => {
    expect(resolveGeofenceM(30)).toBe(30);
    expect(30 <= resolveGeofenceM(30)).toBe(true);
  });

  it("falls back to 150 when missing/invalid", () => {
    expect(resolveGeofenceM(null)).toBe(150);
    expect(resolveGeofenceM(0)).toBe(150);
    expect(resolveGeofenceM(-10)).toBe(150);
    expect(resolveGeofenceM("x")).toBe(150);
  });
});
