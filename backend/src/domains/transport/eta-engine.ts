/**
 * Production Transport ETA engine (route-stop-leg aware, smoothed speed/ETA).
 *
 * Limitation: no route polyline in DB — remaining distance uses ordered stop
 * haversine legs (bus → next stops → assigned stop), not map-matched roads.
 */
import { haversineMeters } from "./geo.js";

export type MovementState =
  | "moving"
  | "slow"
  | "stopped"
  | "gps_stale"
  | "gps_uncertain";

export type EtaConfidence = "high" | "medium" | "low";

export type LatLng = { latitude: number; longitude: number };

export type TrustedLocation = LatLng & {
  capturedAtMs: number;
  accuracyM: number | null;
};

/** Documented movement / trust thresholds (meters, km/h, ms). */
export const ETA_ENGINE = {
  /** Reject implied jump faster than this (km/h). */
  maxImpliedSpeedKmh: 120,
  /** Ignore GPS-reported speeds below this (noise / stationary). */
  minUsableGpsSpeedKmh: 3,
  /** Cap GPS-reported / inferred speed. */
  maxUsableSpeedKmh: 90,
  /** Fallback when no trusted speed samples yet (~urban bus). */
  defaultSpeedKmh: 28,
  /** Moving if effective speed ≥ this for hysteresis enter. */
  movingEnterKmh: 8,
  /** Stopped if effective speed ≤ this for sustained period. */
  stoppedEnterKmh: 2.5,
  /** Exit stopped only above this (hysteresis). */
  stoppedExitKmh: 5,
  /** Must stay below stoppedEnter for this long → STOPPED. */
  stoppedConfirmMs: 20_000,
  /** Location older than this → GPS_STALE for ETA confidence. */
  staleLocationMs: 90_000,
  /** Accuracy worse than this → GPS_UNCERTAIN. */
  uncertainAccuracyM: 80,
  /** Max ETA drop per update (minutes). */
  maxEtaDropPerUpdateMin: 3,
  /** Max ETA rise per update (minutes). */
  maxEtaRisePerUpdateMin: 5,
  /** Very close crow-flies: allow sub-3 min ETA when truly near. */
  nearStopDistanceM: 250,
  /** Rolling window for speed samples. */
  speedHistoryMs: 120_000,
  speedHistoryMax: 24,
} as const;

type TripEtaTracker = {
  lastTrusted: TrustedLocation | null;
  speedSamples: Array<{ kmh: number; atMs: number }>;
  effectiveSpeedKmh: number;
  movementState: MovementState;
  candidateStoppedSinceMs: number | null;
  /** stopId → last published ETA minutes */
  lastEtaByStop: Map<string, number>;
  updatedAtMs: number;
};

const trackers = new Map<string, TripEtaTracker>();

function emptyTracker(nowMs: number): TripEtaTracker {
  return {
    lastTrusted: null,
    speedSamples: [],
    effectiveSpeedKmh: ETA_ENGINE.defaultSpeedKmh,
    movementState: "gps_uncertain",
    candidateStoppedSinceMs: null,
    lastEtaByStop: new Map(),
    updatedAtMs: nowMs,
  };
}

/** Test helper. */
export function clearEtaEngineState(): void {
  trackers.clear();
}

export function getTripEtaTracker(tripId: string): TripEtaTracker | null {
  return trackers.get(tripId) ?? null;
}

export type GpsTrustResult =
  | { ok: true; location: TrustedLocation; impliedSpeedKmh: number | null }
  | { ok: false; reason: "jump" | "stale_timestamp" | "bad_coords" };

/**
 * Validate a candidate ping against last trusted position (jump / time order).
 */
export function evaluateGpsTrust(input: {
  previous: TrustedLocation | null;
  next: LatLng & { capturedAtMs: number; accuracyM?: number | null };
}): GpsTrustResult {
  const { previous, next } = input;
  if (
    !Number.isFinite(next.latitude) ||
    !Number.isFinite(next.longitude) ||
    next.latitude < -90 ||
    next.latitude > 90 ||
    next.longitude < -180 ||
    next.longitude > 180
  ) {
    return { ok: false, reason: "bad_coords" };
  }
  if (previous && next.capturedAtMs + 1_000 < previous.capturedAtMs) {
    return { ok: false, reason: "stale_timestamp" };
  }
  if (!previous) {
    return {
      ok: true,
      location: {
        latitude: next.latitude,
        longitude: next.longitude,
        capturedAtMs: next.capturedAtMs,
        accuracyM: next.accuracyM ?? null,
      },
      impliedSpeedKmh: null,
    };
  }
  const dtSec = Math.max(0.001, (next.capturedAtMs - previous.capturedAtMs) / 1000);
  const distM = haversineMeters(previous, next);
  const impliedSpeedKmh = (distM / dtSec) * 3.6;
  if (impliedSpeedKmh > ETA_ENGINE.maxImpliedSpeedKmh && distM > 80) {
    return { ok: false, reason: "jump" };
  }
  return {
    ok: true,
    location: {
      latitude: next.latitude,
      longitude: next.longitude,
      capturedAtMs: next.capturedAtMs,
      accuracyM: next.accuracyM ?? null,
    },
    impliedSpeedKmh: Number.isFinite(impliedSpeedKmh) ? impliedSpeedKmh : null,
  };
}

function clampSpeedKmh(kmh: number): number {
  return Math.min(
    ETA_ENGINE.maxUsableSpeedKmh,
    Math.max(0, kmh),
  );
}

function pruneSamples(tracker: TripEtaTracker, nowMs: number): void {
  const cutoff = nowMs - ETA_ENGINE.speedHistoryMs;
  tracker.speedSamples = tracker.speedSamples
    .filter((s) => s.atMs >= cutoff)
    .slice(-ETA_ENGINE.speedHistoryMax);
}

function recomputeEffectiveSpeed(tracker: TripEtaTracker): number {
  const samples = tracker.speedSamples;
  if (samples.length === 0) return ETA_ENGINE.defaultSpeedKmh;
  // Newer samples weigh more (linear ramp).
  let weightSum = 0;
  let acc = 0;
  for (let i = 0; i < samples.length; i++) {
    const w = i + 1;
    acc += samples[i]!.kmh * w;
    weightSum += w;
  }
  return clampSpeedKmh(acc / weightSum);
}

function updateMovementState(
  tracker: TripEtaTracker,
  nowMs: number,
): MovementState {
  const speed = tracker.effectiveSpeedKmh;
  const ageMs = tracker.lastTrusted
    ? nowMs - tracker.lastTrusted.capturedAtMs
    : Number.POSITIVE_INFINITY;
  if (ageMs > ETA_ENGINE.staleLocationMs) {
    tracker.movementState = "gps_stale";
    tracker.candidateStoppedSinceMs = null;
    return tracker.movementState;
  }
  if (
    tracker.lastTrusted?.accuracyM != null &&
    tracker.lastTrusted.accuracyM > ETA_ENGINE.uncertainAccuracyM
  ) {
    tracker.movementState = "gps_uncertain";
  }

  if (speed <= ETA_ENGINE.stoppedEnterKmh) {
    if (tracker.candidateStoppedSinceMs == null) {
      tracker.candidateStoppedSinceMs = nowMs;
    }
    if (nowMs - tracker.candidateStoppedSinceMs >= ETA_ENGINE.stoppedConfirmMs) {
      tracker.movementState = "stopped";
      return tracker.movementState;
    }
  } else {
    tracker.candidateStoppedSinceMs = null;
  }

  if (tracker.movementState === "stopped") {
    if (speed >= ETA_ENGINE.stoppedExitKmh) {
      tracker.movementState = speed >= ETA_ENGINE.movingEnterKmh ? "moving" : "slow";
    }
    return tracker.movementState;
  }

  if (speed >= ETA_ENGINE.movingEnterKmh) {
    tracker.movementState = "moving";
  } else if (speed > ETA_ENGINE.stoppedEnterKmh) {
    tracker.movementState = "slow";
  }
  return tracker.movementState;
}

/**
 * Ingest a ping into the per-trip tracker. Returns whether the point was trusted.
 */
export function ingestTripGpsSample(input: {
  tripId: string;
  latitude: number;
  longitude: number;
  capturedAtMs: number;
  accuracyM?: number | null;
  /** Device-reported speed (km/h), optional. */
  reportedSpeedKmh?: number | null;
  nowMs?: number;
}): {
  trusted: boolean;
  rejectReason?: GpsTrustResult extends { ok: false; reason: infer R } ? R : never;
  tracker: TripEtaTracker;
} {
  const nowMs = input.nowMs ?? Date.now();
  let tracker = trackers.get(input.tripId);
  if (!tracker) {
    tracker = emptyTracker(nowMs);
    trackers.set(input.tripId, tracker);
  }

  const trust = evaluateGpsTrust({
    previous: tracker.lastTrusted,
    next: {
      latitude: input.latitude,
      longitude: input.longitude,
      capturedAtMs: input.capturedAtMs,
      accuracyM: input.accuracyM,
    },
  });

  if (!trust.ok) {
    updateMovementState(tracker, nowMs);
    tracker.updatedAtMs = nowMs;
    return {
      trusted: false,
      rejectReason: trust.reason as "jump" | "stale_timestamp" | "bad_coords",
      tracker,
    };
  }

  tracker.lastTrusted = trust.location;

  const candidates: number[] = [];
  if (
    trust.impliedSpeedKmh != null &&
    trust.impliedSpeedKmh >= ETA_ENGINE.minUsableGpsSpeedKmh &&
    trust.impliedSpeedKmh <= ETA_ENGINE.maxUsableSpeedKmh
  ) {
    candidates.push(trust.impliedSpeedKmh);
  }
  if (
    input.reportedSpeedKmh != null &&
    Number.isFinite(input.reportedSpeedKmh) &&
    input.reportedSpeedKmh >= ETA_ENGINE.minUsableGpsSpeedKmh &&
    input.reportedSpeedKmh <= ETA_ENGINE.maxUsableSpeedKmh
  ) {
    candidates.push(input.reportedSpeedKmh);
  }
  if (candidates.length > 0) {
    const sample = candidates.reduce((a, b) => a + b, 0) / candidates.length;
    tracker.speedSamples.push({ kmh: clampSpeedKmh(sample), atMs: nowMs });
  } else if (trust.impliedSpeedKmh != null && trust.impliedSpeedKmh < ETA_ENGINE.minUsableGpsSpeedKmh) {
    tracker.speedSamples.push({ kmh: 0, atMs: nowMs });
  }

  pruneSamples(tracker, nowMs);
  tracker.effectiveSpeedKmh = recomputeEffectiveSpeed(tracker);
  updateMovementState(tracker, nowMs);
  tracker.updatedAtMs = nowMs;
  return { trusted: true, tracker };
}

/**
 * Remaining distance along ordered stop sequence to the destination stop.
 * Falls back to crow-flies when stop geometry is incomplete.
 */
export function remainingDistanceAlongStopsM(input: {
  bus: LatLng;
  orderedStops: Array<LatLng & { id: string }>;
  destinationStopId: string;
}): { distanceM: number; method: "stop_legs" | "crow_flies" } {
  const { bus, orderedStops, destinationStopId } = input;
  const destIdx = orderedStops.findIndex((s) => s.id === destinationStopId);
  if (destIdx < 0 || orderedStops.length === 0) {
    return { distanceM: 0, method: "crow_flies" };
  }

  // Nearest stop among those at/before destination (prefer upcoming).
  let nearestIdx = 0;
  let nearestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i <= destIdx; i++) {
    const s = orderedStops[i]!;
    const d = haversineMeters(bus, s);
    if (d < nearestDist) {
      nearestDist = d;
      nearestIdx = i;
    }
  }

  // If bus is past the destination on sequence, crow-flies to destination.
  if (nearestIdx > destIdx) {
    const dest = orderedStops[destIdx]!;
    return { distanceM: haversineMeters(bus, dest), method: "crow_flies" };
  }

  let remaining = haversineMeters(bus, orderedStops[nearestIdx]!);
  for (let i = nearestIdx; i < destIdx; i++) {
    remaining += haversineMeters(orderedStops[i]!, orderedStops[i + 1]!);
  }
  return { distanceM: remaining, method: "stop_legs" };
}

export type StableEtaResult = {
  etaMinutes: number | null;
  rawEtaMinutes: number;
  distanceM: number;
  effectiveSpeedKmh: number;
  movementState: MovementState;
  confidence: EtaConfidence;
  distanceMethod: "stop_legs" | "crow_flies";
  /** Parent-facing hint when ETA should not look hyper-precise. */
  displayMode: "eta" | "stopped" | "stale" | "uncertain";
};

function confidenceFor(tracker: TripEtaTracker, nowMs: number): EtaConfidence {
  if (tracker.movementState === "gps_stale") return "low";
  if (tracker.movementState === "gps_uncertain") return "low";
  if (tracker.speedSamples.length < 3) return "medium";
  const age = tracker.lastTrusted
    ? nowMs - tracker.lastTrusted.capturedAtMs
    : Number.POSITIVE_INFINITY;
  if (age > 45_000) return "medium";
  return "high";
}

/**
 * Compute smoothed ETA minutes to a destination stop for a trip.
 */
export function computeStableEta(input: {
  tripId: string;
  stopId: string;
  bus: LatLng;
  orderedStops: Array<LatLng & { id: string }>;
  destinationStopId: string;
  crowFliesFallbackM?: number;
  nowMs?: number;
}): StableEtaResult {
  const nowMs = input.nowMs ?? Date.now();
  let tracker = trackers.get(input.tripId);
  if (!tracker) {
    tracker = emptyTracker(nowMs);
    trackers.set(input.tripId, tracker);
  }

  const along = remainingDistanceAlongStopsM({
    bus: input.bus,
    orderedStops: input.orderedStops,
    destinationStopId: input.destinationStopId,
  });
  let distanceM = along.distanceM;
  if (
    (!Number.isFinite(distanceM) || distanceM <= 0) &&
    input.crowFliesFallbackM != null
  ) {
    distanceM = input.crowFliesFallbackM;
  }

  const speed = Math.max(
    ETA_ENGINE.minUsableGpsSpeedKmh,
    tracker.effectiveSpeedKmh || ETA_ENGINE.defaultSpeedKmh,
  );
  const speedMPerMin = (speed * 1000) / 60;
  let rawEta =
    !Number.isFinite(distanceM) || distanceM <= 0
      ? 0
      : Math.max(1, Math.ceil(distanceM / speedMPerMin));

  // Stopped + still far: do not collapse to "1 min".
  if (
    tracker.movementState === "stopped" &&
    distanceM > ETA_ENGINE.nearStopDistanceM
  ) {
    const last = tracker.lastEtaByStop.get(input.stopId);
    rawEta = last ?? rawEta;
  }

  const previous = tracker.lastEtaByStop.get(input.stopId);
  let etaMinutes = rawEta;
  if (previous != null && Number.isFinite(previous)) {
    const minAllowed = previous - ETA_ENGINE.maxEtaDropPerUpdateMin;
    const maxAllowed = previous + ETA_ENGINE.maxEtaRisePerUpdateMin;
    etaMinutes = Math.min(maxAllowed, Math.max(minAllowed, rawEta));
  }

  // Only publish / remember ETA when we have a trusted location.
  if (tracker.lastTrusted) {
    tracker.lastEtaByStop.set(input.stopId, etaMinutes);
  }

  const confidence = confidenceFor(tracker, nowMs);
  let displayMode: StableEtaResult["displayMode"] = "eta";
  if (tracker.movementState === "gps_stale") displayMode = "stale";
  else if (tracker.movementState === "gps_uncertain") displayMode = "uncertain";
  else if (
    tracker.movementState === "stopped" &&
    distanceM > ETA_ENGINE.nearStopDistanceM
  ) {
    displayMode = "stopped";
  }

  return {
    etaMinutes: displayMode === "stale" ? null : etaMinutes,
    rawEtaMinutes: rawEta,
    distanceM: Math.round(distanceM),
    effectiveSpeedKmh: Math.round(tracker.effectiveSpeedKmh * 10) / 10,
    movementState: tracker.movementState,
    confidence,
    distanceMethod: along.method,
    displayMode,
  };
}

/** Keep legacy helper semantics but prefer engine when possible. */
export function etaMinutesFromEffectiveSpeed(
  distanceM: number,
  speedKmh: number,
): number {
  if (!Number.isFinite(distanceM) || distanceM <= 0) return 0;
  const speed = Math.max(
    ETA_ENGINE.minUsableGpsSpeedKmh,
    Number.isFinite(speedKmh) && speedKmh > 0
      ? speedKmh
      : ETA_ENGINE.defaultSpeedKmh,
  );
  return Math.max(1, Math.ceil(distanceM / ((speed * 1000) / 60)));
}
