import type { SupabaseClient } from "@supabase/supabase-js";
import { isOperationallyUsable } from "./approval.js";
import { listNotRidingStudentIds } from "./daily-exception-repository.js";
import {
  findDriverById,
  listEnrollmentsForRoute,
  listStopsForRoute,
} from "./repository.js";
import type { StopRow } from "./types.js";
import { haversineMeters } from "./geo.js";
import {
  computeStableEta,
  ingestTripGpsSample,
  type EtaConfidence,
  type MovementState,
} from "./eta-engine.js";
import type { TransportTripRow } from "./ops-types.js";
import { STOP_RADIUS_DEFAULT_M } from "./stop-radius.js";
import { TRANSPORT_EVENT } from "./transport-events.js";
import {
  emitTransportNotification,
  emitTransportNotificationSafe,
} from "./transport-notification-emit.js";
import {
  deepLinkForTransportEvent,
  transportDedupe,
} from "./transport-notification-severity.js";
import {
  guardianUserIdsForStudents,
  staffUserIdsForInstitute,
} from "./ops-notifications.js";
import { appendTripTimeline } from "./ops-repository.js";

/** Product approach bands (minutes) — once each per trip×student. */
export const APPROACH_THRESHOLDS_MIN = [30, 15, 5] as const;
export type ApproachThresholdMin = (typeof APPROACH_THRESHOLDS_MIN)[number];

/**
 * Spatial prefilter: max distance at which a 30-min band can fire at default
 * urban speed (~500 m/min) plus a buffer for faster buses / large geofences.
 */
export const APPROACH_EVAL_RADIUS_M = 30 * 500 + 2_000;

const ROUTE_STOP_CACHE_TTL_MS = 60_000;
const routeStopCache = new Map<
  string,
  { at: number; stops: StopRow[] }
>();

export type ApproachSnapshot = {
  stopId: string;
  stopName: string;
  distanceM: number;
  withinRadius: boolean;
  /** Smoothed ETA minutes; null when GPS stale / not publishable. */
  etaMinutes: number | null;
  /** Nearest crossed product band, or null when farther than 30 min. */
  band: ApproachThresholdMin | null;
  movementState?: MovementState;
  confidence?: EtaConfidence;
  displayMode?: "eta" | "stopped" | "stale" | "uncertain";
  effectiveSpeedKmh?: number;
};

export function approachBandForEta(
  etaMinutes: number,
): ApproachThresholdMin | null {
  if (!Number.isFinite(etaMinutes) || etaMinutes < 0) return null;
  let band: ApproachThresholdMin | null = null;
  for (const threshold of APPROACH_THRESHOLDS_MIN) {
    if (etaMinutes <= threshold) band = threshold;
  }
  return band;
}

/**
 * Emit only the nearest (tightest) crossed band for this ping.
 * Prevents 30+15+5 fan-out when the first GPS sample already has a low ETA
 * (common right after trip start with default urban speed).
 * Progressive alerts still work across pings via per-band dedupe keys:
 * ETA 25 → 30 once, later ETA 12 → 15 once, later ETA 4 → 5 once.
 */
export function approachThresholdToEmit(
  etaMinutes: number,
): ApproachThresholdMin | null {
  return approachBandForEta(etaMinutes);
}

/** Suppress approach-band spam for a short window after trip start. */
export const APPROACH_START_GRACE_MS = 90_000;

export function isWithinApproachStartGrace(
  startedAt: string | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!startedAt) return false;
  const startedMs = Date.parse(startedAt);
  if (!Number.isFinite(startedMs)) return false;
  return nowMs - startedMs < APPROACH_START_GRACE_MS;
}

/** Resolve stop approach geofence meters from stop.notification_radius_m. */
export function resolveStopGeofenceM(notificationRadiusM: unknown): number {
  const radius = Number(notificationRadiusM);
  return Number.isFinite(radius) && radius > 0 ? radius : STOP_RADIUS_DEFAULT_M;
}

/** True when bus distance is inside the stop notification radius. */
export function isBusWithinStopRadius(
  distanceM: number,
  notificationRadiusM: unknown,
): boolean {
  if (!Number.isFinite(distanceM) || distanceM < 0) return false;
  return distanceM <= resolveStopGeofenceM(notificationRadiusM);
}

/** Pickup vs drop destination for approach / live arrival. */
export type ApproachDestinationMode = "pickup" | "drop";

/**
 * Evening trips and morning drop-phase use drop stops.
 * Morning running/boarding use pickup stops.
 * Decision: slot=evening ⇒ drop trip from start (Start Drop Trip).
 */
export function approachDestinationModeForTrip(trip: {
  phase: string;
  slot: string;
}): ApproachDestinationMode {
  if (trip.phase === "dropping" || trip.slot === "evening") return "drop";
  return "pickup";
}

/** Student stop used for arrival/notifications; null ⇒ skip (no fake arrival). */
export function enrollmentApproachStopId(
  enrollment: {
    pickup_stop_id: string | null;
    drop_stop_id: string | null;
  },
  mode: ApproachDestinationMode,
): string | null {
  return mode === "drop"
    ? enrollment.drop_stop_id
    : enrollment.pickup_stop_id;
}

/** Test helper. */
export function clearApproachRouteStopCache(): void {
  routeStopCache.clear();
}

async function loadRouteStopsCached(
  admin: SupabaseClient,
  routeId: string,
): Promise<StopRow[]> {
  const cached = routeStopCache.get(routeId);
  if (cached && Date.now() - cached.at < ROUTE_STOP_CACHE_TTL_MS) {
    return cached.stops;
  }
  const stops = await listStopsForRoute(admin, routeId);
  routeStopCache.set(routeId, { at: Date.now(), stops });
  return stops;
}

type StopGeom = {
  stop: StopRow;
  latitude: number;
  longitude: number;
  distanceM: number;
  etaMinutes: number;
  withinRadius: boolean;
  studentIds: string[];
};

/**
 * On each GPS ping (route-scoped, spatially filtered):
 * - 30 / 15 / 5 minute approach bands — fire-and-forget (outbox/FCM async)
 * - stop arrival — once per trip×stop; await only the rare arrival emit
 */
export async function evaluateApproachAlertsOnPing(
  admin: SupabaseClient,
  trip: TransportTripRow,
  location: {
    latitude: number;
    longitude: number;
    speedKmh?: number | null;
    accuracyM?: number | null;
    capturedAtMs?: number | null;
  },
  createdByUserId: string,
): Promise<void> {
  const capturedAtMs =
    location.capturedAtMs != null && Number.isFinite(location.capturedAtMs)
      ? location.capturedAtMs
      : Date.now();
  ingestTripGpsSample({
    tripId: trip.id,
    latitude: location.latitude,
    longitude: location.longitude,
    capturedAtMs,
    accuracyM: location.accuracyM,
    reportedSpeedKmh: location.speedKmh,
  });

  const [enrollments, stops] = await Promise.all([
    listEnrollmentsForRoute(admin, trip.institute_id, trip.route_id),
    loadRouteStopsCached(admin, trip.route_id),
  ]);

  const usable = enrollments.filter((e) =>
    isOperationallyUsable(e.approval_status),
  );
  if (usable.length === 0) return;

  const notRiding = await listNotRidingStudentIds(
    admin,
    trip.institute_id,
    trip.trip_date,
    usable.map((e) => e.student_id),
  );

  const orderedStops = [...stops]
    .filter(
      (s) =>
        s.latitude != null &&
        s.longitude != null &&
        Number.isFinite(Number(s.latitude)) &&
        Number.isFinite(Number(s.longitude)),
    )
    .sort((a, b) => (a.route_order ?? 0) - (b.route_order ?? 0))
    .map((s) => ({
      id: s.id,
      latitude: Number(s.latitude),
      longitude: Number(s.longitude),
    }));

  const stopById = new Map(stops.map((s) => [s.id, s]));
  const nearby = new Map<string, StopGeom>();
  const destinationMode = approachDestinationModeForTrip(trip);

  for (const enrollment of usable) {
    if (notRiding.has(enrollment.student_id)) continue;
    const destinationStopId = enrollmentApproachStopId(
      enrollment,
      destinationMode,
    );
    // No stop assignment ⇒ no approach / arrival notifications.
    if (!destinationStopId) continue;
    const stop = stopById.get(destinationStopId);
    if (
      !stop ||
      stop.latitude == null ||
      stop.longitude == null ||
      !Number.isFinite(Number(stop.latitude)) ||
      !Number.isFinite(Number(stop.longitude))
    ) {
      continue;
    }
    const latitude = Number(stop.latitude);
    const longitude = Number(stop.longitude);
    const crowFliesM = haversineMeters(location, { latitude, longitude });
    // Spatial filter: skip students whose stop is far outside approach range.
    if (crowFliesM > APPROACH_EVAL_RADIUS_M) continue;

    const stable = computeStableEta({
      tripId: trip.id,
      stopId: stop.id,
      bus: location,
      orderedStops,
      destinationStopId: stop.id,
      crowFliesFallbackM: crowFliesM,
    });
    const etaMinutes = stable.etaMinutes ?? Number.POSITIVE_INFINITY;
    const withinRadius = isBusWithinStopRadius(
      crowFliesM,
      stop.notification_radius_m,
    );
    const existing = nearby.get(stop.id);
    if (existing) {
      existing.studentIds.push(enrollment.student_id);
      continue;
    }
    nearby.set(stop.id, {
      stop,
      latitude,
      longitude,
      distanceM: stable.distanceM,
      etaMinutes,
      withinRadius,
      studentIds: [enrollment.student_id],
    });
  }

  if (nearby.size === 0) return;

  const candidateStudentIds = [
    ...new Set([...nearby.values()].flatMap((g) => g.studentIds)),
  ];
  const guardiansByStudent = await guardianUserIdsForStudents(
    admin,
    trip.institute_id,
    candidateStudentIds,
  );

  const suppressApproachBands = isWithinApproachStartGrace(trip.started_at);

  // Approach bands — async; never block the GPS request on fanout.
  // One nearest band per student per ping (not every crossed threshold).
  if (!suppressApproachBands) {
    for (const geom of nearby.values()) {
      // Do not fire ETA threshold alerts when ETA is not publishable.
      if (!Number.isFinite(geom.etaMinutes)) continue;
      const threshold = approachThresholdToEmit(geom.etaMinutes);
      if (threshold == null && !geom.withinRadius) continue;
      if (threshold == null) continue;

      for (const studentId of geom.studentIds) {
        const recipients = guardiansByStudent.get(studentId) ?? [];
        if (recipients.length === 0) continue;
        const title =
          threshold <= 5
            ? "Bus is very close to your stop"
            : threshold <= 15
              ? "Bus is approaching your stop"
              : `Bus about ${threshold} min away`;
        emitTransportNotificationSafe(admin, {
          instituteId: trip.institute_id,
          createdByUserId,
          kind: TRANSPORT_EVENT.STOP_APPROACHING,
          approachThresholdMin: threshold,
          title,
          body: `The bus is about ${geom.etaMinutes} min away from ${geom.stop.name}.`,
          deepLink: deepLinkForTransportEvent(
            TRANSPORT_EVENT.STOP_APPROACHING,
            "parent",
          ),
          targetAudience: "parent",
          dedupeKey: transportDedupe.approach(trip.id, studentId, threshold),
          recipientUserIds: recipients,
          payload: {
            tripId: trip.id,
            studentId,
            stopId: geom.stop.id,
            distanceM: Math.round(geom.distanceM),
            etaMinutes: geom.etaMinutes,
            thresholdMin: threshold,
          },
        });
      }
    }
  }

  // Arrival: rare once-per-stop; await create so timeline stays accurate.
  for (const geom of nearby.values()) {
    if (!geom.withinRadius) continue;

    const uniqueParents = [
      ...new Set(
        geom.studentIds.flatMap((id) => guardiansByStudent.get(id) ?? []),
      ),
    ];

    const arrivalCreated = await emitTransportNotification(admin, {
      instituteId: trip.institute_id,
      createdByUserId,
      kind: TRANSPORT_EVENT.STOP_ARRIVED,
      severity: "info",
      softChime: true,
      title: "Bus has arrived at your stop",
      body: "Bus has arrived at your stop.",
      deepLink: deepLinkForTransportEvent(TRANSPORT_EVENT.STOP_ARRIVED, "parent"),
      targetAudience: "parent",
      dedupeKey: transportDedupe.arrived(trip.id, geom.stop.id),
      recipientUserIds: uniqueParents,
      payload: {
        tripId: trip.id,
        stopId: geom.stop.id,
        distanceM: Math.round(geom.distanceM),
        geofenceM: resolveStopGeofenceM(geom.stop.notification_radius_m),
        studentIds: geom.studentIds,
      },
    });

    if (!arrivalCreated.ok) continue;

    const driver = await findDriverById(admin, trip.driver_id);
    if (driver?.user_profile_id) {
      emitTransportNotificationSafe(admin, {
        instituteId: trip.institute_id,
        createdByUserId,
        kind: TRANSPORT_EVENT.STOP_ARRIVED,
        severity: "info",
        softChime: true,
        title: `Bus has arrived at ${geom.stop.name}`,
        body: `Bus has arrived at ${geom.stop.name}`,
        deepLink: deepLinkForTransportEvent(TRANSPORT_EVENT.STOP_ARRIVED, "driver"),
      targetAudience: "driver",
        dedupeKey: `transport:${trip.id}:stop:${geom.stop.id}:arrived:driver`,
        recipientUserIds: [driver.user_profile_id],
        payload: { tripId: trip.id, stopId: geom.stop.id },
      });
    }

    emitTransportNotificationSafe(admin, {
      instituteId: trip.institute_id,
      createdByUserId,
      kind: TRANSPORT_EVENT.STOP_ARRIVED,
      severity: "info",
      title: `Bus arrived at ${geom.stop.name}`,
      body: `Live timeline: bus entered ${geom.stop.name} geofence.`,
      deepLink: deepLinkForTransportEvent(TRANSPORT_EVENT.STOP_ARRIVED, "admin"),
      targetAudience: "admin",
      dedupeKey: `transport:${trip.id}:stop:${geom.stop.id}:arrived:admin`,
      recipientUserIds: await staffUserIdsForInstitute(admin, trip.institute_id),
      payload: { tripId: trip.id, stopId: geom.stop.id },
    });

    await appendTripTimeline(admin, trip.id, {
      id: `evt-arrived-${geom.stop.id}-${Date.now()}`,
      at: new Date().toISOString(),
      kind: TRANSPORT_EVENT.STOP_ARRIVED,
      label: `Arrived at ${geom.stop.name}`,
      stopId: geom.stop.id,
    });
  }
}

/** Live portal helper: distance/ETA to the learner's assigned stop for this trip. */
export async function computeApproachForStudent(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    routeId: string;
    studentId: string;
    latitude: number;
    longitude: number;
    speedKmh?: number | null;
    tripId?: string | null;
    tripPhase?: string | null;
    tripSlot?: string | null;
    accuracyM?: number | null;
    capturedAtMs?: number | null;
  },
): Promise<ApproachSnapshot | null> {
  const enrollments = await listEnrollmentsForRoute(
    admin,
    input.instituteId,
    input.routeId,
  );
  const enrollment = enrollments.find((e) => e.student_id === input.studentId);
  if (!enrollment) return null;

  const mode = approachDestinationModeForTrip({
    phase: input.tripPhase ?? "running",
    slot: input.tripSlot ?? "morning",
  });
  const destinationStopId = enrollmentApproachStopId(enrollment, mode);
  if (!destinationStopId) return null;

  const stops = await loadRouteStopsCached(admin, input.routeId);
  const stop = stops.find((s) => s.id === destinationStopId);
  if (
    !stop ||
    stop.latitude == null ||
    stop.longitude == null ||
    !Number.isFinite(Number(stop.latitude)) ||
    !Number.isFinite(Number(stop.longitude))
  ) {
    return null;
  }
  const crowFliesM = haversineMeters(
    { latitude: input.latitude, longitude: input.longitude },
    {
      latitude: Number(stop.latitude),
      longitude: Number(stop.longitude),
    },
  );
  const geofenceM = resolveStopGeofenceM(stop.notification_radius_m);

  const tripId = input.tripId?.trim() || `route:${input.routeId}`;
  if (input.capturedAtMs != null || input.speedKmh != null) {
    ingestTripGpsSample({
      tripId,
      latitude: input.latitude,
      longitude: input.longitude,
      capturedAtMs: input.capturedAtMs ?? Date.now(),
      accuracyM: input.accuracyM,
      reportedSpeedKmh: input.speedKmh,
    });
  }

  const orderedStops = [...stops]
    .filter(
      (s) =>
        s.latitude != null &&
        s.longitude != null &&
        Number.isFinite(Number(s.latitude)) &&
        Number.isFinite(Number(s.longitude)),
    )
    .sort((a, b) => (a.route_order ?? 0) - (b.route_order ?? 0))
    .map((s) => ({
      id: s.id,
      latitude: Number(s.latitude),
      longitude: Number(s.longitude),
    }));

  const stable = computeStableEta({
    tripId,
    stopId: stop.id,
    bus: { latitude: input.latitude, longitude: input.longitude },
    orderedStops,
    destinationStopId: stop.id,
    crowFliesFallbackM: crowFliesM,
  });
  const etaForBand = stable.etaMinutes ?? Number.POSITIVE_INFINITY;
  return {
    stopId: stop.id,
    stopName: stop.name,
    distanceM: stable.distanceM || Math.round(crowFliesM),
    withinRadius: crowFliesM <= geofenceM,
    etaMinutes: stable.etaMinutes,
    band: Number.isFinite(etaForBand) ? approachBandForEta(etaForBand) : null,
    movementState: stable.movementState,
    confidence: stable.confidence,
    displayMode: stable.displayMode,
    effectiveSpeedKmh: stable.effectiveSpeedKmh,
  };
}
