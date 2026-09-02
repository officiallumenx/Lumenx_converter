import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteAccess,
  requireInstituteId,
} from "../../authorization/index.js";
import { findStudentById, listGuardianStudentIds } from "../students/repository.js";
import { isDriverForInstitute, isTransportWriter } from "./approval.js";
import {
  findDriverById,
  findDriverByUserProfileId,
  findRouteById,
  findStopById,
  findVehicleById,
  listStopsForRoute,
} from "./repository.js";
import {
  finalizeBoardingForTrip,
  findActiveTripForStudent,
  findActiveTripForVehicle,
  findBoardingEvent,
  findEmergencyById,
  findLatestLocationForTrip,
  findOpenEmergencyForVehicle,
  findTripById,
  insertEmergency,
  insertTrip,
  insertVehicleLocation,
  listBoardingEventsForTrip,
  listEmergencies,
  listTrips,
  toTripPhasePatch,
  updateEmergencyFields,
  updateTripFields,
  upsertBoardingEvent,
} from "./ops-repository.js";
import type {
  BoardingStatus,
  CreateEmergencyInput,
  DroppingStatus,
  EmergencyStatus,
  LearnerTransportLiveDto,
  StartTripInput,
  TransportBoardingEventDto,
  TransportBoardingEventRow,
  TransportEmergencyDto,
  TransportEmergencyRow,
  TransportTripDto,
  TransportTripRow,
  UpdateTripPhaseInput,
  UpsertBoardingInput,
  UpsertDroppingInput,
  VehicleLocationDto,
} from "./ops-types.js";
import {
  TRANSPORT_STAFF_READ_ROLES,
  TRANSPORT_WRITE_ROLES,
} from "./service.js";

function isStaffReader(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  const membership = actor.memberships.find((m) => m.instituteId === instituteId);
  if (!membership) return false;
  return TRANSPORT_STAFF_READ_ROLES.some((role) => membership.roles.includes(role));
}

function assertTransportStaffReader(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  if (!isStaffReader(actor, instituteId)) {
    throw AppError.forbidden("Insufficient permissions");
  }
}

function assertTransportWriter(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  const membership = actor.memberships.find((m) => m.instituteId === instituteId);
  if (!membership) throw AppError.forbidden("Insufficient permissions");
  const allowed = TRANSPORT_WRITE_ROLES.some((role) => membership.roles.includes(role));
  if (!allowed) throw AppError.forbidden("Insufficient permissions");
}

async function resolveLinkedStudentIds(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
): Promise<Set<string>> {
  const ids = new Set<string>();
  for (const s of actor.students) {
    if (s.instituteId === instituteId) ids.add(s.studentId);
  }
  for (const p of actor.parents.filter((x) => x.instituteId === instituteId)) {
    const linked = await listGuardianStudentIds(admin, p.parentId, instituteId);
    for (const id of linked) ids.add(id);
  }
  return ids;
}

async function assertDriverForTrip(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
  driverId: string,
): Promise<void> {
  if (isTransportWriter(actor, instituteId)) return;
  if (!isDriverForInstitute(actor, instituteId)) {
    throw AppError.forbidden("Insufficient permissions");
  }
  const driver = await findDriverByUserProfileId(admin, actor.userId, instituteId);
  if (!driver || driver.id !== driverId) {
    throw AppError.forbidden("Insufficient permissions");
  }
}

async function enrichTrip(
  admin: SupabaseClient,
  row: TransportTripRow,
): Promise<TransportTripDto> {
  const [route, vehicle, driver] = await Promise.all([
    findRouteById(admin, row.route_id),
    findVehicleById(admin, row.vehicle_id),
    findDriverById(admin, row.driver_id),
  ]);
  return toTripDto(row, {
    routeName: route?.name ?? null,
    vehicleNumber: vehicle?.vehicle_number ?? null,
    driverName: driver?.display_name ?? null,
  });
}

export function toTripDto(
  row: TransportTripRow,
  extra?: {
    routeName?: string | null;
    vehicleNumber?: string | null;
    driverName?: string | null;
  },
): TransportTripDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    routeId: row.route_id,
    vehicleId: row.vehicle_id,
    driverId: row.driver_id,
    slot: row.slot,
    tripDate: row.trip_date,
    phase: row.phase,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    currentStopId: row.current_stop_id,
    currentStopIndex: row.current_stop_index,
    finalized: row.finalized,
    routeName: extra?.routeName ?? null,
    vehicleNumber: extra?.vehicleNumber ?? null,
    driverName: extra?.driverName ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toBoardingDto(
  row: TransportBoardingEventRow,
  extra?: { studentName?: string | null; stopName?: string | null },
): TransportBoardingEventDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    tripId: row.trip_id,
    studentId: row.student_id,
    stopId: row.stop_id,
    boardingStatus: row.boarding_status,
    droppingStatus: row.dropping_status,
    boardedAt: row.boarded_at,
    droppedAt: row.dropped_at,
    finalized: row.finalized,
    studentName: extra?.studentName ?? null,
    stopName: extra?.stopName ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toEmergencyDto(
  row: TransportEmergencyRow,
  extra?: {
    driverName?: string | null;
    vehicleNumber?: string | null;
    routeName?: string | null;
  },
): TransportEmergencyDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    tripId: row.trip_id,
    driverId: row.driver_id,
    vehicleId: row.vehicle_id,
    emergencyType: row.emergency_type,
    status: row.status,
    latitude: row.latitude,
    longitude: row.longitude,
    note: row.note,
    acknowledgedAt: row.acknowledged_at,
    resolvedAt: row.resolved_at,
    resolveNote: row.resolve_note,
    timeline: row.timeline ?? [],
    driverName: extra?.driverName ?? null,
    vehicleNumber: extra?.vehicleNumber ?? null,
    routeName: extra?.routeName ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toLocationDto(row: {
  id: string;
  institute_id: string;
  trip_id: string;
  vehicle_id: string;
  latitude: number;
  longitude: number;
  accuracy_m: number | null;
  captured_at: string;
}): VehicleLocationDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    tripId: row.trip_id,
    vehicleId: row.vehicle_id,
    latitude: row.latitude,
    longitude: row.longitude,
    accuracyM: row.accuracy_m,
    capturedAt: row.captured_at,
  };
}

async function enrichBoarding(
  admin: SupabaseClient,
  row: TransportBoardingEventRow,
): Promise<TransportBoardingEventDto> {
  const [student, stop] = await Promise.all([
    findStudentById(admin, row.student_id),
    findStopById(admin, row.stop_id),
  ]);
  return toBoardingDto(row, {
    studentName: student?.display_name ?? null,
    stopName: stop?.name ?? null,
  });
}

async function enrichEmergency(
  admin: SupabaseClient,
  row: TransportEmergencyRow,
): Promise<TransportEmergencyDto> {
  const [driver, vehicle, trip] = await Promise.all([
    findDriverById(admin, row.driver_id),
    findVehicleById(admin, row.vehicle_id),
    row.trip_id ? findTripById(admin, row.trip_id) : Promise.resolve(null),
  ]);
  let routeName: string | null = null;
  if (trip) {
    const route = await findRouteById(admin, trip.route_id);
    routeName = route?.name ?? null;
  }
  return toEmergencyDto(row, {
    driverName: driver?.display_name ?? null,
    vehicleNumber: vehicle?.vehicle_number ?? null,
    routeName,
  });
}

async function getTripOrThrow(
  admin: SupabaseClient,
  tripId: string,
): Promise<TransportTripRow> {
  const trip = await findTripById(admin, tripId);
  if (!trip) throw AppError.notFound("Trip not found");
  return trip;
}

export async function listTripsForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
  tripDate?: string,
): Promise<TransportTripDto[]> {
  const id = requireInstituteId(actor, instituteId);
  assertTransportStaffReader(actor, id);
  const rows = await listTrips(admin, id, tripDate);
  return Promise.all(rows.map((row) => enrichTrip(admin, row)));
}

export async function getTripForActor(
  admin: SupabaseClient,
  actor: Actor,
  tripId: string,
): Promise<TransportTripDto> {
  const trip = await getTripOrThrow(admin, tripId);
  assertInstituteAccess(actor, trip.institute_id);
  assertTransportStaffReader(actor, trip.institute_id);
  return enrichTrip(admin, trip);
}

export async function getActiveTripForVehicleForActor(
  admin: SupabaseClient,
  actor: Actor,
  vehicleId: string,
): Promise<TransportTripDto | null> {
  const vehicle = await findVehicleById(admin, vehicleId);
  if (!vehicle) throw AppError.notFound("Vehicle not found");
  assertInstituteAccess(actor, vehicle.institute_id);
  if (isDriverForInstitute(actor, vehicle.institute_id)) {
    const driver = await findDriverByUserProfileId(
      admin,
      actor.userId,
      vehicle.institute_id,
    );
    if (!driver) throw AppError.forbidden("Insufficient permissions");
  } else {
    assertTransportStaffReader(actor, vehicle.institute_id);
  }
  const trip = await findActiveTripForVehicle(admin, vehicleId);
  if (!trip) return null;
  return enrichTrip(admin, trip);
}

export async function startTripForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: StartTripInput,
): Promise<TransportTripDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  await assertDriverForTrip(admin, actor, instituteId, input.driverId);

  const route = await findRouteById(admin, input.routeId);
  if (!route || route.institute_id !== instituteId) {
    throw AppError.notFound("Route not found");
  }
  if (route.approval_status !== "approved") {
    throw AppError.conflict("Route is not approved");
  }

  const existing = await findActiveTripForVehicle(admin, input.vehicleId);
  if (existing) {
    throw AppError.conflict("Vehicle already has an active trip");
  }

  const trip = await insertTrip(admin, { ...input, instituteId });
  return enrichTrip(admin, trip);
}

export async function updateTripPhaseForActor(
  admin: SupabaseClient,
  actor: Actor,
  tripId: string,
  input: UpdateTripPhaseInput,
): Promise<TransportTripDto> {
  const trip = await getTripOrThrow(admin, tripId);
  await assertDriverForTrip(admin, actor, trip.institute_id, trip.driver_id);
  if (trip.finalized || trip.phase === "completed") {
    throw AppError.conflict("Trip is already completed");
  }

  const updated = await updateTripFields(
    admin,
    tripId,
    toTripPhasePatch(input),
  );
  if (!updated) throw AppError.notFound("Trip not found");
  return enrichTrip(admin, updated);
}

export async function endTripForActor(
  admin: SupabaseClient,
  actor: Actor,
  tripId: string,
): Promise<TransportTripDto> {
  const trip = await getTripOrThrow(admin, tripId);
  await assertDriverForTrip(admin, actor, trip.institute_id, trip.driver_id);
  if (trip.finalized || trip.phase === "completed") {
    throw AppError.conflict("Trip is already completed");
  }

  await finalizeBoardingForTrip(admin, tripId);
  const updated = await updateTripFields(admin, tripId, {
    phase: "completed",
    completed_at: new Date().toISOString(),
    finalized: true,
  });
  if (!updated) throw AppError.notFound("Trip not found");
  return enrichTrip(admin, updated);
}

export async function listBoardingForTripForActor(
  admin: SupabaseClient,
  actor: Actor,
  tripId: string,
): Promise<TransportBoardingEventDto[]> {
  const trip = await getTripOrThrow(admin, tripId);
  assertInstituteAccess(actor, trip.institute_id);
  assertTransportStaffReader(actor, trip.institute_id);
  const rows = await listBoardingEventsForTrip(admin, tripId);
  return Promise.all(rows.map((row) => enrichBoarding(admin, row)));
}

export async function upsertBoardingForActor(
  admin: SupabaseClient,
  actor: Actor,
  tripId: string,
  input: UpsertBoardingInput,
): Promise<TransportBoardingEventDto> {
  const trip = await getTripOrThrow(admin, tripId);
  await assertDriverForTrip(admin, actor, trip.institute_id, trip.driver_id);
  if (trip.finalized || trip.phase === "completed") {
    throw AppError.conflict("Trip is already completed");
  }

  const now = new Date().toISOString();
  const row = await upsertBoardingEvent(admin, {
    instituteId: trip.institute_id,
    tripId,
    studentId: input.studentId,
    stopId: input.stopId,
    boardingStatus: input.boardingStatus,
    boardedAt:
      input.boardingStatus === "boarded"
        ? now
        : input.boardingStatus === "not_boarded"
          ? null
          : undefined,
  });
  return enrichBoarding(admin, row);
}

export async function upsertDroppingForActor(
  admin: SupabaseClient,
  actor: Actor,
  tripId: string,
  input: UpsertDroppingInput,
): Promise<TransportBoardingEventDto> {
  const trip = await getTripOrThrow(admin, tripId);
  await assertDriverForTrip(admin, actor, trip.institute_id, trip.driver_id);
  if (trip.finalized || trip.phase === "completed") {
    throw AppError.conflict("Trip is already completed");
  }

  const now = new Date().toISOString();
  const row = await upsertBoardingEvent(admin, {
    instituteId: trip.institute_id,
    tripId,
    studentId: input.studentId,
    stopId: input.stopId,
    droppingStatus: input.droppingStatus,
    droppedAt:
      input.droppingStatus === "dropped"
        ? now
        : input.droppingStatus === "not_dropped"
          ? null
          : undefined,
  });
  return enrichBoarding(admin, row);
}

export async function listEmergenciesForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
  status?: EmergencyStatus,
): Promise<TransportEmergencyDto[]> {
  const id = requireInstituteId(actor, instituteId);
  assertTransportStaffReader(actor, id);
  const rows = await listEmergencies(admin, id, status);
  return Promise.all(rows.map((row) => enrichEmergency(admin, row)));
}

export async function createEmergencyForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateEmergencyInput,
): Promise<TransportEmergencyDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  await assertDriverForTrip(admin, actor, instituteId, input.driverId);

  const open = await findOpenEmergencyForVehicle(admin, input.vehicleId);
  if (open) {
    throw AppError.conflict("An emergency is already open for this vehicle");
  }

  const row = await insertEmergency(admin, { ...input, instituteId });
  return enrichEmergency(admin, row);
}

export async function acknowledgeEmergencyForActor(
  admin: SupabaseClient,
  actor: Actor,
  emergencyId: string,
): Promise<TransportEmergencyDto> {
  const emergency = await findEmergencyById(admin, emergencyId);
  if (!emergency) throw AppError.notFound("Emergency not found");
  assertTransportWriter(actor, emergency.institute_id);
  if (emergency.status !== "active") {
    throw AppError.conflict("Emergency is not active");
  }

  const now = new Date().toISOString();
  const timeline = [
    ...(emergency.timeline ?? []),
    { id: `evt-${Date.now()}`, at: now, label: "Acknowledged by admin" },
  ];
  const updated = await updateEmergencyFields(admin, emergencyId, {
    status: "acknowledged",
    acknowledged_at: now,
    acknowledged_by_user_id: actor.userId,
    timeline,
  });
  if (!updated) throw AppError.notFound("Emergency not found");
  return enrichEmergency(admin, updated);
}

export async function resolveEmergencyForActor(
  admin: SupabaseClient,
  actor: Actor,
  emergencyId: string,
  resolveNote?: string | null,
): Promise<TransportEmergencyDto> {
  const emergency = await findEmergencyById(admin, emergencyId);
  if (!emergency) throw AppError.notFound("Emergency not found");
  assertTransportWriter(actor, emergency.institute_id);
  if (emergency.status === "resolved") {
    throw AppError.conflict("Emergency is already resolved");
  }

  const now = new Date().toISOString();
  const timeline = [
    ...(emergency.timeline ?? []),
    {
      id: `evt-${Date.now()}`,
      at: now,
      label: "Resolved by admin",
      note: resolveNote?.trim() || undefined,
    },
  ];
  const updated = await updateEmergencyFields(admin, emergencyId, {
    status: "resolved",
    resolved_at: now,
    resolved_by_user_id: actor.userId,
    resolve_note: resolveNote?.trim() || null,
    timeline,
  });
  if (!updated) throw AppError.notFound("Emergency not found");
  return enrichEmergency(admin, updated);
}

export async function pingLocationForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: {
    tripId: string;
    latitude: number;
    longitude: number;
    accuracyM?: number | null;
  },
): Promise<VehicleLocationDto> {
  const trip = await getTripOrThrow(admin, input.tripId);
  await assertDriverForTrip(admin, actor, trip.institute_id, trip.driver_id);
  if (trip.finalized || trip.phase === "completed") {
    throw AppError.conflict("Trip is already completed");
  }

  const row = await insertVehicleLocation(admin, {
    instituteId: trip.institute_id,
    tripId: input.tripId,
    vehicleId: trip.vehicle_id,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracyM: input.accuracyM ?? null,
  });
  return toLocationDto(row);
}

export async function getLearnerTransportLiveForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: { instituteId: string; studentId: string },
): Promise<LearnerTransportLiveDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertInstituteAccess(actor, instituteId);

  const linked = await resolveLinkedStudentIds(admin, actor, instituteId);
  const isStaff = isStaffReader(actor, instituteId);
  if (!isStaff && !linked.has(input.studentId)) {
    throw AppError.forbidden("Insufficient permissions");
  }

  const tripRow = await findActiveTripForStudent(
    admin,
    instituteId,
    input.studentId,
  );
  const activeTrip = tripRow ? await enrichTrip(admin, tripRow) : null;

  let boarding: TransportBoardingEventDto | null = null;
  if (tripRow) {
    const boardingRow = await findBoardingEvent(
      admin,
      tripRow.id,
      input.studentId,
    );
    boarding = boardingRow ? await enrichBoarding(admin, boardingRow) : null;
  }

  let openEmergency: TransportEmergencyDto | null = null;
  let latestLocation: VehicleLocationDto | null = null;
  if (tripRow) {
    const emergencyRow = await findOpenEmergencyForVehicle(
      admin,
      tripRow.vehicle_id,
    );
    openEmergency = emergencyRow
      ? await enrichEmergency(admin, emergencyRow)
      : null;
    const locationRow = await findLatestLocationForTrip(admin, tripRow.id);
    latestLocation = locationRow ? toLocationDto(locationRow) : null;
  }

  return { activeTrip, boarding, openEmergency, latestLocation };
}

export async function getOpenEmergencyForVehicleForActor(
  admin: SupabaseClient,
  actor: Actor,
  vehicleId: string,
): Promise<TransportEmergencyDto | null> {
  const vehicle = await findVehicleById(admin, vehicleId);
  if (!vehicle) throw AppError.notFound("Vehicle not found");
  assertInstituteAccess(actor, vehicle.institute_id);
  if (isDriverForInstitute(actor, vehicle.institute_id)) {
    const driver = await findDriverByUserProfileId(
      admin,
      actor.userId,
      vehicle.institute_id,
    );
    if (!driver) throw AppError.forbidden("Insufficient permissions");
  } else {
    assertTransportStaffReader(actor, vehicle.institute_id);
  }
  const row = await findOpenEmergencyForVehicle(admin, vehicleId);
  if (!row) return null;
  return enrichEmergency(admin, row);
}

export async function listBoardingMarksForInstituteForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
  tripDate?: string,
): Promise<TransportBoardingEventDto[]> {
  const id = requireInstituteId(actor, instituteId);
  assertTransportStaffReader(actor, id);
  const trips = await listTrips(admin, id, tripDate);
  const all: TransportBoardingEventRow[] = [];
  for (const trip of trips) {
    const marks = await listBoardingEventsForTrip(admin, trip.id);
    all.push(...marks);
  }
  return Promise.all(all.map((row) => enrichBoarding(admin, row)));
}
