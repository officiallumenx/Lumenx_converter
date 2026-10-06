import type { SupabaseClient } from "@supabase/supabase-js";
import { isOperationallyUsable } from "./approval.js";
import { listNotRidingStudentIds } from "./daily-exception-repository.js";
import {
  findDriverById,
  listEnrollmentsForRoute,
  listStopsForRoute,
} from "./repository.js";
import type { StopRow } from "./types.js";
import { etaMinutesFromDistance, haversineMeters } from "./geo.js";
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
  etaMinutes: number;
  /** Nearest crossed product band, or null when farther than 30 min. */
  band: ApproachThresholdMin | null;
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
  location: { latitude: number; longitude: number; speedKmh?: number | null },
  createdByUserId: string,
): Promise<void> {
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

  const stopById = new Map(stops.map((s) => [s.id, s]));
  const nearby = new Map<string, StopGeom>();

  for (const enrollment of usable) {
    if (notRiding.has(enrollment.student_id)) continue;
    if (!enrollment.pickup_stop_id) continue;
    const stop = stopById.get(enrollment.pickup_stop_id);
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
    const distanceM = haversineMeters(location, { latitude, longitude });
    // Spatial filter: skip students whose pickup is far outside approach range.
    if (distanceM > APPROACH_EVAL_RADIUS_M) continue;

    const etaMinutes = etaMinutesFromDistance(distanceM, location.speedKmh);
    const withinRadius = isBusWithinStopRadius(
      distanceM,
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
      distanceM,
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

  // Approach bands — async; never block the GPS request on fanout.
  for (const geom of nearby.values()) {
    const crossed = APPROACH_THRESHOLDS_MIN.filter((t) => geom.etaMinutes <= t);
    if (crossed.length === 0 && !geom.withinRadius) continue;

    for (const studentId of geom.studentIds) {
      const recipients = guardiansByStudent.get(studentId) ?? [];
      if (recipients.length === 0) continue;
      for (const threshold of crossed) {
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
          severity: "attention",
          title,
          body: `The bus is about ${geom.etaMinutes} min away from ${geom.stop.name}.`,
          deepLink: deepLinkForTransportEvent(
            TRANSPORT_EVENT.STOP_APPROACHING,
            "parent",
          ),
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

    if (!arrivalCreated) continue;

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
        deepLink: deepLinkForTransportEvent(
          TRANSPORT_EVENT.STOP_ARRIVED,
          "driver",
        ),
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

/** Live portal helper: distance/ETA to the learner's pickup stop. */
export async function computeApproachForStudent(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    routeId: string;
    studentId: string;
    latitude: number;
    longitude: number;
    speedKmh?: number | null;
  },
): Promise<ApproachSnapshot | null> {
  const enrollments = await listEnrollmentsForRoute(
    admin,
    input.instituteId,
    input.routeId,
  );
  const enrollment = enrollments.find((e) => e.student_id === input.studentId);
  if (!enrollment || !enrollment.pickup_stop_id) return null;

  const stops = await loadRouteStopsCached(admin, input.routeId);
  const stop = stops.find((s) => s.id === enrollment.pickup_stop_id);
  if (
    !stop ||
    stop.latitude == null ||
    stop.longitude == null ||
    !Number.isFinite(Number(stop.latitude)) ||
    !Number.isFinite(Number(stop.longitude))
  ) {
    return null;
  }
  const distanceM = haversineMeters(
    { latitude: input.latitude, longitude: input.longitude },
    {
      latitude: Number(stop.latitude),
      longitude: Number(stop.longitude),
    },
  );
  const geofenceM = resolveStopGeofenceM(stop.notification_radius_m);
  const etaMinutes = etaMinutesFromDistance(distanceM, input.speedKmh);
  return {
    stopId: stop.id,
    stopName: stop.name,
    distanceM: Math.round(distanceM),
    withinRadius: distanceM <= geofenceM,
    etaMinutes,
    band: approachBandForEta(etaMinutes),
  };
}
