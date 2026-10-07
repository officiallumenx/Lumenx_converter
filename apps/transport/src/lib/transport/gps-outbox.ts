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

/** Target ~2–3s live updates for Connect/Admin map. */
const PING_INTERVAL_MS = 2_500;
const MAX_ACCURACY_M = 500;
const WARN_ACCURACY_M = 100;
/** Client-side thin: skip enqueue when barely moved unless heartbeat elapsed. */
const CLIENT_MIN_MOVE_M = 8;
const CLIENT_HEARTBEAT_MS = 2_500;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isServerTripId(value: string | null | undefined): value is string {
  return Boolean(value && UUID_RE.test(value));
}

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
/** Stable for useSyncExternalStore — must be referentially equal until emit(). */
let cachedSnapshot: GpsOutboxSnapshot | null = null;
let opsBridgeAttached = false;

function ensureOpsBridge(): void {
  if (opsBridgeAttached) return;
  opsBridgeAttached = true;
  // One shared bridge for the module lifetime (GPS banner subscribers come and go).
  subscribeOpsOutbox(() => {
    connection = deriveConnection();
    emit();
  });
}

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
  cachedSnapshot = null;
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
  ensureOpsBridge();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Snapshot for LocationTrackingBanner via useSyncExternalStore.
 * MUST return a cached object until emit() — a fresh object each call causes
 * React error #185 (maximum update depth exceeded).
 */
export function getGpsOutboxSnapshot(): GpsOutboxSnapshot {
  if (cachedSnapshot) return cachedSnapshot;
  const ops = getOpsOutboxSnapshot();
  const gpsEvents = ops.events.filter((e) => e.eventType === "gps");
  const nextConnection = deriveConnection();
  connection = nextConnection;
  cachedSnapshot = {
    events: gpsEvents,
    pendingCount: gpsEvents.length,
    connection: nextConnection,
    lastError: ops.lastError,
    lastSentAt: ops.lastGpsUploadedAt,
    lastGpsError,
  };
  return cachedSnapshot;
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
  // Local placeholder ids (e.g. trip-…) fail UUID path validation on the API.
  if (!isServerTripId(trip.tripId)) {
    lastGpsError = "Waiting for server trip id before GPS sync";
    connection = "degraded";
    emit();
    return;
  }
  const driverId = trip.assignment.driver.id;
  const vehicleId = trip.vehicleId ?? trip.assignment.bus.vehicleId;
  if (!driverId || !vehicleId || !isServerTripId(vehicleId)) {
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
      if (
        isServerTripId(trip.tripId) &&
        trip.phase !== "completed" &&
        trip.phase !== "ready" &&
        trip.phase !== "starting"
      ) {
        void captureAndEnqueue();
        void flushOpsOutbox();
      }
    }
  });

  subscribeTripSession(() => {
    const trip = getTripSessionSnapshot();
    if (
      isServerTripId(trip.tripId) &&
      trip.phase !== "completed" &&
      trip.phase !== "ready" &&
      trip.phase !== "starting"
    ) {
      if (!pingTimer) startTripGpsPing();
    } else {
      stopTripGpsPing();
      void flushGpsOutboxNow();
    }
  });
}
