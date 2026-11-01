import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";

export type TransportTripParticipantRow = {
  id: string;
  institute_id: string;
  trip_id: string;
  student_id: string;
  enrollment_id: string;
  pickup_stop_id: string | null;
  drop_stop_id: string | null;
  not_riding: boolean;
  exception_id: string | null;
  created_at: string;
};

const PARTICIPANT_COLS =
  "id, institute_id, trip_id, student_id, enrollment_id, pickup_stop_id, drop_stop_id, not_riding, exception_id, created_at";

export async function listTripParticipants(
  admin: SupabaseClient,
  tripId: string,
): Promise<TransportTripParticipantRow[]> {
  const result = await admin
    .from("transport_trip_participant")
    .select(PARTICIPANT_COLS)
    .eq("trip_id", tripId);
  return ensureDbOk(result) as TransportTripParticipantRow[];
}

export async function insertTripParticipants(
  admin: SupabaseClient,
  rows: Array<{
    instituteId: string;
    tripId: string;
    studentId: string;
    enrollmentId: string;
    pickupStopId: string | null;
    dropStopId: string | null;
    notRiding: boolean;
    exceptionId: string | null;
  }>,
): Promise<TransportTripParticipantRow[]> {
  if (rows.length === 0) return [];
  const payload = rows.map((r) => ({
    institute_id: r.instituteId,
    trip_id: r.tripId,
    student_id: r.studentId,
    enrollment_id: r.enrollmentId,
    pickup_stop_id: r.pickupStopId,
    drop_stop_id: r.dropStopId,
    not_riding: r.notRiding,
    exception_id: r.exceptionId,
  }));
  const result = await admin
    .from("transport_trip_participant")
    .upsert(payload, { onConflict: "trip_id,student_id", ignoreDuplicates: true })
    .select(PARTICIPANT_COLS);
  return ensureDbOk(result) as TransportTripParticipantRow[];
}

export type EnrollmentLocationChangeRow = {
  id: string;
  institute_id: string;
  enrollment_id: string;
  student_id: string;
  route_id: string;
  previous_pickup_stop_id: string | null;
  previous_drop_stop_id: string | null;
  new_stop_id: string;
  changed_by_driver_id: string | null;
  changed_by_user_id: string | null;
  effective_mode: string;
  created_at: string;
};

const CHANGE_COLS =
  "id, institute_id, enrollment_id, student_id, route_id, previous_pickup_stop_id, previous_drop_stop_id, new_stop_id, changed_by_driver_id, changed_by_user_id, effective_mode, created_at";

export async function insertEnrollmentLocationChange(
  admin: SupabaseClient,
  row: {
    instituteId: string;
    enrollmentId: string;
    studentId: string;
    routeId: string;
    previousPickupStopId: string | null;
    previousDropStopId: string | null;
    newStopId: string;
    changedByDriverId: string | null;
    changedByUserId: string | null;
    effectiveMode: "immediate" | "next_trip";
  },
): Promise<EnrollmentLocationChangeRow> {
  const result = await admin
    .from("transport_enrollment_location_change")
    .insert({
      institute_id: row.instituteId,
      enrollment_id: row.enrollmentId,
      student_id: row.studentId,
      route_id: row.routeId,
      previous_pickup_stop_id: row.previousPickupStopId,
      previous_drop_stop_id: row.previousDropStopId,
      new_stop_id: row.newStopId,
      changed_by_driver_id: row.changedByDriverId,
      changed_by_user_id: row.changedByUserId,
      effective_mode: row.effectiveMode,
    })
    .select(CHANGE_COLS)
    .single();
  return ensureDbOk(result) as EnrollmentLocationChangeRow;
}

export async function listEnrollmentLocationChanges(
  admin: SupabaseClient,
  instituteId: string,
  limit = 100,
): Promise<EnrollmentLocationChangeRow[]> {
  const result = await admin
    .from("transport_enrollment_location_change")
    .select(CHANGE_COLS)
    .eq("institute_id", instituteId)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(1, limit), 500));
  return ensureDbOk(result) as EnrollmentLocationChangeRow[];
}
