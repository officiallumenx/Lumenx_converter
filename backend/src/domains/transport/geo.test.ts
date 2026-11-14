import { describe, expect, it } from "vitest";
import {
  etaMinutesFromDistance,
  haversineMeters,
  pointToSegmentDistanceM,
  isTrajectoryValidForInterpolation,
  isArrivalGeofenceEntered,
} from "./geo.js";

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

describe("pointToSegmentDistanceM", () => {
  it("calculates perpendicular distance when projection falls inside segment", () => {
    // Bus moves West to East across the equator:
    // A: (0.0, -0.001) -> ~111m West of origin
    // B: (0.0, +0.001) -> ~111m East of origin
    // Stop is located 25m North: (25 / 111320 ≈ 0.0002246°, 0.0)
    const stop = { latitude: 0.0002246, longitude: 0.0 };
    const a = { latitude: 0.0, longitude: -0.001 };
    const b = { latitude: 0.0, longitude: 0.001 };

    const dist = pointToSegmentDistanceM(stop, a, b);
    expect(dist).toBeGreaterThan(24);
    expect(dist).toBeLessThan(26);

    // Discrete endpoints are both > 111m away:
    expect(haversineMeters(stop, a)).toBeGreaterThan(111);
    expect(haversineMeters(stop, b)).toBeGreaterThan(111);
  });

  it("clamps to endpoint A when projection falls before segment start", () => {
    const stop = { latitude: 0.0, longitude: -0.002 }; // ~222m West
    const a = { latitude: 0.0, longitude: -0.001 };    // ~111m West
    const b = { latitude: 0.0, longitude: 0.001 };     // ~111m East

    const dist = pointToSegmentDistanceM(stop, a, b);
    const distToA = haversineMeters(stop, a);
    expect(Math.abs(dist - distToA)).toBeLessThan(1.0);
  });

  it("clamps to endpoint B when projection falls after segment end", () => {
    const stop = { latitude: 0.0, longitude: 0.002 };  // ~222m East
    const a = { latitude: 0.0, longitude: -0.001 };    // ~111m West
    const b = { latitude: 0.0, longitude: 0.001 };     // ~111m East

    const dist = pointToSegmentDistanceM(stop, a, b);
    const distToB = haversineMeters(stop, b);
    expect(Math.abs(dist - distToB)).toBeLessThan(1.0);
  });

  it("handles identical endpoints gracefully", () => {
    const stop = { latitude: 12.9716, longitude: 77.5946 };
    const pt = { latitude: 12.9725, longitude: 77.5946 }; // ~100m north

    const dist = pointToSegmentDistanceM(stop, pt, pt);
    const hav = haversineMeters(stop, pt);
    expect(Math.abs(dist - hav)).toBeLessThan(1.0);
  });
});

describe("isTrajectoryValidForInterpolation", () => {
  const baseTime = Date.now();
  const origin = { latitude: 12.9716, longitude: 77.5946, capturedAtMs: baseTime, accuracyM: 10 };

  it("accepts plausible consecutive samples within 10s at 40 km/h", () => {
    // 40 km/h for 10s = ~111m
    const current = {
      latitude: origin.latitude + 0.001,
      longitude: origin.longitude,
      capturedAtMs: baseTime + 10_000,
      accuracyM: 12,
    };
    expect(isTrajectoryValidForInterpolation(origin, current)).toBe(true);
  });

  it("rejects clock skew (deltaMs <= 0)", () => {
    const current = {
      latitude: origin.latitude + 0.0001,
      longitude: origin.longitude,
      capturedAtMs: baseTime - 1000,
      accuracyM: 10,
    };
    expect(isTrajectoryValidForInterpolation(origin, current)).toBe(false);
  });

  it("rejects excessive time gaps (> 90 seconds)", () => {
    const current = {
      latitude: origin.latitude + 0.0001,
      longitude: origin.longitude,
      capturedAtMs: baseTime + 95_000,
      accuracyM: 10,
    };
    expect(isTrajectoryValidForInterpolation(origin, current)).toBe(false);
  });

  it("rejects unrealistic teleports (> 120 km/h)", () => {
    // Moving 500m in 5s = 100 m/s = 360 km/h
    const current = {
      latitude: origin.latitude + 0.0045,
      longitude: origin.longitude,
      capturedAtMs: baseTime + 5_000,
      accuracyM: 10,
    };
    expect(isTrajectoryValidForInterpolation(origin, current)).toBe(false);
  });

  it("rejects points with poor GPS accuracy (> 80m)", () => {
    const current = {
      latitude: origin.latitude + 0.0005,
      longitude: origin.longitude,
      capturedAtMs: baseTime + 5_000,
      accuracyM: 120,
    };
    expect(isTrajectoryValidForInterpolation(origin, current)).toBe(false);
  });
});

describe("isArrivalGeofenceEntered", () => {
  it("returns true when distance is within standard 100m radius with accurate GPS", () => {
    expect(isArrivalGeofenceEntered({ stopRadiusM: 100, distanceM: 65, accuracyM: 10 })).toBe(true);
    expect(isArrivalGeofenceEntered({ stopRadiusM: 100, distanceM: 75, accuracyM: 15 })).toBe(true);
    expect(isArrivalGeofenceEntered({ stopRadiusM: 100, distanceM: 100, accuracyM: 15 })).toBe(true);
  });

  it("returns false when distance exceeds configured stop radius", () => {
    expect(isArrivalGeofenceEntered({ stopRadiusM: 100, distanceM: 101, accuracyM: 10 })).toBe(false);
    expect(isArrivalGeofenceEntered({ stopRadiusM: 100, distanceM: 105, accuracyM: 10 })).toBe(false);
    expect(isArrivalGeofenceEntered({ stopRadiusM: 100, distanceM: 150, accuracyM: 10 })).toBe(false);
    expect(isArrivalGeofenceEntered({ stopRadiusM: 50, distanceM: 65, accuracyM: 5 })).toBe(false);
  });

  it("supports custom configured stop radiuses (e.g. 50m, 150m, 200m)", () => {
    expect(isArrivalGeofenceEntered({ stopRadiusM: 150, distanceM: 125, accuracyM: 10 })).toBe(true);
    expect(isArrivalGeofenceEntered({ stopRadiusM: 50, distanceM: 40, accuracyM: 8 })).toBe(true);
    expect(isArrivalGeofenceEntered({ stopRadiusM: 200, distanceM: 180, accuracyM: 20 })).toBe(true);
    expect(isArrivalGeofenceEntered({ stopRadiusM: 200, distanceM: 250, accuracyM: 20 })).toBe(false);
  });

  it("correctly triggers arrival on typical urban smartphone GPS accuracy (55-80m) when inside radius", () => {
    // 60m-65m accuracy on a 100m radius stop: reading at 85m is inside the 100m geofence and triggers arrival
    expect(isArrivalGeofenceEntered({ stopRadiusM: 100, distanceM: 85, accuracyM: 60 })).toBe(true);
    expect(isArrivalGeofenceEntered({ stopRadiusM: 100, distanceM: 75, accuracyM: 65 })).toBe(true);
    expect(isArrivalGeofenceEntered({ stopRadiusM: 100, distanceM: 100, accuracyM: 65 })).toBe(true);
  });

  it("rejects absurd GPS accuracy (> 500m) or invalid coordinates/distance", () => {
    expect(isArrivalGeofenceEntered({ stopRadiusM: 100, distanceM: 50, accuracyM: 550 })).toBe(false);
    expect(isArrivalGeofenceEntered({ stopRadiusM: 100, distanceM: -5, accuracyM: 10 })).toBe(false);
    expect(isArrivalGeofenceEntered({ stopRadiusM: 100, distanceM: Number.NaN, accuracyM: 10 })).toBe(false);
    expect(isArrivalGeofenceEntered({ stopRadiusM: 0, distanceM: 10, accuracyM: 10 })).toBe(false);
  });
});
