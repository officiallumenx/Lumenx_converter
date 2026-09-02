import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  BoardingStatus,
  CreateEmergencyInput,
  DroppingStatus,
  EmergencyStatus,
  StartTripInput,
  TransportBoardingEventRow,
  TransportEmergencyRow,
  TransportTripRow,
  TripPhase,
  UpdateTripPhaseInput,
  VehicleLocationRow,
} from "./ops-types.js";

const TRIP_COLS =
  "id, institute_id, route_id, vehicle_id, driver_id, slot, trip_date, phase, started_at, completed_at, current_stop_id, current_stop_index, finalized, created_at, updated_at, deleted_at";

const BOARDING_COLS =
  "id, institute_id, trip_id, student_id, stop_id, boarding_status, dropping_status, boarded_at, dropped_at, finalized, created_at, updated_at";

const EMERGENCY_COLS =
  "id, institute_id, trip_id, driver_id, vehicle_id, emergency_type, status, latitude, longitude, note, acknowledged_at, acknowledged_by_user_id, resolved_at, resolved_by_user_id, resolve_note, timeline, created_at, updated_at, deleted_at";

const LOCATION_COLS =
  "id, institute_id, trip_id, vehicle_id, latitude, longitude, accuracy_m, captured_at";

export async function listTrips(
  admin: SupabaseClient,
  instituteId: string,
  tripDate?: string,
): Promise<TransportTripRow[]> {
  let query = admin
    .from("transport_trip")
    .select(TRIP_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  if (tripDate) query = query.eq("trip_date", tripDate);
  const result = await query.order("created_at", { ascending: false });
  return ensureDbOk(result) as TransportTripRow[];
}

export async function findTripById(
  admin: SupabaseClient,
  id: string,
): Promise<TransportTripRow | null> {
  const result = await admin
    .from("transport_trip")
    .select(TRIP_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as TransportTripRow | null) ?? null;
}

export async function findActiveTripForVehicle(
  admin: SupabaseClient,
  vehicleId: string,
): Promise<TransportTripRow | null> {
  const result = await admin
    .from("transport_trip")
    .select(TRIP_COLS)
    .eq("vehicle_id", vehicleId)
    .eq("finalized", false)
    .neq("phase", "completed")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as TransportTripRow | null) ?? null;
}

export async function insertTrip(
  admin: SupabaseClient,
  input: StartTripInput,
): Promise<TransportTripRow> {
  const result = await admin
    .from("transport_trip")
    .insert({
      institute_id: input.instituteId,
      route_id: input.routeId,
      vehicle_id: input.vehicleId,
      driver_id: input.driverId,
      slot: input.slot ?? "morning",
      trip_date: input.tripDate ?? new Date().toISOString().slice(0, 10),
      phase: "starting",
      started_at: new Date().toISOString(),
      finalized: false,
      current_stop_index: 0,
    })
    .select(TRIP_COLS)
    .single();
  return ensureDbOk(result) as TransportTripRow;
}

export async function updateTripFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<TransportTripRow | null> {
  const result = await admin
    .from("transport_trip")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(TRIP_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as TransportTripRow | null) ?? null;
}

export function toTripPhasePatch(
  input: UpdateTripPhaseInput,
): Record<string, unknown> {
  const patch: Record<string, unknown> = { phase: input.phase };
  if (input.currentStopId !== undefined) patch.current_stop_id = input.currentStopId;
  if (input.currentStopIndex !== undefined) {
    patch.current_stop_index = input.currentStopIndex;
  }
  if (input.phase === "running" || input.phase === "boarding") {
    patch.started_at = patch.started_at ?? new Date().toISOString();
  }
  if (input.phase === "completed") {
    patch.completed_at = new Date().toISOString();
    patch.finalized = true;
  }
  return patch;
}

export async function listBoardingEventsForTrip(
  admin: SupabaseClient,
  tripId: string,
): Promise<TransportBoardingEventRow[]> {
  const result = await admin
    .from("transport_boarding_event")
    .select(BOARDING_COLS)
    .eq("trip_id", tripId);
  return ensureDbOk(result) as TransportBoardingEventRow[];
}

export async function findBoardingEvent(
  admin: SupabaseClient,
  tripId: string,
  studentId: string,
): Promise<TransportBoardingEventRow | null> {
  const result = await admin
    .from("transport_boarding_event")
    .select(BOARDING_COLS)
    .eq("trip_id", tripId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as TransportBoardingEventRow | null) ?? null;
}

export async function upsertBoardingEvent(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    tripId: string;
    studentId: string;
    stopId: string;
    boardingStatus?: BoardingStatus;
    droppingStatus?: DroppingStatus;
    boardedAt?: string | null;
    droppedAt?: string | null;
    finalized?: boolean;
  },
): Promise<TransportBoardingEventRow> {
  const existing = await findBoardingEvent(admin, input.tripId, input.studentId);
  if (existing) {
    const patch: Record<string, unknown> = { stop_id: input.stopId };
    if (input.boardingStatus !== undefined) {
      patch.boarding_status = input.boardingStatus;
      patch.boarded_at = input.boardedAt ?? null;
    }
    if (input.droppingStatus !== undefined) {
      patch.dropping_status = input.droppingStatus;
      patch.dropped_at = input.droppedAt ?? null;
    }
    if (input.finalized !== undefined) patch.finalized = input.finalized;
    const result = await admin
      .from("transport_boarding_event")
      .update(patch)
      .eq("id", existing.id)
      .select(BOARDING_COLS)
      .single();
    return ensureDbOk(result) as TransportBoardingEventRow;
  }

  const result = await admin
    .from("transport_boarding_event")
    .insert({
      institute_id: input.instituteId,
      trip_id: input.tripId,
      student_id: input.studentId,
      stop_id: input.stopId,
      boarding_status: input.boardingStatus ?? "pending",
      dropping_status: input.droppingStatus ?? "pending",
      boarded_at: input.boardedAt ?? null,
      dropped_at: input.droppedAt ?? null,
      finalized: input.finalized ?? false,
    })
    .select(BOARDING_COLS)
    .single();
  return ensureDbOk(result) as TransportBoardingEventRow;
}

export async function finalizeBoardingForTrip(
  admin: SupabaseClient,
  tripId: string,
): Promise<void> {
  const result = await admin
    .from("transport_boarding_event")
    .update({ finalized: true })
    .eq("trip_id", tripId);
  ensureDbOk(result);
}

export async function listEmergencies(
  admin: SupabaseClient,
  instituteId: string,
  status?: EmergencyStatus,
): Promise<TransportEmergencyRow[]> {
  let query = admin
    .from("transport_emergency")
    .select(EMERGENCY_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  if (status) query = query.eq("status", status);
  const result = await query.order("created_at", { ascending: false });
  return ensureDbOk(result) as TransportEmergencyRow[];
}

export async function findEmergencyById(
  admin: SupabaseClient,
  id: string,
): Promise<TransportEmergencyRow | null> {
  const result = await admin
    .from("transport_emergency")
    .select(EMERGENCY_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as TransportEmergencyRow | null) ?? null;
}

export async function findOpenEmergencyForVehicle(
  admin: SupabaseClient,
  vehicleId: string,
): Promise<TransportEmergencyRow | null> {
  const result = await admin
    .from("transport_emergency")
    .select(EMERGENCY_COLS)
    .eq("vehicle_id", vehicleId)
    .in("status", ["active", "acknowledged"])
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as TransportEmergencyRow | null) ?? null;
}

export async function insertEmergency(
  admin: SupabaseClient,
  input: CreateEmergencyInput,
): Promise<TransportEmergencyRow> {
  const now = new Date().toISOString();
  const result = await admin
    .from("transport_emergency")
    .insert({
      institute_id: input.instituteId,
      trip_id: input.tripId ?? null,
      driver_id: input.driverId,
      vehicle_id: input.vehicleId,
      emergency_type: input.emergencyType ?? "general",
      status: "active",
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      note: input.note ?? null,
      timeline: [
        { id: "evt-1", at: now, label: "SOS triggered", note: input.note ?? undefined },
      ],
    })
    .select(EMERGENCY_COLS)
    .single();
  return ensureDbOk(result) as TransportEmergencyRow;
}

export async function updateEmergencyFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<TransportEmergencyRow | null> {
  const result = await admin
    .from("transport_emergency")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(EMERGENCY_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as TransportEmergencyRow | null) ?? null;
}

export async function insertVehicleLocation(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    tripId: string;
    vehicleId: string;
    latitude: number;
    longitude: number;
    accuracyM?: number | null;
  },
): Promise<VehicleLocationRow> {
  const result = await admin
    .from("vehicle_location")
    .insert({
      institute_id: input.instituteId,
      trip_id: input.tripId,
      vehicle_id: input.vehicleId,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy_m: input.accuracyM ?? null,
      captured_at: new Date().toISOString(),
    })
    .select(LOCATION_COLS)
    .single();
  return ensureDbOk(result) as VehicleLocationRow;
}

export async function findLatestLocationForTrip(
  admin: SupabaseClient,
  tripId: string,
): Promise<VehicleLocationRow | null> {
  const result = await admin
    .from("vehicle_location")
    .select(LOCATION_COLS)
    .eq("trip_id", tripId)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as VehicleLocationRow | null) ?? null;
}

export async function listBoardingEventsForInstitute(
  admin: SupabaseClient,
  instituteId: string,
): Promise<TransportBoardingEventRow[]> {
  const result = await admin
    .from("transport_boarding_event")
    .select(BOARDING_COLS)
    .eq("institute_id", instituteId)
    .order("created_at", { ascending: false });
  return ensureDbOk(result) as TransportBoardingEventRow[];
}

export async function findActiveTripForStudent(
  admin: SupabaseClient,
  instituteId: string,
  studentId: string,
): Promise<TransportTripRow | null> {
  const enrollResult = await admin
    .from("transport_enrollment")
    .select("route_id")
    .eq("institute_id", instituteId)
    .eq("student_id", studentId)
    .eq("approval_status", "approved")
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();
  if (enrollResult.error) ensureDbOk(enrollResult);
  const enrollment = enrollResult.data as { route_id: string } | null;
  if (!enrollment) return null;

  const result = await admin
    .from("transport_trip")
    .select(TRIP_COLS)
    .eq("institute_id", instituteId)
    .eq("route_id", enrollment.route_id)
    .eq("finalized", false)
    .neq("phase", "completed")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as TransportTripRow | null) ?? null;
}
