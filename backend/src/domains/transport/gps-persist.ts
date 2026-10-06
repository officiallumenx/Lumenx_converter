/**
 * GPS write thinning — keep live tracking fresh without storing every 15s ping.
 *
 * Persist when the bus moved enough OR the heartbeat interval elapsed.
 * Approach evaluation still runs on skipped writes (caller responsibility).
 */

import { haversineMeters } from "./geo.js";

/** Minimum movement (m) to force a new vehicle_location row. */
export const GPS_PERSIST_MIN_MOVE_M = 25;
/** Always persist at least once per this interval (stale GPS / heartbeat). */
export const GPS_PERSIST_MAX_INTERVAL_MS = 60_000;

export type GpsPersistDecision = {
  shouldPersist: boolean;
  reason: "first" | "moved" | "heartbeat" | "thinned";
  distanceM: number | null;
  ageMs: number | null;
};

export function shouldPersistGpsSample(input: {
  previous: {
    latitude: number;
    longitude: number;
    capturedAt: string;
  } | null;
  next: { latitude: number; longitude: number; capturedAt: string };
  nowMs?: number;
  minMoveM?: number;
  maxIntervalMs?: number;
}): GpsPersistDecision {
  const minMoveM = input.minMoveM ?? GPS_PERSIST_MIN_MOVE_M;
  const maxIntervalMs = input.maxIntervalMs ?? GPS_PERSIST_MAX_INTERVAL_MS;
  if (!input.previous) {
    return {
      shouldPersist: true,
      reason: "first",
      distanceM: null,
      ageMs: null,
    };
  }

  const distanceM = haversineMeters(
    {
      latitude: input.previous.latitude,
      longitude: input.previous.longitude,
    },
    { latitude: input.next.latitude, longitude: input.next.longitude },
  );
  const prevAt = Date.parse(input.previous.capturedAt);
  const nextAt = Date.parse(input.next.capturedAt);
  const ageMs = Number.isFinite(prevAt)
    ? Math.max(0, (Number.isFinite(nextAt) ? nextAt : (input.nowMs ?? Date.now())) - prevAt)
    : maxIntervalMs;

  if (distanceM >= minMoveM) {
    return { shouldPersist: true, reason: "moved", distanceM, ageMs };
  }
  if (ageMs >= maxIntervalMs) {
    return { shouldPersist: true, reason: "heartbeat", distanceM, ageMs };
  }
  return { shouldPersist: false, reason: "thinned", distanceM, ageMs };
}
