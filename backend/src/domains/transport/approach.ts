import type { SupabaseClient } from "@supabase/supabase-js";
import { emitNotificationForInstituteSystem } from "../notifications/service.js";
import { listLinksForStudentIds } from "../parents/repository.js";
import { findStopById, listEnrollments } from "./repository.js";
import { etaMinutesFromDistance, haversineMeters } from "./geo.js";
import type { TransportTripRow } from "./ops-types.js";

export type ApproachSnapshot = {
  stopId: string;
  stopName: string;
  distanceM: number;
  withinRadius: boolean;
  etaMinutes: number;
};

async function guardianUserIdsForStudent(
  admin: SupabaseClient,
  instituteId: string,
  studentId: string,
): Promise<string[]> {
  const links = await listLinksForStudentIds(admin, [studentId], instituteId);
  const parentIds = [...new Set(links.map((l) => l.parent_id))];
  if (parentIds.length === 0) return [];
  const result = await admin
    .from("parent")
    .select("user_profile_id")
    .eq("institute_id", instituteId)
    .in("id", parentIds)
    .is("deleted_at", null);
  const rows = (result.data ?? []) as Array<{ user_profile_id: string | null }>;
  return [
    ...new Set(
      rows
        .map((r) => r.user_profile_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
}

/**
 * On each GPS ping: if the bus enters a pickup stop's notification radius,
 * notify guardians once per trip×student (dedupe_key).
 */
export async function evaluateApproachAlertsOnPing(
  admin: SupabaseClient,
  trip: TransportTripRow,
  location: { latitude: number; longitude: number },
  createdByUserId: string,
): Promise<void> {
  const enrollments = (await listEnrollments(admin, trip.institute_id)).filter(
    (e) => e.route_id === trip.route_id && e.approval_status === "approved",
  );
  if (enrollments.length === 0) return;

  for (const enrollment of enrollments) {
    const stop = await findStopById(admin, enrollment.pickup_stop_id);
    if (
      !stop ||
      stop.latitude == null ||
      stop.longitude == null ||
      !Number.isFinite(Number(stop.latitude)) ||
      !Number.isFinite(Number(stop.longitude))
    ) {
      continue;
    }
    const distanceM = haversineMeters(location, {
      latitude: Number(stop.latitude),
      longitude: Number(stop.longitude),
    });
    const radius = Math.max(50, Number(stop.notification_radius_m) || 150);
    if (distanceM > radius) continue;

    const recipients = await guardianUserIdsForStudent(
      admin,
      trip.institute_id,
      enrollment.student_id,
    );
    if (recipients.length === 0) continue;

    const etaMinutes = etaMinutesFromDistance(distanceM);
    try {
      await emitNotificationForInstituteSystem(admin, createdByUserId, {
        instituteId: trip.institute_id,
        category: "transport",
        priority: "important",
        title: "Bus approaching",
        body: `The bus is about ${etaMinutes} min away from ${stop.name}.`,
        deepLink: "/transport",
        dedupeKey: `transport:approach5:${trip.id}:${enrollment.student_id}`,
        recipientUserIds: recipients,
        payload: {
          tripId: trip.id,
          studentId: enrollment.student_id,
          stopId: stop.id,
          distanceM: Math.round(distanceM),
          etaMinutes,
          kind: "approach5",
        },
      });
    } catch {
      // Non-fatal — location ping already persisted
    }
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
  },
): Promise<ApproachSnapshot | null> {
  const enrollments = await listEnrollments(admin, input.instituteId, [
    input.studentId,
  ]);
  const enrollment = enrollments.find(
    (e) => e.route_id === input.routeId && e.deleted_at == null,
  );
  if (!enrollment) return null;
  const stop = await findStopById(admin, enrollment.pickup_stop_id);
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
  const radius = Math.max(50, Number(stop.notification_radius_m) || 150);
  return {
    stopId: stop.id,
    stopName: stop.name,
    distanceM: Math.round(distanceM),
    withinRadius: distanceM <= radius,
    etaMinutes: etaMinutesFromDistance(distanceM),
  };
}
