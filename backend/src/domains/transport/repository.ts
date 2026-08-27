import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  CreateDriverInput,
  CreateEnrollmentInput,
  CreateRouteInput,
  CreateStopInput,
  CreateVehicleInput,
  DriverRow,
  RouteRow,
  StopRow,
  TransportEnrollmentRow,
  TransportSettingsRow,
  UpdateDriverInput,
  UpdateEnrollmentInput,
  UpdateRouteInput,
  UpdateStopInput,
  UpdateVehicleInput,
  UpsertTransportSettingsInput,
  VehicleRow,
} from "./types.js";

const VEHICLE_COLS =
  "id, institute_id, vehicle_number, registration_number, capacity, status, notes, created_at, updated_at, deleted_at";

const DRIVER_COLS =
  "id, institute_id, user_profile_id, display_name, phone, license_number, license_expiry, status, notes, created_at, updated_at, deleted_at";

const ROUTE_COLS =
  "id, institute_id, name, vehicle_id, driver_id, status, config_status, locked_at, locked_by_user_id, setup_finished_at, created_at, updated_at, deleted_at";

const STOP_COLS =
  "id, institute_id, route_id, name, location_label, latitude, longitude, route_order, notification_radius_m, created_at, updated_at, deleted_at";

const ENROLLMENT_COLS =
  "id, institute_id, student_id, route_id, pickup_stop_id, drop_stop_id, status, created_at, updated_at, deleted_at";

const SETTINGS_COLS =
  "institute_id, default_notification_radius_m, default_pickup_buffer_mins, working_days, created_at, updated_at";

// ── Vehicles ─────────────────────────────────────────────────────

export async function listVehicles(
  admin: SupabaseClient,
  instituteId: string,
): Promise<VehicleRow[]> {
  const result = await admin
    .from("vehicle")
    .select(VEHICLE_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  return ensureDbOk(result) as VehicleRow[];
}

export async function findVehicleById(
  admin: SupabaseClient,
  id: string,
): Promise<VehicleRow | null> {
  const result = await admin
    .from("vehicle")
    .select(VEHICLE_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as VehicleRow | null) ?? null;
}

export async function insertVehicle(
  admin: SupabaseClient,
  input: CreateVehicleInput,
): Promise<VehicleRow> {
  const result = await admin
    .from("vehicle")
    .insert({
      institute_id: input.instituteId,
      vehicle_number: input.vehicleNumber,
      registration_number: input.registrationNumber,
      capacity: input.capacity,
      status: input.status ?? "active",
      notes: input.notes ?? null,
    })
    .select(VEHICLE_COLS)
    .single();
  return ensureDbOk(result) as VehicleRow;
}

export async function updateVehicleFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<VehicleRow | null> {
  const result = await admin
    .from("vehicle")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(VEHICLE_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as VehicleRow | null) ?? null;
}

export async function softDeleteVehicle(
  admin: SupabaseClient,
  id: string,
): Promise<VehicleRow | null> {
  const result = await admin
    .from("vehicle")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(VEHICLE_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as VehicleRow | null) ?? null;
}

export function toVehicleUpdatePatch(
  input: UpdateVehicleInput,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (input.vehicleNumber !== undefined) patch.vehicle_number = input.vehicleNumber;
  if (input.registrationNumber !== undefined) {
    patch.registration_number = input.registrationNumber;
  }
  if (input.capacity !== undefined) patch.capacity = input.capacity;
  if (input.status !== undefined) patch.status = input.status;
  if (input.notes !== undefined) patch.notes = input.notes;
  return patch;
}

// ── Drivers ──────────────────────────────────────────────────────

export async function listDrivers(
  admin: SupabaseClient,
  instituteId: string,
): Promise<DriverRow[]> {
  const result = await admin
    .from("driver")
    .select(DRIVER_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  return ensureDbOk(result) as DriverRow[];
}

export async function findDriverById(
  admin: SupabaseClient,
  id: string,
): Promise<DriverRow | null> {
  const result = await admin
    .from("driver")
    .select(DRIVER_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as DriverRow | null) ?? null;
}

export async function insertDriver(
  admin: SupabaseClient,
  input: CreateDriverInput,
): Promise<DriverRow> {
  const result = await admin
    .from("driver")
    .insert({
      institute_id: input.instituteId,
      user_profile_id: null,
      display_name: input.displayName,
      phone: input.phone,
      license_number: input.licenseNumber,
      license_expiry: input.licenseExpiry ?? null,
      status: input.status ?? "active",
      notes: input.notes ?? null,
    })
    .select(DRIVER_COLS)
    .single();
  return ensureDbOk(result) as DriverRow;
}

export async function updateDriverFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<DriverRow | null> {
  const result = await admin
    .from("driver")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(DRIVER_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as DriverRow | null) ?? null;
}

export async function softDeleteDriver(
  admin: SupabaseClient,
  id: string,
): Promise<DriverRow | null> {
  const result = await admin
    .from("driver")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(DRIVER_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as DriverRow | null) ?? null;
}

export function toDriverUpdatePatch(
  input: UpdateDriverInput,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (input.displayName !== undefined) patch.display_name = input.displayName;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.licenseNumber !== undefined) patch.license_number = input.licenseNumber;
  if (input.licenseExpiry !== undefined) patch.license_expiry = input.licenseExpiry;
  if (input.status !== undefined) patch.status = input.status;
  if (input.notes !== undefined) patch.notes = input.notes;
  return patch;
}

// ── Routes ───────────────────────────────────────────────────────

export async function listRoutes(
  admin: SupabaseClient,
  instituteId: string,
): Promise<RouteRow[]> {
  const result = await admin
    .from("route")
    .select(ROUTE_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  return ensureDbOk(result) as RouteRow[];
}

export async function findRouteById(
  admin: SupabaseClient,
  id: string,
): Promise<RouteRow | null> {
  const result = await admin
    .from("route")
    .select(ROUTE_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as RouteRow | null) ?? null;
}

export async function insertRoute(
  admin: SupabaseClient,
  input: CreateRouteInput,
): Promise<RouteRow> {
  const result = await admin
    .from("route")
    .insert({
      institute_id: input.instituteId,
      name: input.name,
      vehicle_id: input.vehicleId ?? null,
      driver_id: input.driverId ?? null,
      status: input.status ?? "active",
      config_status: input.configStatus ?? "not_configured",
    })
    .select(ROUTE_COLS)
    .single();
  return ensureDbOk(result) as RouteRow;
}

export async function updateRouteFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<RouteRow | null> {
  const result = await admin
    .from("route")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(ROUTE_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as RouteRow | null) ?? null;
}

export async function softDeleteRoute(
  admin: SupabaseClient,
  id: string,
): Promise<RouteRow | null> {
  const result = await admin
    .from("route")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(ROUTE_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as RouteRow | null) ?? null;
}

export function toRouteUpdatePatch(
  input: UpdateRouteInput,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.vehicleId !== undefined) patch.vehicle_id = input.vehicleId;
  if (input.driverId !== undefined) patch.driver_id = input.driverId;
  if (input.status !== undefined) patch.status = input.status;
  if (input.configStatus !== undefined) patch.config_status = input.configStatus;
  return patch;
}

// ── Stops ────────────────────────────────────────────────────────

export async function listStopsForRoute(
  admin: SupabaseClient,
  routeId: string,
): Promise<StopRow[]> {
  const result = await admin
    .from("stop")
    .select(STOP_COLS)
    .eq("route_id", routeId)
    .is("deleted_at", null);
  return ensureDbOk(result) as StopRow[];
}

export async function findStopById(
  admin: SupabaseClient,
  id: string,
): Promise<StopRow | null> {
  const result = await admin
    .from("stop")
    .select(STOP_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as StopRow | null) ?? null;
}

export async function insertStop(
  admin: SupabaseClient,
  input: CreateStopInput,
): Promise<StopRow> {
  const result = await admin
    .from("stop")
    .insert({
      institute_id: input.instituteId,
      route_id: input.routeId,
      name: input.name,
      location_label: input.locationLabel,
      latitude: input.latitude,
      longitude: input.longitude,
      route_order: input.routeOrder,
      notification_radius_m: input.notificationRadiusM ?? 150,
    })
    .select(STOP_COLS)
    .single();
  return ensureDbOk(result) as StopRow;
}

export async function updateStopFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<StopRow | null> {
  const result = await admin
    .from("stop")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(STOP_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as StopRow | null) ?? null;
}

export async function softDeleteStop(
  admin: SupabaseClient,
  id: string,
): Promise<StopRow | null> {
  const result = await admin
    .from("stop")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(STOP_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as StopRow | null) ?? null;
}

export function toStopUpdatePatch(
  input: UpdateStopInput,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.locationLabel !== undefined) patch.location_label = input.locationLabel;
  if (input.latitude !== undefined) patch.latitude = input.latitude;
  if (input.longitude !== undefined) patch.longitude = input.longitude;
  if (input.routeOrder !== undefined) patch.route_order = input.routeOrder;
  if (input.notificationRadiusM !== undefined) {
    patch.notification_radius_m = input.notificationRadiusM;
  }
  return patch;
}

// ── Enrollments ──────────────────────────────────────────────────

export async function listEnrollments(
  admin: SupabaseClient,
  instituteId: string,
  studentIds?: string[],
): Promise<TransportEnrollmentRow[]> {
  let query = admin
    .from("transport_enrollment")
    .select(ENROLLMENT_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  if (studentIds) {
    if (studentIds.length === 0) return [];
    query = query.in("student_id", studentIds);
  }
  const result = await query;
  return ensureDbOk(result) as TransportEnrollmentRow[];
}

export async function findEnrollmentById(
  admin: SupabaseClient,
  id: string,
): Promise<TransportEnrollmentRow | null> {
  const result = await admin
    .from("transport_enrollment")
    .select(ENROLLMENT_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as TransportEnrollmentRow | null) ?? null;
}

export async function insertEnrollment(
  admin: SupabaseClient,
  input: CreateEnrollmentInput,
): Promise<TransportEnrollmentRow> {
  const result = await admin
    .from("transport_enrollment")
    .insert({
      institute_id: input.instituteId,
      student_id: input.studentId,
      route_id: input.routeId,
      pickup_stop_id: input.pickupStopId,
      drop_stop_id: input.dropStopId,
      status: input.status ?? "active",
    })
    .select(ENROLLMENT_COLS)
    .single();
  return ensureDbOk(result) as TransportEnrollmentRow;
}

export async function updateEnrollmentFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<TransportEnrollmentRow | null> {
  const result = await admin
    .from("transport_enrollment")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(ENROLLMENT_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as TransportEnrollmentRow | null) ?? null;
}

export async function softDeleteEnrollment(
  admin: SupabaseClient,
  id: string,
): Promise<TransportEnrollmentRow | null> {
  const result = await admin
    .from("transport_enrollment")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(ENROLLMENT_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as TransportEnrollmentRow | null) ?? null;
}

export function toEnrollmentUpdatePatch(
  input: UpdateEnrollmentInput,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (input.routeId !== undefined) patch.route_id = input.routeId;
  if (input.pickupStopId !== undefined) patch.pickup_stop_id = input.pickupStopId;
  if (input.dropStopId !== undefined) patch.drop_stop_id = input.dropStopId;
  if (input.status !== undefined) patch.status = input.status;
  return patch;
}

// ── Settings ─────────────────────────────────────────────────────

export async function findTransportSettings(
  admin: SupabaseClient,
  instituteId: string,
): Promise<TransportSettingsRow | null> {
  const result = await admin
    .from("transport_settings")
    .select(SETTINGS_COLS)
    .eq("institute_id", instituteId)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  const row = result.data as TransportSettingsRow | null;
  if (!row) return null;
  return {
    ...row,
    working_days: row.working_days ?? [1, 2, 3, 4, 5],
  };
}

export async function upsertTransportSettings(
  admin: SupabaseClient,
  input: UpsertTransportSettingsInput,
): Promise<TransportSettingsRow> {
  const existing = await findTransportSettings(admin, input.instituteId);
  if (existing) {
    const patch: Record<string, unknown> = {};
    if (input.defaultNotificationRadiusM !== undefined) {
      patch.default_notification_radius_m = input.defaultNotificationRadiusM;
    }
    if (input.defaultPickupBufferMins !== undefined) {
      patch.default_pickup_buffer_mins = input.defaultPickupBufferMins;
    }
    if (input.workingDays !== undefined) {
      patch.working_days = input.workingDays;
    }
    if (Object.keys(patch).length === 0) return existing;
    const result = await admin
      .from("transport_settings")
      .update(patch)
      .eq("institute_id", input.instituteId)
      .select(SETTINGS_COLS)
      .single();
    const row = ensureDbOk(result) as TransportSettingsRow;
    return {
      ...row,
      working_days: row.working_days ?? [1, 2, 3, 4, 5],
    };
  }

  const result = await admin
    .from("transport_settings")
    .insert({
      institute_id: input.instituteId,
      default_notification_radius_m: input.defaultNotificationRadiusM ?? 150,
      default_pickup_buffer_mins: input.defaultPickupBufferMins ?? 5,
      working_days: input.workingDays ?? [1, 2, 3, 4, 5],
    })
    .select(SETTINGS_COLS)
    .single();
  const row = ensureDbOk(result) as TransportSettingsRow;
  return {
    ...row,
    working_days: row.working_days ?? [1, 2, 3, 4, 5],
  };
}
