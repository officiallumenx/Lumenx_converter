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
  assertAuthenticatedDriverId,
  assertBoardingTargetAllowed,
  assertDriverCanAccessTripRow,
  assertDriverCanAccessVehicle,
  assertDriverCanStartTrip,
  assertDriverOwnsTrip,
  assertDriverOwnsVehicle,
  isDriverOnlyActor,
  isElevatedTransportReader,
  resolveAuthenticatedDriver,
} from "./access.js";
import {
  findDriverById,
  findDriverByUserProfileId,
  findRouteById,
  findStopById,
  findTransportSettings,
  findVehicleById,
  listDriverAnalyticsRows,
  listEnrollmentAnalyticsRows,
  listEnrollments,
  listRouteAnalyticsRows,
  listStopAnalyticsRows,
  listStopsForRoute,
  listVehicleAnalyticsRows,
} from "./repository.js";
import {
  finalizeBoardingForTrip,
  findActiveTripForStudent,
  findActiveTripForVehicle,
  findBoardingEvent,
  findEmergencyByClientEventId,
  findEmergencyById,
  findLatestLocationForTrip,
  findOpenEmergencyForVehicle,
  findOpsIdempotency,
  findTripByClientEventId,
  findTripById,
  findVehicleLocationByClientEventId,
  insertEmergency,
  insertOpsIdempotency,
  insertTrip,
  insertVehicleLocation,
  listBoardingEventsForTrip,
  listBoardingStatusesForTripIds,
  listEmergencies,
  listEmergencyAnalyticsRows,
  listTrips,
  toTripPhasePatch,
  updateEmergencyFields,
  updateTripFields,
  upsertBoardingEvent,
  appendTripTimeline,
  findBoardingByClientEventId,
} from "./ops-repository.js";
import {
  notifyBoardingMarked,
  notifyDroppingMarked,
  notifyEmergencyOpened,
  notifyEmergencyResolved,
  notifySchoolArrived,
  notifyTripEnded,
  notifyTripPhaseChanged,
  notifyTripStarted,
} from "./ops-notifications.js";
import { validateGpsPingInput } from "./gps-validation.js";
import { haversineMeters, etaMinutesFromDistance } from "./geo.js";
import {
  classifyGpsFreshness,
  type GpsFreshness,
} from "./gps-freshness.js";
import {
  assertValidTripPhaseTransition,
  isPickupPhase,
  shouldNotifyTripPhaseChange,
} from "./trip-lifecycle.js";
import {
  buildDropStopSequence,
  buildPickupStopSequence,
} from "./trip-stop-plan.js";
import { TRANSPORT_EVENT } from "./transport-events.js";
import { isBusWithinStopRadius } from "./approach.js";
import { getEffectiveTripParticipants } from "./effective-participants.js";
import type {
  BoardingStatus,
  CreateEmergencyInput,
  DroppingStatus,
  EmergencyStatus,
  LearnerTransportLiveDto,
  StartTripInput,
  TransportAnalyticsDto,
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

function requireClientEventId(raw: string | null | undefined): string {
  const id = typeof raw === "string" ? raw.trim() : "";
  if (!id) {
    throw AppError.validation("client_event_id is required");
  }
  if (id.length > 128) {
    throw AppError.validation("client_event_id is too long");
  }
  return id;
}

function timelineEvent(input: {
  kind: string;
  label: string;
  note?: string;
  stopId?: string;
  studentId?: string;
}) {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    ...input,
  };
}

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
  const [route, vehicle, driver, locationRow, stops] = await Promise.all([
    findRouteById(admin, row.route_id),
    findVehicleById(admin, row.vehicle_id),
    findDriverById(admin, row.driver_id),
    findLatestLocationForTrip(admin, row.id),
    listStopsForRoute(admin, row.route_id),
  ]);

  const base = toTripDto(row, {
    routeName: route?.name ?? null,
    vehicleNumber: vehicle?.vehicle_number ?? null,
    driverName: driver?.display_name ?? null,
  });

  const latestLocation = locationRow ? toLocationDto(locationRow) : null;
  const gpsFreshness: GpsFreshness = classifyGpsFreshness(
    latestLocation?.capturedAt ?? null,
  );

  const ordered = stops
    .slice()
    .sort((a, b) => a.route_order - b.route_order);
  const enrollments = await listEnrollments(admin, row.institute_id);
  const routeEnrollments = enrollments.filter(
    (e) => e.route_id === row.route_id && e.status === "active",
  );
  const stopRefs = ordered.map((s) => ({
    id: s.id,
    name: s.name,
    route_order: s.route_order,
    kind: s.kind ?? "waypoint",
  }));
  const pickupPlan = buildPickupStopSequence(stopRefs);
  const dropPlan = buildDropStopSequence(
    stopRefs,
    routeEnrollments.map((e) => ({
      student_id: e.student_id,
      pickup_stop_id: e.pickup_stop_id,
      drop_stop_id: e.drop_stop_id,
    })),
  );
  const plan =
    row.phase === "dropping" ? dropPlan : pickupPlan;

  const currentStop =
    (row.current_stop_id
      ? plan.find((s) => s.id === row.current_stop_id) ??
        ordered.find((s) => s.id === row.current_stop_id)
      : null) ??
    plan[row.current_stop_index] ??
    ordered[row.current_stop_index] ??
    null;
  const currentIdx = currentStop
    ? plan.findIndex((s) => s.id === currentStop.id)
    : row.current_stop_index;
  const nextStop =
    currentIdx >= 0 && currentIdx + 1 < plan.length
      ? plan[currentIdx + 1]
      : null;

  let distanceToNextStopM: number | null = null;
  let etaToNextStopMinutes: number | null = null;
  if (
    latestLocation &&
    nextStop &&
    Number.isFinite(
      ordered.find((s) => s.id === nextStop.id)?.latitude ?? NaN,
    )
  ) {
    const nextFull = ordered.find((s) => s.id === nextStop.id)!;
    distanceToNextStopM = Math.round(
      haversineMeters(
        {
          latitude: latestLocation.latitude,
          longitude: latestLocation.longitude,
        },
        { latitude: nextFull.latitude, longitude: nextFull.longitude },
      ),
    );
    etaToNextStopMinutes = etaMinutesFromDistance(distanceToNextStopM, null);
  }

  return {
    ...base,
    latestLocation,
    gpsFreshness,
    currentStopName: currentStop?.name ?? null,
    nextStopName: nextStop?.name ?? null,
    distanceToNextStopM,
    etaToNextStopMinutes,
    isDelayed: (row.timeline ?? []).some((e) => e.kind === "TRIP_DELAYED"),
    pickupStopPlan: pickupPlan.map((s) => ({
      id: s.id,
      name: s.name,
      routeOrder: s.route_order,
    })),
    dropStopPlan: dropPlan.map((s) => ({
      id: s.id,
      name: s.name,
      routeOrder: s.route_order,
    })),
  };
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
    timeline: row.timeline ?? [],
    schoolArrivedAt: row.school_arrived_at ?? null,
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
  client_event_id?: string | null;
  sequence_number?: number | null;
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
    clientEventId: row.client_event_id ?? null,
    sequenceNumber: row.sequence_number ?? null,
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
  let rows = await listTrips(admin, id, tripDate);
  if (isDriverOnlyActor(actor, id)) {
    const driver = await resolveAuthenticatedDriver(admin, actor, id);
    rows = rows.filter((row) => row.driver_id === driver.id);
  }
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
  await assertDriverCanAccessTripRow(admin, actor, trip);
  return enrichTrip(admin, trip);
}

export async function getActiveTripForVehicleForActor(
  admin: SupabaseClient,
  actor: Actor,
  vehicleId: string,
): Promise<TransportTripDto | null> {
  const vehicle = await findVehicleById(admin, vehicleId);
  if (!vehicle || vehicle.deleted_at) throw AppError.notFound("Vehicle not found");
  assertInstituteAccess(actor, vehicle.institute_id);
  if (isElevatedTransportReader(actor, vehicle.institute_id)) {
    // staff OK
  } else if (isDriverForInstitute(actor, vehicle.institute_id)) {
    await assertDriverCanAccessVehicle(
      admin,
      actor,
      vehicle.institute_id,
      vehicleId,
    );
  } else {
    throw AppError.forbidden("Insufficient permissions");
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
  const { route } = await assertDriverCanStartTrip(admin, actor, {
    instituteId,
    driverId: input.driverId,
    routeId: input.routeId,
    vehicleId: input.vehicleId,
  });

  if (input.clientEventId?.trim()) {
    const existingByEvent = await findTripByClientEventId(
      admin,
      instituteId,
      input.clientEventId.trim(),
    );
    if (existingByEvent) {
      return enrichTrip(admin, existingByEvent);
    }
  }

  // Pending driver submissions are operationally usable (Master Product Contract §3).
  // Only rejected routes stay blocked.
  if (route.approval_status === "rejected") {
    throw AppError.conflict("Route was rejected and cannot start a trip");
  }

  const existing = await findActiveTripForVehicle(admin, input.vehicleId);
  if (existing) {
    // Server wins: active trip already exists — return it for offline reconciliation.
    if (input.clientEventId?.trim()) {
      return enrichTrip(admin, existing);
    }
    throw AppError.conflict("Vehicle already has an active trip");
  }

  const trip = await insertTrip(admin, {
    ...input,
    instituteId,
    clientEventId: input.clientEventId?.trim() || null,
  });
  await notifyTripStarted(admin, trip, actor.userId);
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

  if (input.clientEventId?.trim()) {
    const prior = await findOpsIdempotency(
      admin,
      trip.institute_id,
      input.clientEventId.trim(),
    );
    if (prior) {
      return enrichTrip(admin, trip);
    }
  }

  assertValidTripPhaseTransition(trip.phase, input.phase);

  if (
    input.phase === "dropping" &&
    trip.slot === "morning" &&
    !trip.school_arrived_at
  ) {
    throw AppError.conflict(
      "Cannot start drop phase before school arrival (SCHOOL_ARRIVED)",
    );
  }

  const now = new Date().toISOString();
  const updated = await updateTripFields(
    admin,
    tripId,
    {
      ...toTripPhasePatch(input),
      ...(input.phase !== trip.phase
        ? {
            timeline: [
              ...(trip.timeline ?? []),
              {
                id: `evt-${Date.now()}`,
                at: now,
                kind: TRANSPORT_EVENT.TRIP_PHASE_CHANGED,
                label: `Phase → ${input.phase}`,
                note: `From ${trip.phase}`,
              },
            ],
          }
        : {}),
    },
  );
  if (!updated) throw AppError.notFound("Trip not found");
  if (input.clientEventId?.trim()) {
    await insertOpsIdempotency(admin, {
      instituteId: trip.institute_id,
      clientEventId: input.clientEventId.trim(),
      eventType: "trip_phase",
      tripId,
      resultRef: updated.phase,
    });
  }
  if (
    updated.phase !== trip.phase &&
    shouldNotifyTripPhaseChange(trip.phase, updated.phase)
  ) {
    await notifyTripPhaseChanged(admin, updated, actor.userId, trip.phase);
  }
  return enrichTrip(admin, updated);
}

export async function endTripForActor(
  admin: SupabaseClient,
  actor: Actor,
  tripId: string,
  clientEventId?: string | null,
): Promise<TransportTripDto> {
  const trip = await getTripOrThrow(admin, tripId);
  await assertDriverForTrip(admin, actor, trip.institute_id, trip.driver_id);

  if (clientEventId?.trim()) {
    const prior = await findOpsIdempotency(
      admin,
      trip.institute_id,
      clientEventId.trim(),
    );
    if (prior) {
      return enrichTrip(admin, trip);
    }
  }

  if (trip.finalized || trip.phase === "completed") {
    // Server wins: already completed — return current state for offline reconciliation.
    if (clientEventId?.trim()) {
      await insertOpsIdempotency(admin, {
        instituteId: trip.institute_id,
        clientEventId: clientEventId.trim(),
        eventType: "trip_end",
        tripId,
        resultRef: "completed",
      });
      return enrichTrip(admin, trip);
    }
    throw AppError.conflict("Trip is already completed");
  }

  assertValidTripPhaseTransition(trip.phase, "completed");

  await finalizeBoardingForTrip(admin, tripId);
  const now = new Date().toISOString();
  const updated = await updateTripFields(admin, tripId, {
    phase: "completed",
    completed_at: now,
    finalized: true,
    timeline: [
      ...(trip.timeline ?? []),
      {
        id: `evt-${Date.now()}`,
        at: now,
        kind: TRANSPORT_EVENT.TRIP_COMPLETED,
        label: "Trip completed",
      },
    ],
  });
  if (!updated) throw AppError.notFound("Trip not found");
  if (clientEventId?.trim()) {
    await insertOpsIdempotency(admin, {
      instituteId: trip.institute_id,
      clientEventId: clientEventId.trim(),
      eventType: "trip_end",
      tripId,
      resultRef: "completed",
    });
  }
  await notifyTripEnded(admin, updated, actor.userId);
  return enrichTrip(admin, updated);
}

async function maybeCompleteTripAfterAllDropped(
  admin: SupabaseClient,
  actor: Actor,
  trip: TransportTripRow,
): Promise<TransportTripDto | null> {
  if (trip.phase !== "dropping" || trip.finalized) return null;

  const participants = await getEffectiveTripParticipants(admin, trip.id);
  const events = await listBoardingEventsForTrip(admin, trip.id);
  const byStudent = new Map(events.map((e) => [e.student_id, e]));

  const boarded = participants.expectedOnboard.filter((p) => {
    const ev = byStudent.get(p.studentId);
    return ev?.boarding_status === "boarded";
  });
  if (boarded.length === 0) return null;

  const allResolved = boarded.every((p) => {
    const ev = byStudent.get(p.studentId);
    return (
      ev?.dropping_status === "dropped" || ev?.dropping_status === "not_dropped"
    );
  });
  if (!allResolved) return null;

  return endTripForActor(admin, actor, trip.id);
}

async function maybeMarkSchoolArrivedOnPing(
  admin: SupabaseClient,
  trip: TransportTripRow,
  location: { latitude: number; longitude: number },
  createdByUserId: string,
): Promise<void> {
  if (trip.school_arrived_at) return;
  if (!isPickupPhase(trip.phase)) return;

  const stops = await listStopsForRoute(admin, trip.route_id);
  const schoolStop = stops.find((s) => (s.kind ?? "waypoint") === "school");
  const settings = await findTransportSettings(admin, trip.institute_id);

  let latitude: number | null = null;
  let longitude: number | null = null;
  let radiusM: number = 150;

  if (
    schoolStop &&
    Number.isFinite(schoolStop.latitude) &&
    Number.isFinite(schoolStop.longitude)
  ) {
    latitude = schoolStop.latitude;
    longitude = schoolStop.longitude;
    radiusM = Number(schoolStop.notification_radius_m) || 150;
  } else if (
    settings?.school_latitude != null &&
    settings?.school_longitude != null
  ) {
    latitude = settings.school_latitude;
    longitude = settings.school_longitude;
    radiusM = settings.school_notification_radius_m ?? 150;
  }

  if (latitude == null || longitude == null) return;

  const distanceM = haversineMeters(location, { latitude, longitude });
  if (!isBusWithinStopRadius(distanceM, radiusM)) return;

  const now = new Date().toISOString();
  await appendTripTimeline(
    admin,
    trip.id,
    {
      id: `evt-school-${Date.now()}`,
      at: now,
      kind: TRANSPORT_EVENT.SCHOOL_ARRIVED,
      label: "Arrived at school",
      note: "Pickup phase complete — students not auto-boarded",
      stopId: schoolStop?.id,
    },
    { school_arrived_at: now },
  );
  // Product: "Reached school" push — once per trip (dedupe), not every GPS ping.
  await notifySchoolArrived(admin, trip, createdByUserId);
}

export async function listBoardingForTripForActor(
  admin: SupabaseClient,
  actor: Actor,
  tripId: string,
): Promise<TransportBoardingEventDto[]> {
  const trip = await getTripOrThrow(admin, tripId);
  assertInstituteAccess(actor, trip.institute_id);
  assertTransportStaffReader(actor, trip.institute_id);
  await assertDriverCanAccessTripRow(admin, actor, trip);
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

  await assertBoardingTargetAllowed(admin, trip, {
    studentId: input.studentId,
    stopId: input.stopId,
    kind: "boarding",
  });

  const clientEventId = requireClientEventId(input.clientEventId);
  const existingByEvent = await findBoardingByClientEventId(
    admin,
    trip.institute_id,
    clientEventId,
    "boarding",
  );
  if (existingByEvent) {
    if (
      existingByEvent.trip_id !== tripId ||
      existingByEvent.student_id !== input.studentId
    ) {
      throw AppError.conflict("client_event_id already used");
    }
    return enrichBoarding(admin, existingByEvent);
  }

  const now = new Date().toISOString();
  const row = await upsertBoardingEvent(admin, {
    instituteId: trip.institute_id,
    tripId,
    studentId: input.studentId,
    stopId: input.stopId,
    boardingStatus: input.boardingStatus,
    boardingClientEventId: clientEventId,
    boardedAt:
      input.boardingStatus === "boarded"
        ? now
        : input.boardingStatus === "not_boarded"
          ? null
          : undefined,
  });

  await appendTripTimeline(admin, tripId, timelineEvent({
    kind:
      input.boardingStatus === "boarded"
        ? TRANSPORT_EVENT.STUDENT_BOARDED
        : TRANSPORT_EVENT.STUDENT_NOT_BOARDED,
    label:
      input.boardingStatus === "boarded" ? "Student boarded" : "Student not boarded",
    stopId: input.stopId,
    studentId: input.studentId,
  }));

  await notifyBoardingMarked(admin, {
    trip,
    studentId: input.studentId,
    boardingStatus: input.boardingStatus,
    createdByUserId: actor.userId,
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

  await assertBoardingTargetAllowed(admin, trip, {
    studentId: input.studentId,
    stopId: input.stopId,
    kind: "dropping",
  });

  const clientEventId = requireClientEventId(input.clientEventId);
  const existingByEvent = await findBoardingByClientEventId(
    admin,
    trip.institute_id,
    clientEventId,
    "dropping",
  );
  if (existingByEvent) {
    if (
      existingByEvent.trip_id !== tripId ||
      existingByEvent.student_id !== input.studentId
    ) {
      throw AppError.conflict("client_event_id already used");
    }
    return enrichBoarding(admin, existingByEvent);
  }

  const now = new Date().toISOString();
  const row = await upsertBoardingEvent(admin, {
    instituteId: trip.institute_id,
    tripId,
    studentId: input.studentId,
    stopId: input.stopId,
    droppingStatus: input.droppingStatus,
    droppingClientEventId: clientEventId,
    droppedAt:
      input.droppingStatus === "dropped"
        ? now
        : input.droppingStatus === "not_dropped"
          ? null
          : undefined,
  });

  await appendTripTimeline(admin, tripId, timelineEvent({
    kind: TRANSPORT_EVENT.STUDENT_DROPPED,
    label:
      input.droppingStatus === "dropped"
        ? "Student dropped"
        : "Student not dropped",
    stopId: input.stopId,
    studentId: input.studentId,
  }));

  await notifyDroppingMarked(admin, {
    trip,
    studentId: input.studentId,
    stopId: input.stopId,
    droppingStatus: input.droppingStatus,
    createdByUserId: actor.userId,
  });

  // Parent notification only after backend confirmation (notifyDroppingMarked above).
  const refreshed = await findTripById(admin, tripId);
  if (refreshed) {
    await maybeCompleteTripAfterAllDropped(admin, actor, refreshed);
  }

  return enrichBoarding(admin, row);
}

export async function listEmergenciesForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
  status?: EmergencyStatus,
): Promise<TransportEmergencyDto[]> {
  const id = requireInstituteId(actor, instituteId);
  const rows = await listEmergencies(admin, id, status);

  if (isStaffReader(actor, id)) {
    return Promise.all(rows.map((row) => enrichEmergency(admin, row)));
  }

  if (isDriverForInstitute(actor, id)) {
    const driver = await findDriverByUserProfileId(admin, actor.userId, id);
    if (!driver) throw AppError.forbidden("Insufficient permissions");
    const own = rows.filter((row) => row.driver_id === driver.id);
    return Promise.all(own.map((row) => enrichEmergency(admin, row)));
  }

  throw AppError.forbidden("Insufficient permissions");
}

export async function createEmergencyForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateEmergencyInput,
): Promise<TransportEmergencyDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  const driver = await assertAuthenticatedDriverId(
    admin,
    actor,
    instituteId,
    input.driverId,
  );

  if (driver) {
    assertDriverOwnsVehicle(driver, input.vehicleId);
    if (!driver.assigned_vehicle_id) {
      throw AppError.forbidden("Driver has no assigned vehicle");
    }
    if (input.tripId) {
      const trip = await getTripOrThrow(admin, input.tripId);
      if (trip.institute_id !== instituteId) {
        throw AppError.notFound("Trip not found");
      }
      assertDriverOwnsTrip(driver, trip);
      if (trip.vehicle_id !== input.vehicleId) {
        throw AppError.forbidden("Vehicle does not match the trip");
      }
    }
  } else if (isTransportWriter(actor, instituteId)) {
    const vehicle = await findVehicleById(admin, input.vehicleId);
    if (!vehicle || vehicle.institute_id !== instituteId || vehicle.deleted_at) {
      throw AppError.notFound("Vehicle not found");
    }
  } else {
    throw AppError.forbidden("Insufficient permissions");
  }

  if (input.clientEventId?.trim()) {
    const existingByEvent = await findEmergencyByClientEventId(
      admin,
      instituteId,
      input.clientEventId.trim(),
    );
    if (existingByEvent) {
      return enrichEmergency(admin, existingByEvent);
    }
  }

  const open = await findOpenEmergencyForVehicle(admin, input.vehicleId);
  if (open) {
    // Server wins: open SOS already exists — return it for offline reconciliation.
    if (input.clientEventId?.trim()) {
      return enrichEmergency(admin, open);
    }
    throw AppError.conflict("An emergency is already open for this vehicle");
  }

  const row = await insertEmergency(admin, {
    ...input,
    instituteId,
    clientEventId: input.clientEventId?.trim() || null,
  });
  await notifyEmergencyOpened(admin, {
    instituteId,
    emergencyId: row.id,
    vehicleId: input.vehicleId,
    note: input.note ?? null,
    createdByUserId: actor.userId,
    tripId: input.tripId ?? null,
  });
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
  await notifyEmergencyResolved(admin, {
    instituteId: updated.institute_id,
    emergencyId: updated.id,
    vehicleId: updated.vehicle_id,
    createdByUserId: actor.userId,
    tripId: updated.trip_id,
  });
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
    speedKmh?: number | null;
    capturedAt?: string | null;
    clientEventId?: string | null;
    sequenceNumber?: number | null;
  },
): Promise<VehicleLocationDto> {
  const trip = await getTripOrThrow(admin, input.tripId);
  await assertDriverForTrip(admin, actor, trip.institute_id, trip.driver_id);
  if (trip.finalized || trip.phase === "completed") {
    throw AppError.conflict("Trip is already completed");
  }

  const validated = validateGpsPingInput({
    latitude: input.latitude,
    longitude: input.longitude,
    accuracyM: input.accuracyM,
    capturedAt: input.capturedAt,
    clientEventId: input.clientEventId,
    sequenceNumber: input.sequenceNumber,
  });

  if (validated.clientEventId) {
    const existing = await findVehicleLocationByClientEventId(
      admin,
      trip.institute_id,
      validated.clientEventId,
    );
    if (existing) {
      if (existing.trip_id !== trip.id) {
        throw AppError.conflict("client_event_id already used on another trip");
      }
      return toLocationDto(existing);
    }
  }

  const previous = await findLatestLocationForTrip(admin, trip.id);
  const { shouldPersistGpsSample } = await import("./gps-persist.js");
  const persist = shouldPersistGpsSample({
    previous: previous
      ? {
          latitude: previous.latitude,
          longitude: previous.longitude,
          capturedAt: previous.captured_at,
        }
      : null,
    next: {
      latitude: validated.latitude,
      longitude: validated.longitude,
      capturedAt: validated.capturedAt,
    },
  });

  let row = previous;
  if (persist.shouldPersist || !previous) {
    row = await insertVehicleLocation(admin, {
      instituteId: trip.institute_id,
      tripId: input.tripId,
      vehicleId: trip.vehicle_id,
      driverId: trip.driver_id,
      latitude: validated.latitude,
      longitude: validated.longitude,
      accuracyM: validated.accuracyM,
      capturedAt: validated.capturedAt,
      clientEventId: validated.clientEventId,
      sequenceNumber: validated.sequenceNumber,
    });
  }

  // Approach bands enqueue async; rare arrival emit is awaited inside.
  // Keep await so timeline/school side-effects settle before the response returns.
  const { evaluateApproachAlertsOnPing } = await import("./approach.js");
  await evaluateApproachAlertsOnPing(
    admin,
    trip,
    {
      latitude: validated.latitude,
      longitude: validated.longitude,
      speedKmh: input.speedKmh ?? null,
      accuracyM: validated.accuracyM,
      capturedAtMs: Date.parse(validated.capturedAt),
    },
    actor.userId,
  );

  await maybeMarkSchoolArrivedOnPing(
    admin,
    trip,
    {
      latitude: validated.latitude,
      longitude: validated.longitude,
    },
    actor.userId,
  );

  return toLocationDto(row!);
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
  let approach: LearnerTransportLiveDto["approach"] = null;
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
    if (latestLocation) {
      const { computeApproachForStudent } = await import("./approach.js");
      approach = await computeApproachForStudent(admin, {
        instituteId,
        routeId: tripRow.route_id,
        studentId: input.studentId,
        tripId: tripRow.id,
        tripPhase: tripRow.phase,
        tripSlot: tripRow.slot,
        latitude: latestLocation.latitude,
        longitude: latestLocation.longitude,
        accuracyM: latestLocation.accuracyM ?? null,
        capturedAtMs: latestLocation.capturedAt
          ? Date.parse(latestLocation.capturedAt)
          : Date.now(),
      });
    }
  }

  const serviceDate =
    tripRow?.trip_date ?? new Date().toISOString().slice(0, 10);
  const { listNotRidingStudentIds } = await import(
    "./daily-exception-repository.js"
  );
  const notRidingSet = await listNotRidingStudentIds(
    admin,
    instituteId,
    serviceDate,
    [input.studentId],
  );
  const settings = await findTransportSettings(admin, instituteId);
  const expectedPickupTime = settings?.default_pickup_time
    ? String(settings.default_pickup_time).slice(0, 5)
    : null;

  return {
    activeTrip,
    boarding,
    openEmergency,
    latestLocation,
    approach,
    gpsFreshness: classifyGpsFreshness(latestLocation?.capturedAt ?? null),
    notRidingToday: notRidingSet.has(input.studentId),
    expectedPickupTime,
  };
}

export async function listLearnerTransportHistoryForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: { instituteId: string; studentId: string; limit?: number },
): Promise<
  import("./ops-types.js").LearnerTransportHistoryDayDto[]
> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertInstituteAccess(actor, instituteId);

  const linked = await resolveLinkedStudentIds(admin, actor, instituteId);
  const isStaff = isStaffReader(actor, instituteId);
  if (!isStaff && !linked.has(input.studentId)) {
    throw AppError.forbidden("Insufficient permissions");
  }

  const enrollments = await listEnrollments(admin, instituteId, [
    input.studentId,
  ]);
  const enrollment =
    enrollments.find((e) => e.status === "active") ?? enrollments[0] ?? null;
  if (!enrollment) return [];

  const limit = Math.min(Math.max(input.limit ?? 14, 1), 60);
  // Bound scan: route-scoped + extra headroom for not-riding-only days.
  const trips = await listTrips(admin, instituteId, undefined, {
    routeId: enrollment.route_id,
    limit: Math.min(limit * 3, 120),
  });

  const { listActiveDailyExceptionsForStudents } = await import(
    "./daily-exception-repository.js"
  );
  const route = await findRouteById(admin, enrollment.route_id);
  const pickup = enrollment.pickup_stop_id
    ? await findStopById(admin, enrollment.pickup_stop_id)
    : null;
  const drop = enrollment.drop_stop_id
    ? await findStopById(admin, enrollment.drop_stop_id)
    : null;

  const out: import("./ops-types.js").LearnerTransportHistoryDayDto[] = [];
  for (const trip of trips) {
    const boardingRow = await findBoardingEvent(admin, trip.id, input.studentId);
    const exceptions = await listActiveDailyExceptionsForStudents(
      admin,
      instituteId,
      trip.trip_date,
      [input.studentId],
      "NOT_RIDING",
    );
    // Privacy: only surface days where this student participated or was
    // explicitly not-riding — never other students' trip activity alone.
    if (!boardingRow && exceptions.length === 0) continue;
    out.push({
      tripDate: trip.trip_date,
      tripId: trip.id,
      routeName: route?.name ?? null,
      phase: trip.phase,
      boardingStatus: boardingRow?.boarding_status ?? null,
      droppingStatus: boardingRow?.dropping_status ?? null,
      boardedAt: boardingRow?.boarded_at ?? null,
      droppedAt: boardingRow?.dropped_at ?? null,
      notRiding: exceptions.length > 0,
      pickupStopName: pickup?.name ?? null,
      dropStopName: drop?.name ?? null,
    });
    if (out.length >= limit) break;
  }
  return out;
}

export async function getOpenEmergencyForVehicleForActor(
  admin: SupabaseClient,
  actor: Actor,
  vehicleId: string,
): Promise<TransportEmergencyDto | null> {
  const vehicle = await findVehicleById(admin, vehicleId);
  if (!vehicle || vehicle.deleted_at) throw AppError.notFound("Vehicle not found");
  assertInstituteAccess(actor, vehicle.institute_id);
  if (isElevatedTransportReader(actor, vehicle.institute_id)) {
    // staff OK
  } else if (isDriverForInstitute(actor, vehicle.institute_id)) {
    await assertDriverCanAccessVehicle(
      admin,
      actor,
      vehicle.institute_id,
      vehicleId,
    );
  } else {
    throw AppError.forbidden("Insufficient permissions");
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
  if (!isElevatedTransportReader(actor, id)) {
    throw AppError.forbidden("Insufficient permissions");
  }
  const trips = await listTrips(admin, id, tripDate);
  const boardingLists = await Promise.all(
    trips.map((trip) => listBoardingEventsForTrip(admin, trip.id)),
  );
  const all = boardingLists.flat();
  return Promise.all(all.map((row) => enrichBoarding(admin, row)));
}

export async function getTransportAnalyticsForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
  tripDate?: string,
): Promise<TransportAnalyticsDto> {
  const id = requireInstituteId(actor, instituteId);
  if (!isElevatedTransportReader(actor, id)) {
    throw AppError.forbidden("Insufficient permissions");
  }
  const date = tripDate?.trim() || new Date().toISOString().slice(0, 10);

  const [vehicles, drivers, routes, enrollments, trips, emergencies, stops] =
    await Promise.all([
      listVehicleAnalyticsRows(admin, id),
      listDriverAnalyticsRows(admin, id),
      listRouteAnalyticsRows(admin, id),
      listEnrollmentAnalyticsRows(admin, id),
      listTrips(admin, id, date),
      listEmergencyAnalyticsRows(admin, id),
      listStopAnalyticsRows(admin, id),
    ]);

  const totalStops = stops.length;
  const approvedStops = stops.filter((s) => s.approval_status === "approved")
    .length;

  const boardingRows = await listBoardingStatusesForTripIds(
    admin,
    trips.map((t) => t.id),
  );

  const activeTripRows = trips.filter(
    (t) => !t.finalized && t.phase !== "completed",
  );
  const activeTrips = activeTripRows.length;
  const completedTripsToday = trips.filter(
    (t) => t.finalized || t.phase === "completed",
  ).length;

  const activeBuses = new Set(activeTripRows.map((t) => t.vehicle_id)).size;
  const activeDrivers = new Set(activeTripRows.map((t) => t.driver_id)).size;
  const delayedTrips = activeTripRows.filter((t) =>
    (t.timeline ?? []).some((e) => e.kind === "TRIP_DELAYED"),
  ).length;

  const locations = await Promise.all(
    activeTripRows.map((trip) => findLatestLocationForTrip(admin, trip.id)),
  );
  let busesWithStaleGps = 0;
  for (const locationRow of locations) {
    const freshness = classifyGpsFreshness(
      locationRow ? toLocationDto(locationRow).capturedAt : null,
    );
    if (freshness === "stale" || freshness === "offline") {
      busesWithStaleGps += 1;
    }
  }

  const activeEnrollments = enrollments.filter((e) => e.status === "active").length;

  return {
    instituteId: id,
    tripDate: date,
    totalVehicles: vehicles.length,
    totalDrivers: drivers.length,
    totalRoutes: routes.length,
    configuredRoutes: routes.filter((r) => r.config_status === "configured").length,
    lockedRoutes: routes.filter((r) => r.config_status === "locked").length,
    pendingRouteSetup: routes.filter((r) => r.config_status === "not_configured")
      .length,
    totalStops,
    approvedStops,
    totalEnrollments: enrollments.length,
    activeEnrollments,
    approvedEnrollments: enrollments.filter(
      (e) => e.approval_status === "approved",
    ).length,
    tripsToday: trips.length,
    activeTrips,
    completedTripsToday,
    boardingMarksToday: boardingRows.length,
    boardedToday: boardingRows.filter((m) => m.boarding_status === "boarded").length,
    openEmergencies: emergencies.filter(
      (e) => e.status === "active" || e.status === "acknowledged",
    ).length,
    activeBuses,
    activeDrivers,
    studentsUsingTransport: activeEnrollments,
    delayedTrips,
    busesWithStaleGps,
  };
}
