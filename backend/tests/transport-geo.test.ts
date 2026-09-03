import { describe, it, expect } from "vitest";
import {
  etaMinutesFromDistance,
  haversineMeters,
} from "../src/domains/transport/geo.js";

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
});
