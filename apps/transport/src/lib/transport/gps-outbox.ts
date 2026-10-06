/**
 * Trip GPS capture + ping timer.
 * Persistence / retry / idempotency live in ops-outbox (Phase 8).
 */

import { captureCurrentGps, GpsCaptureError } from "./capture-gps";
import { getTripSessionSnapshot, subscribeTripSession } from "./trip/store";
import {
  enqueueOpsEvent,
  flushOpsOutbox,
  getOpsOutboxSnapshot,
  subscribeOpsOutbox,
  type OpsOutboxSnapshot,
} from "./ops-outbox";

export type GpsOutboxConnectionState =
  | "online"
  | "degraded"
  | "offline"
  | "gps_error";

export type GpsOutboxSnapshot = {
  events: OpsOutboxSnapshot["events"];
  pendingCount: number;
  connection: GpsOutboxConnectionState;
  lastError: string | null;
  lastSentAt: string | null;
  lastGpsError: string | null;
};

const PING_INTERVAL_MS = 15_000;
const MAX_ACCURACY_M = 500;
const WARN_ACCURACY_M = 100;
/** Client-side thin: skip enqueue when barely moved unless heartbeat elapsed. */
const CLIENT_MIN_MOVE_M = 20;
const CLIENT_HEARTBEAT_MS = 60_000;

type Listener = () => void;
const listeners = new Set<Listener>();

let pingTimer: ReturnType<typeof setInterval> | null = null;
let lastGpsError: string | null = null;
let connection: GpsOutboxConnectionState = "online";
let lastEnqueuedFix: {
  latitude: number;
  longitude: number;
  capturedAt: string;
} | null = null;

function haversineMetersClient(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function shouldEnqueueClientFix(fix: {
  latitude: number;
  longitude: number;
  capturedAt: string;
}): boolean {
  if (!lastEnqueuedFix) return true;
  const distanceM = haversineMetersClient(lastEnqueuedFix, fix);
  const ageMs =
    Date.parse(fix.capturedAt) - Date.parse(lastEnqueuedFix.capturedAt);
  if (distanceM >= CLIENT_MIN_MOVE_M) return true;
  if (!Number.isFinite(ageMs) || ageMs >= CLIENT_HEARTBEAT_MS) return true;
  return false;
}

function emit() {
  listeners.forEach((l) => l());
}

function deriveConnection(): GpsOutboxConnectionState {
  if (lastGpsError && connection === "gps_error") return "gps_error";
  const ops = getOpsOutboxSnapshot();
  if (!ops.online) return "offline";
  if (ops.pendingCount > 0 && ops.lastError) return "degraded";
  if (ops.pendingCount > 0) return "degraded";
  return "online";
}

export function subscribeGpsOutbox(listener: Listener): () => void {
  listeners.add(listener);
  const unsubOps = subscribeOpsOutbox(() => {
    connection = deriveConnection();
    emit();
  });
  return () => {
    listeners.delete(listener);
    unsubOps();
  };
}

export function getGpsOutboxSnapshot(): GpsOutboxSnapshot {
  const ops = getOpsOutboxSnapshot();
  const gpsEvents = ops.events.filter((e) => e.eventType === "gps");
  connection = deriveConnection();
  return {
    events: gpsEvents,
    pendingCount: gpsEvents.length,
    connection,
    lastError: ops.lastError,
    lastSentAt: ops.lastGpsUploadedAt,
    lastGpsError,
  };
}

function enqueueFix(
  trip: { tripId: string; driverId: string; vehicleId: string },
  fix: {
    latitude: number;
    longitude: number;
    accuracyM: number | null;
    capturedAt: string;
  },
) {
  if (
    fix.accuracyM != null &&
    Number.isFinite(fix.accuracyM) &&
    fix.accuracyM > MAX_ACCURACY_M
  ) {
    lastGpsError = `GPS accuracy too poor (±${Math.round(fix.accuracyM)}m). Move outdoors.`;
    connection = "gps_error";
    emit();
    return;
  }
  if (
    fix.accuracyM != null &&
    Number.isFinite(fix.accuracyM) &&
    fix.accuracyM > WARN_ACCURACY_M
  ) {
    lastGpsError = `Weak GPS (±${Math.round(fix.accuracyM)}m) — still sending`;
  } else {
    lastGpsError = null;
  }

  if (!shouldEnqueueClientFix(fix)) {
    connection = deriveConnection();
    emit();
    return;
  }

  lastEnqueuedFix = {
    latitude: fix.latitude,
    longitude: fix.longitude,
    capturedAt: fix.capturedAt,
  };

  enqueueOpsEvent({
    eventType: "gps",
    tripId: trip.tripId,
    capturedAt: fix.capturedAt,
    payload: {
      latitude: fix.latitude,
      longitude: fix.longitude,
      accuracyM: fix.accuracyM,
      driverId: trip.driverId,
      vehicleId: trip.vehicleId,
    },
  });
  connection = deriveConnection();
  emit();
}

async function captureAndEnqueue(): Promise<void> {
  const trip = getTripSessionSnapshot();
  if (!trip.tripId || trip.phase === "completed" || trip.phase === "ready") return;
  const driverId = trip.assignment.driver.id;
  const vehicleId = trip.vehicleId ?? trip.assignment.bus.vehicleId;
  if (!driverId || !vehicleId) {
    lastGpsError = "Trip driver/vehicle missing — cannot queue GPS";
    connection = "gps_error";
    emit();
    return;
  }

  try {
    const fix = await captureCurrentGps({ allowDemo: false });
    enqueueFix(
      { tripId: trip.tripId, driverId, vehicleId },
      {
        latitude: fix.latitude,
        longitude: fix.longitude,
        accuracyM: fix.accuracyM ?? null,
        capturedAt: fix.capturedAt,
      },
    );
  } catch (err) {
    const message =
      err instanceof GpsCaptureError
        ? err.message
        : err instanceof Error
          ? err.message
          : "GPS unavailable";
    lastGpsError = message;
    connection = "gps_error";
    emit();
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("lumenx-transport-gps-error", { detail: { message } }),
      );
    }
  }
}

export function startTripGpsPing() {
  stopTripGpsPing();
  void captureAndEnqueue();
  pingTimer = setInterval(() => {
    void captureAndEnqueue();
  }, PING_INTERVAL_MS);
  void flushOpsOutbox();
}

export function stopTripGpsPing() {
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
  lastEnqueuedFix = null;
}

export async function flushGpsOutboxNow(): Promise<void> {
  await flushOpsOutbox();
}

if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      const trip = getTripSessionSnapshot();
      if (trip.tripId && trip.phase !== "completed" && trip.phase !== "ready") {
        void captureAndEnqueue();
        void flushOpsOutbox();
      }
    }
  });

  subscribeTripSession(() => {
    const trip = getTripSessionSnapshot();
    if (trip.tripId && trip.phase !== "completed" && trip.phase !== "ready") {
      if (!pingTimer) startTripGpsPing();
    } else {
      stopTripGpsPing();
      void flushGpsOutboxNow();
    }
  });
}
