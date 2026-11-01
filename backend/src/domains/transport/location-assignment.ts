/**
 * Driver common-location reassignment + trip-start promote/snapshot.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import { requireInstituteId } from "../../authorization/index.js";
import { isDriverForInstitute, isTransportWriter } from "./approval.js";
import { commonLocationWritePair } from "./common-location.js";
import { listActiveDailyExceptionsForStudents } from "./daily-exception-repository.js";
import { findActiveTripForVehicle } from "./ops-repository.js";
import {
  findDriverByUserProfileId,
  findEnrollmentById,
  findRouteById,
  findStopById,
  listEnrollmentsForRoute,
  updateEnrollmentFields,
} from "./repository.js";
import {
  insertEnrollmentLocationChange,
  insertTripParticipants,
  listEnrollmentLocationChanges,
  listTripParticipants,
} from "./trip-participant-repository.js";
import type { TransportTripRow } from "./ops-types.js";
import type { TransportEnrollmentRow } from "./types.js";

function assertStopOnDriverRoute(
  stop: { institute_id: string; route_id: string; deleted_at: string | null },
  enrollment: TransportEnrollmentRow,
): void {
  if (
    stop.deleted_at ||
    stop.institute_id !== enrollment.institute_id ||
    stop.route_id !== enrollment.route_id
  ) {
    throw AppError.validation("Stop is not on this student's route");
  }
}

/** True when the route vehicle has a non-finalized active trip. */
export async function routeHasActiveTrip(
  admin: SupabaseClient,
  route: { vehicle_id: string | null },
): Promise<boolean> {
  if (!route.vehicle_id) return false;
  const active = await findActiveTripForVehicle(admin, route.vehicle_id);
  return Boolean(active && !active.finalized && active.phase !== "completed");
}

/**
 * Promote deferred next_* stop ids onto live pickup/drop for a route, then clear next_*.
 * Called at trip start before snapshotting participants.
 */
export async function promotePendingEnrollmentStopsForRoute(
  admin: SupabaseClient,
  instituteId: string,
  routeId: string,
): Promise<number> {
  const enrollments = await listEnrollmentsForRoute(admin, instituteId, routeId);
  let promoted = 0;
  for (const enrollment of enrollments) {
    const nextPickup = enrollment.next_pickup_stop_id?.trim() || "";
    const nextDrop = enrollment.next_drop_stop_id?.trim() || "";
    if (!nextPickup && !nextDrop) continue;
    const pair = commonLocationWritePair(nextPickup || nextDrop);
    await updateEnrollmentFields(admin, enrollment.id, {
      pickup_stop_id: pair.pickupStopId,
      drop_stop_id: pair.dropStopId,
      next_pickup_stop_id: null,
      next_drop_stop_id: null,
      next_stops_pending_at: null,
    });
    promoted += 1;
  }
  return promoted;
}

/**
 * Snapshot usable enrollments onto transport_trip_participant (idempotent).
 */
export async function snapshotTripParticipants(
  admin: SupabaseClient,
  trip: TransportTripRow,
): Promise<number> {
  const existing = await listTripParticipants(admin, trip.id);
  if (existing.length > 0) return existing.length;

  const enrollments = await listEnrollmentsForRoute(
    admin,
    trip.institute_id,
    trip.route_id,
  );
  // Snapshot includes pending+approved at start; rejected are already excluded from usable
  // via approval filter applied by callers — include all non-rejected active here.
  const usable = enrollments.filter(
    (e) =>
      e.status === "active" &&
      (e.approval_status === "pending" || e.approval_status === "approved"),
  );

  const exceptions = await listActiveDailyExceptionsForStudents(
    admin,
    trip.institute_id,
    trip.trip_date,
    usable.map((e) => e.student_id),
    "NOT_RIDING",
  );
  const exceptionByStudent = new Map(exceptions.map((ex) => [ex.student_id, ex]));

  const rows = usable.map((e) => {
    const ex = exceptionByStudent.get(e.student_id);
    return {
      instituteId: trip.institute_id,
      tripId: trip.id,
      studentId: e.student_id,
      enrollmentId: e.id,
      pickupStopId: e.pickup_stop_id,
      dropStopId: e.drop_stop_id,
      notRiding: Boolean(ex),
      exceptionId: ex?.id ?? null,
    };
  });

  const inserted = await insertTripParticipants(admin, rows);
  return inserted.length;
}

export type ReassignCommonLocationInput = {
  instituteId: string;
  enrollmentIds: string[];
  newStopId: string;
  /** Client idempotency key — optional. */
  clientEventId?: string | null;
};

export type ReassignCommonLocationResult = {
  updatedCount: number;
  effectiveMode: "immediate" | "next_trip";
  enrollmentIds: string[];
  newStopId: string;
};

/**
 * Driver (or staff) sets one common stop for many enrollments.
 * If an active trip exists for the route vehicle → write next_* only.
 * Otherwise promote immediately onto live pickup+drop.
 */
export async function reassignCommonLocationForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: ReassignCommonLocationInput,
): Promise<ReassignCommonLocationResult> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  const enrollmentIds = [...new Set(input.enrollmentIds.map((id) => id.trim()).filter(Boolean))];
  if (enrollmentIds.length === 0) {
    throw AppError.validation("Select at least one student");
  }
  if (enrollmentIds.length > 200) {
    throw AppError.validation("Too many students in one change");
  }
  const newStopId = input.newStopId.trim();
  if (!newStopId) throw AppError.validation("New stop is required");

  const stop = await findStopById(admin, newStopId);
  if (!stop || stop.deleted_at) throw AppError.notFound("Stop not found");
  if (stop.institute_id !== instituteId) {
    throw AppError.forbidden("Stop is outside this institute");
  }

  const writer = isTransportWriter(actor, instituteId);
  let driverId: string | null = null;
  if (!writer) {
    if (!isDriverForInstitute(actor, instituteId)) {
      throw AppError.forbidden("Insufficient permissions");
    }
    const driver = await findDriverByUserProfileId(admin, actor.userId, instituteId);
    if (!driver) throw AppError.forbidden("Driver profile not linked");
    driverId = driver.id;
  }

  const pair = commonLocationWritePair(newStopId);
  const updated: string[] = [];
  let resultMode: "immediate" | "next_trip" = "immediate";

  for (const enrollmentId of enrollmentIds) {
    const enrollment = await findEnrollmentById(admin, enrollmentId);
    if (!enrollment || enrollment.deleted_at) {
      throw AppError.notFound("Enrollment not found");
    }
    if (enrollment.institute_id !== instituteId) {
      throw AppError.forbidden("Enrollment is outside this institute");
    }
    if (enrollment.route_id !== stop.route_id) {
      throw AppError.validation("Stop must belong to the student's route");
    }
    assertStopOnDriverRoute(stop, enrollment);

    const route = await findRouteById(admin, enrollment.route_id);
    if (!route) throw AppError.notFound("Route not found");
    if (!writer) {
      if (route.driver_id !== driverId) {
        throw AppError.forbidden("Enrollment is not on your assigned route");
      }
    }

    const active = await routeHasActiveTrip(admin, route);
    const effectiveMode: "immediate" | "next_trip" = active ? "next_trip" : "immediate";
    if (effectiveMode === "next_trip") resultMode = "next_trip";

    const previousPickup = enrollment.pickup_stop_id;
    const previousDrop = enrollment.drop_stop_id;

    if (effectiveMode === "next_trip") {
      await updateEnrollmentFields(admin, enrollment.id, {
        next_pickup_stop_id: pair.pickupStopId,
        next_drop_stop_id: pair.dropStopId,
        next_stops_pending_at: new Date().toISOString(),
        location_changed_at: new Date().toISOString(),
        location_changed_by_driver_id: driverId,
      });
    } else {
      await updateEnrollmentFields(admin, enrollment.id, {
        pickup_stop_id: pair.pickupStopId,
        drop_stop_id: pair.dropStopId,
        next_pickup_stop_id: null,
        next_drop_stop_id: null,
        next_stops_pending_at: null,
        location_changed_at: new Date().toISOString(),
        location_changed_by_driver_id: driverId,
      });
    }

    await insertEnrollmentLocationChange(admin, {
      instituteId,
      enrollmentId: enrollment.id,
      studentId: enrollment.student_id,
      routeId: enrollment.route_id,
      previousPickupStopId: previousPickup,
      previousDropStopId: previousDrop,
      newStopId: pair.pickupStopId,
      changedByDriverId: driverId,
      changedByUserId: actor.userId,
      effectiveMode,
    });
    updated.push(enrollment.id);
  }

  return {
    updatedCount: updated.length,
    effectiveMode: resultMode,
    enrollmentIds: updated,
    newStopId: pair.pickupStopId,
  };
}

export async function listLocationChangesForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdInput: string,
  limit?: number,
) {
  const instituteId = requireInstituteId(actor, instituteIdInput);
  if (!isTransportWriter(actor, instituteId) && !isDriverForInstitute(actor, instituteId)) {
    throw AppError.forbidden("Insufficient permissions");
  }
  return listEnrollmentLocationChanges(admin, instituteId, limit ?? 100);
}
