import { describe, it, expect } from "vitest";
import {
  etaMinutesFromDistance,
  haversineMeters,
} from "../src/domains/transport/geo.js";
import { approachBandForEta } from "../src/domains/transport/approach.js";

describe("transport geo (Phase 2 Step 10)", () => {
  it("computes haversine distance and ETA", () => {
    const d = haversineMeters(
      { latitude: 12.97, longitude: 77.59 },
      { latitude: 12.971, longitude: 77.59 },
    );
    expect(d).toBeGreaterThan(50);
    expect(d).toBeLessThan(200);
    expect(etaMinutesFromDistance(d)).toBeGreaterThanOrEqual(1);
    expect(etaMinutesFromDistance(0)).toBe(0);
  });

  it("uses GPS speed when available and maps 30/15/5 bands", () => {
    // 15 km at default ~30 km/h → ~30 min
    expect(etaMinutesFromDistance(15_000)).toBe(30);
    expect(approachBandForEta(30)).toBe(30);
    expect(approachBandForEta(16)).toBe(30);
    expect(approachBandForEta(15)).toBe(15);
    expect(approachBandForEta(6)).toBe(15);
    expect(approachBandForEta(5)).toBe(5);
    expect(approachBandForEta(1)).toBe(5);
    expect(approachBandForEta(31)).toBeNull();

    // Faster GPS speed shortens ETA
    expect(etaMinutesFromDistance(15_000, 60)).toBe(15);
  });
});
