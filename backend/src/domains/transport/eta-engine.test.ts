import { describe, expect, it, beforeEach } from "vitest";
import {
  ETA_ENGINE,
  clearEtaEngineState,
  computeStableEta,
  evaluateGpsTrust,
  ingestTripGpsSample,
  remainingDistanceAlongStopsM,
} from "./eta-engine.js";

describe("eta-engine GPS trust", () => {
  beforeEach(() => clearEtaEngineState());

  it("rejects physically impossible jumps", () => {
    const t0 = Date.now();
    const first = evaluateGpsTrust({
      previous: null,
      next: {
        latitude: 12.97,
        longitude: 77.59,
        capturedAtMs: t0,
        accuracyM: 10,
      },
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const jump = evaluateGpsTrust({
      previous: first.location,
      next: {
        latitude: 12.98,
        longitude: 77.6,
        capturedAtMs: t0 + 1000,
        accuracyM: 10,
      },
    });
    expect(jump.ok).toBe(false);
    if (jump.ok) return;
    expect(jump.reason).toBe("jump");
  });

  it("accepts plausible movement and builds effective speed", () => {
    const tripId = "trip-speed-1";
    const t0 = Date.now();
    const a = ingestTripGpsSample({
      tripId,
      latitude: 12.97,
      longitude: 77.59,
      capturedAtMs: t0,
      accuracyM: 12,
      reportedSpeedKmh: 30,
      nowMs: t0,
    });
    expect(a.trusted).toBe(true);

    const b = ingestTripGpsSample({
      tripId,
      latitude: 12.9708,
      longitude: 77.59,
      capturedAtMs: t0 + 30_000,
      accuracyM: 12,
      reportedSpeedKmh: 28,
      nowMs: t0 + 30_000,
    });
    expect(b.trusted).toBe(true);
    expect(b.tracker.effectiveSpeedKmh).toBeGreaterThan(10);
    expect(b.tracker.effectiveSpeedKmh).toBeLessThan(ETA_ENGINE.maxUsableSpeedKmh);
  });
});

describe("eta-engine route remaining distance", () => {
  it("sums stop legs instead of only crow-flies to destination", () => {
    const stops = [
      { id: "s1", latitude: 12.97, longitude: 77.59 },
      { id: "s2", latitude: 12.98, longitude: 77.59 },
      { id: "s3", latitude: 12.99, longitude: 77.59 },
    ];
    const bus = { latitude: 12.969, longitude: 77.59 };
    const along = remainingDistanceAlongStopsM({
      bus,
      orderedStops: stops,
      destinationStopId: "s3",
    });
    expect(along.method).toBe("stop_legs");
    expect(along.distanceM).toBeGreaterThan(2000);
  });
});

describe("eta-engine smoothing + stopped", () => {
  beforeEach(() => clearEtaEngineState());

  it("does not collapse far stopped bus to 1 minute ETA", () => {
    const tripId = "trip-stop-1";
    const t0 = Date.now();
    const stops = [
      { id: "pickup", latitude: 13.0, longitude: 77.6 },
    ];

    // Establish ~20 min ETA while moving.
    ingestTripGpsSample({
      tripId,
      latitude: 12.97,
      longitude: 77.59,
      capturedAtMs: t0,
      accuracyM: 10,
      reportedSpeedKmh: 30,
      nowMs: t0,
    });
    const moving = computeStableEta({
      tripId,
      stopId: "pickup",
      bus: { latitude: 12.97, longitude: 77.59 },
      orderedStops: stops,
      destinationStopId: "pickup",
      nowMs: t0,
    });
    expect(moving.etaMinutes).not.toBeNull();
    expect(moving.etaMinutes!).toBeGreaterThan(5);

    // Sustained near-zero speed → stopped.
    let t = t0;
    for (let i = 0; i < 10; i++) {
      t += 5_000;
      ingestTripGpsSample({
        tripId,
        latitude: 12.97,
        longitude: 77.59,
        capturedAtMs: t,
        accuracyM: 10,
        reportedSpeedKmh: 0,
        nowMs: t,
      });
    }
    const stopped = computeStableEta({
      tripId,
      stopId: "pickup",
      bus: { latitude: 12.97, longitude: 77.59 },
      orderedStops: stops,
      destinationStopId: "pickup",
      nowMs: t,
    });
    expect(stopped.movementState).toBe("stopped");
    expect(stopped.displayMode).toBe("stopped");
    expect(stopped.etaMinutes).not.toBe(1);
    expect(stopped.etaMinutes!).toBeGreaterThan(5);
  });

  it("limits sudden ETA drop from noisy distance", () => {
    const tripId = "trip-smooth-1";
    const t0 = Date.now();
    const farStop = [{ id: "s", latitude: 13.05, longitude: 77.65 }];
    ingestTripGpsSample({
      tripId,
      latitude: 12.97,
      longitude: 77.59,
      capturedAtMs: t0,
      accuracyM: 10,
      reportedSpeedKmh: 30,
      nowMs: t0,
    });
    const first = computeStableEta({
      tripId,
      stopId: "s",
      bus: { latitude: 12.97, longitude: 77.59 },
      orderedStops: farStop,
      destinationStopId: "s",
      nowMs: t0,
    });
    expect(first.etaMinutes!).toBeGreaterThan(15);

    // Teleport near stop without trusted jump acceptance — use crow-flies change
    // via computeStableEta only (same tracker last ETA).
    const second = computeStableEta({
      tripId,
      stopId: "s",
      bus: { latitude: 13.049, longitude: 77.65 },
      orderedStops: farStop,
      destinationStopId: "s",
      nowMs: t0 + 2_000,
    });
    expect(first.etaMinutes! - (second.etaMinutes ?? 0)).toBeLessThanOrEqual(
      ETA_ENGINE.maxEtaDropPerUpdateMin,
    );
  });
});
