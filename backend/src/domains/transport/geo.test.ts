import { describe, expect, it } from "vitest";
import { etaMinutesFromDistance, haversineMeters } from "./geo.js";

describe("haversineMeters", () => {
  it("returns ~0 for identical points", () => {
    expect(
      haversineMeters(
        { latitude: 12.9, longitude: 77.5 },
        { latitude: 12.9, longitude: 77.5 },
      ),
    ).toBeLessThan(0.5);
  });

  it("measures ~111m for ~0.001° latitude delta near equator scale", () => {
    // 1° latitude ≈ 111_320 m → 0.001° ≈ 111.32 m
    const d = haversineMeters(
      { latitude: 0, longitude: 0 },
      { latitude: 0.001, longitude: 0 },
    );
    expect(d).toBeGreaterThan(110);
    expect(d).toBeLessThan(113);
  });

  it("keeps 50m / 100m / outside thresholds distinct in meters (not km)", () => {
    const origin = { latitude: 12.9716, longitude: 77.5946 };
    // ~50m north (~0.00045°)
    const at50 = haversineMeters(origin, {
      latitude: origin.latitude + 0.00045,
      longitude: origin.longitude,
    });
    // ~100m north (~0.0009°)
    const at100 = haversineMeters(origin, {
      latitude: origin.latitude + 0.0009,
      longitude: origin.longitude,
    });
    // ~150m north
    const at150 = haversineMeters(origin, {
      latitude: origin.latitude + 0.00135,
      longitude: origin.longitude,
    });
    expect(at50).toBeGreaterThan(40);
    expect(at50).toBeLessThan(60);
    expect(at100).toBeGreaterThan(90);
    expect(at100).toBeLessThan(120);
    expect(at150).toBeGreaterThan(140);
    // Sanity: never treat meters as kilometers (would be ~0.05–0.15).
    expect(at50).toBeGreaterThan(1);
    expect(at100).toBeGreaterThan(1);
  });
});

describe("etaMinutesFromDistance", () => {
  it("ceil minutes from meters at urban default speed", () => {
    expect(etaMinutesFromDistance(0)).toBe(0);
    expect(etaMinutesFromDistance(500)).toBeGreaterThanOrEqual(1);
  });
});
