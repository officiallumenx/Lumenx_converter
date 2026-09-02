import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteAccess,
  assertInstituteRoles,
  requireInstituteId,
} from "../../authorization/index.js";
import {
  findStudentById,
  listGuardianStudentIds,
} from "../students/repository.js";
import {
  findDriverById,
  findEnrollmentById,
  findRouteById,
  findStopById,
  findTransportSettings,
  findVehicleById,
  insertDriver,
  insertEnrollment,
  insertRoute,
  insertStop,
  insertVehicle,
  listDrivers,
  listEnrollments,
  listRoutes,
  listStopsForRoute,
  listVehicles,
  softDeleteDriver,
  softDeleteEnrollment,
  softDeleteRoute,
  softDeleteStop,
  softDeleteVehicle,
  toDriverUpdatePatch,
  toEnrollmentUpdatePatch,
  toRouteUpdatePatch,
  toStopUpdatePatch,
  toVehicleUpdatePatch,
  updateDriverFields,
  updateEnrollmentFields,
  updateRouteFields,
  updateStopFields,
  updateVehicleFields,
  upsertTransportSettings,
} from "./repository.js";
import {
  approvalStatusForCreate,
  assertCanDeleteRejected,
  isDriverForInstitute,
  isTransportWriter,
} from "./approval.js";
import type {
  CreateDriverInput,
  CreateEnrollmentInput,
  CreateRouteInput,
  CreateStopInput,
  CreateVehicleInput,
  DriverDto,
  DriverRow,
  RouteDto,
  RouteRow,
  StopDto,
  StopRow,
  TransportEnrollmentDto,
  TransportEnrollmentRow,
  TransportSettingsDto,
  TransportSettingsRow,
  TransportApprovalStatus,
  UpdateDriverInput,
  UpdateEnrollmentInput,
  UpdateRouteInput,
  UpdateStopInput,
  UpdateVehicleInput,
  UpsertTransportSettingsInput,
  VehicleDto,
  VehicleRow,
} from "./types.js";

export const TRANSPORT_WRITE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "it_admin",
] as const;

export const TRANSPORT_STAFF_READ_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "it_admin",
  "teacher",
  "accountant",
  "admissions_officer",
  "staff",
  "driver",
] as const;

export function toVehicleDto(row: VehicleRow): VehicleDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    vehicleNumber: row.vehicle_number,
    registrationNumber: row.registration_number,
    capacity: row.capacity,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toDriverDto(row: DriverRow): DriverDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    userProfileId: row.user_profile_id,
    displayName: row.display_name,
    phone: row.phone,
    licenseNumber: row.license_number,
    licenseExpiry: row.license_expiry,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toRouteDto(row: RouteRow): RouteDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    name: row.name,
    vehicleId: row.vehicle_id,
    driverId: row.driver_id,
    status: row.status,
    configStatus: row.config_status,
    lockedAt: row.locked_at,
    lockedByUserId: row.locked_by_user_id,
    setupFinishedAt: row.setup_finished_at,
    approvalStatus: row.approval_status,
    submittedByUserId: row.submitted_by_user_id,
    reviewedByUserId: row.reviewed_by_user_id,
    reviewedAt: row.reviewed_at,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toStopDto(row: StopRow): StopDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    routeId: row.route_id,
    name: row.name,
    locationLabel: row.location_label,
    latitude: row.latitude,
    longitude: row.longitude,
    routeOrder: row.route_order,
    notificationRadiusM: row.notification_radius_m,
    approvalStatus: row.approval_status,
    submittedByUserId: row.submitted_by_user_id,
    reviewedByUserId: row.reviewed_by_user_id,
    reviewedAt: row.reviewed_at,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toEnrollmentDto(row: TransportEnrollmentRow): TransportEnrollmentDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    studentId: row.student_id,
    routeId: row.route_id,
    pickupStopId: row.pickup_stop_id,
    dropStopId: row.drop_stop_id,
    status: row.status,
    approvalStatus: row.approval_status,
    submittedByUserId: row.submitted_by_user_id,
    reviewedByUserId: row.reviewed_by_user_id,
    reviewedAt: row.reviewed_at,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toTransportSettingsDto(
  row: TransportSettingsRow,
): TransportSettingsDto {
  return {
    instituteId: row.institute_id,
    defaultNotificationRadiusM: row.default_notification_radius_m,
    defaultPickupBufferMins: row.default_pickup_buffer_mins,
    workingDays: row.working_days ?? [1, 2, 3, 4, 5],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isStaffReader(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  const membership = actor.memberships.find((m) => m.instituteId === instituteId);
  if (!membership) return false;
  return TRANSPORT_STAFF_READ_ROLES.some((role) =>
    membership.roles.includes(role),
  );
}

function assertTransportWriter(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  assertInstituteRoles(actor, instituteId, [...TRANSPORT_WRITE_ROLES]);
}

function assertCanSubmitTransport(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  if (isTransportWriter(actor, instituteId)) return;
  if (isDriverForInstitute(actor, instituteId)) return;
  throw AppError.forbidden("Insufficient permissions");
}

function filterApprovalRows<T extends {
  approval_status: TransportApprovalStatus;
  submitted_by_user_id: string | null;
}>(
  actor: Actor,
  instituteId: string,
  rows: T[],
): T[] {
  if (isTransportWriter(actor, instituteId)) return rows;
  if (isDriverForInstitute(actor, instituteId)) {
    return rows.filter(
      (r) =>
        r.approval_status === "approved" ||
        (r.approval_status !== "approved" && r.submitted_by_user_id === actor.userId),
    );
  }
  return rows.filter((r) => r.approval_status === "approved");
}

function assertTransportStaffReader(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  if (!isStaffReader(actor, instituteId)) {
    throw AppError.forbidden("Insufficient permissions");
  }
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

async function assertCanAccessEnrollment(
  admin: SupabaseClient,
  actor: Actor,
  row: TransportEnrollmentRow,
): Promise<void> {
  assertInstituteAccess(actor, row.institute_id);
  if (isStaffReader(actor, row.institute_id)) return;

  const linked = await resolveLinkedStudentIds(admin, actor, row.institute_id);
  if (linked.has(row.student_id)) return;

  throw AppError.forbidden("Insufficient permissions");
}

async function assertStopOnRoute(
  admin: SupabaseClient,
  stopId: string,
  routeId: string,
  instituteId: string,
): Promise<StopRow> {
  const stop = await findStopById(admin, stopId);
  if (!stop) throw AppError.notFound("Stop not found");
  if (stop.institute_id !== instituteId) {
    throw AppError.validation("Stop must belong to the same institute");
  }
  if (stop.route_id !== routeId) {
    throw AppError.validation("Pickup/drop stops must belong to the enrollment route");
  }
  return stop;
}

async function assertRouteInInstitute(
  admin: SupabaseClient,
  routeId: string,
  instituteId: string,
): Promise<RouteRow> {
  const route = await findRouteById(admin, routeId);
  if (!route) throw AppError.notFound("Route not found");
  if (route.institute_id !== instituteId) {
    throw AppError.validation("Route must belong to the same institute");
  }
  return route;
}

async function assertVehicleInInstitute(
  admin: SupabaseClient,
  vehicleId: string,
  instituteId: string,
): Promise<void> {
  const vehicle = await findVehicleById(admin, vehicleId);
  if (!vehicle) throw AppError.notFound("Vehicle not found");
  if (vehicle.institute_id !== instituteId) {
    throw AppError.validation("Vehicle must belong to the same institute");
  }
}

async function assertDriverInInstitute(
  admin: SupabaseClient,
  driverId: string,
  instituteId: string,
): Promise<void> {
  const driver = await findDriverById(admin, driverId);
  if (!driver) throw AppError.notFound("Driver not found");
  if (driver.institute_id !== instituteId) {
    throw AppError.validation("Driver must belong to the same institute");
  }
}

// ── Vehicles ─────────────────────────────────────────────────────

export async function listVehiclesForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
): Promise<VehicleDto[]> {
  const id = requireInstituteId(actor, instituteId);
  assertTransportStaffReader(actor, id);
  const rows = await listVehicles(admin, id);
  return rows.map(toVehicleDto);
}

export async function getVehicleForActor(
  admin: SupabaseClient,
  actor: Actor,
  vehicleId: string,
): Promise<VehicleDto> {
  const row = await findVehicleById(admin, vehicleId);
  if (!row) throw AppError.notFound("Vehicle not found");
  assertTransportStaffReader(actor, row.institute_id);
  return toVehicleDto(row);
}

export async function createVehicleForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateVehicleInput,
): Promise<VehicleDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertTransportWriter(actor, instituteId);

  const vehicleNumber = input.vehicleNumber.trim();
  const registrationNumber = input.registrationNumber.trim();
  if (!vehicleNumber || !registrationNumber) {
    throw AppError.validation("vehicle_number and registration_number are required");
  }
  if (!Number.isInteger(input.capacity) || input.capacity <= 0) {
    throw AppError.validation("capacity must be a positive integer");
  }

  const row = await insertVehicle(admin, {
    ...input,
    instituteId,
    vehicleNumber,
    registrationNumber,
  });
  return toVehicleDto(row);
}

export async function updateVehicleForActor(
  admin: SupabaseClient,
  actor: Actor,
  vehicleId: string,
  patch: UpdateVehicleInput,
): Promise<VehicleDto> {
  const existing = await findVehicleById(admin, vehicleId);
  if (!existing) throw AppError.notFound("Vehicle not found");
  assertTransportWriter(actor, existing.institute_id);

  const fieldPatch = toVehicleUpdatePatch(patch);
  if (typeof fieldPatch.vehicle_number === "string") {
    fieldPatch.vehicle_number = fieldPatch.vehicle_number.trim();
  }
  if (typeof fieldPatch.registration_number === "string") {
    fieldPatch.registration_number = fieldPatch.registration_number.trim();
  }
  if (
    fieldPatch.capacity !== undefined &&
    (!Number.isInteger(fieldPatch.capacity) || (fieldPatch.capacity as number) <= 0)
  ) {
    throw AppError.validation("capacity must be a positive integer");
  }
  if (Object.keys(fieldPatch).length === 0) return toVehicleDto(existing);

  const updated = await updateVehicleFields(admin, vehicleId, fieldPatch);
  if (!updated) throw AppError.notFound("Vehicle not found");
  return toVehicleDto(updated);
}

export async function deleteVehicleForActor(
  admin: SupabaseClient,
  actor: Actor,
  vehicleId: string,
): Promise<void> {
  const existing = await findVehicleById(admin, vehicleId);
  if (!existing) throw AppError.notFound("Vehicle not found");
  assertTransportWriter(actor, existing.institute_id);
  const deleted = await softDeleteVehicle(admin, vehicleId);
  if (!deleted) throw AppError.conflict("Vehicle was already deleted");
}

// ── Drivers ──────────────────────────────────────────────────────

export async function listDriversForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
): Promise<DriverDto[]> {
  const id = requireInstituteId(actor, instituteId);
  assertTransportStaffReader(actor, id);
  const rows = await listDrivers(admin, id);
  return rows.map(toDriverDto);
}

export async function getDriverForActor(
  admin: SupabaseClient,
  actor: Actor,
  driverId: string,
): Promise<DriverDto> {
  const row = await findDriverById(admin, driverId);
  if (!row) throw AppError.notFound("Driver not found");
  assertTransportStaffReader(actor, row.institute_id);
  return toDriverDto(row);
}

export async function createDriverForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateDriverInput,
): Promise<DriverDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertTransportWriter(actor, instituteId);

  const displayName = input.displayName.trim();
  const phone = input.phone.trim();
  const licenseNumber = input.licenseNumber.trim();
  if (!displayName || !phone || !licenseNumber) {
    throw AppError.validation(
      "display_name, phone, and license_number are required",
    );
  }

  const row = await insertDriver(admin, {
    ...input,
    instituteId,
    displayName,
    phone,
    licenseNumber,
    userProfileId: null,
  });
  return toDriverDto(row);
}

export async function updateDriverForActor(
  admin: SupabaseClient,
  actor: Actor,
  driverId: string,
  patch: UpdateDriverInput,
): Promise<DriverDto> {
  const existing = await findDriverById(admin, driverId);
  if (!existing) throw AppError.notFound("Driver not found");
  assertTransportWriter(actor, existing.institute_id);

  const fieldPatch = toDriverUpdatePatch(patch);
  if (typeof fieldPatch.display_name === "string") {
    fieldPatch.display_name = fieldPatch.display_name.trim();
  }
  if (typeof fieldPatch.phone === "string") {
    fieldPatch.phone = fieldPatch.phone.trim();
  }
  if (typeof fieldPatch.license_number === "string") {
    fieldPatch.license_number = fieldPatch.license_number.trim();
  }
  if (Object.keys(fieldPatch).length === 0) return toDriverDto(existing);

  const updated = await updateDriverFields(admin, driverId, fieldPatch);
  if (!updated) throw AppError.notFound("Driver not found");
  return toDriverDto(updated);
}

export async function deleteDriverForActor(
  admin: SupabaseClient,
  actor: Actor,
  driverId: string,
): Promise<void> {
  const existing = await findDriverById(admin, driverId);
  if (!existing) throw AppError.notFound("Driver not found");
  assertTransportWriter(actor, existing.institute_id);
  const deleted = await softDeleteDriver(admin, driverId);
  if (!deleted) throw AppError.conflict("Driver was already deleted");
}

// ── Routes ───────────────────────────────────────────────────────

export async function listRoutesForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
): Promise<RouteDto[]> {
  const id = requireInstituteId(actor, instituteId);
  assertTransportStaffReader(actor, id);
  const rows = filterApprovalRows(actor, id, await listRoutes(admin, id));
  return rows.map(toRouteDto);
}

export async function getRouteForActor(
  admin: SupabaseClient,
  actor: Actor,
  routeId: string,
): Promise<RouteDto> {
  const row = await findRouteById(admin, routeId);
  if (!row) throw AppError.notFound("Route not found");
  assertTransportStaffReader(actor, row.institute_id);
  if (
    !isTransportWriter(actor, row.institute_id) &&
    row.approval_status !== "approved" &&
    row.submitted_by_user_id !== actor.userId
  ) {
    throw AppError.notFound("Route not found");
  }
  return toRouteDto(row);
}

export async function createRouteForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateRouteInput,
): Promise<RouteDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertCanSubmitTransport(actor, instituteId);
  const writer = isTransportWriter(actor, instituteId);
  const approvalStatus = approvalStatusForCreate(actor, instituteId);

  const name = input.name.trim();
  if (!name) throw AppError.validation("name is required");

  if (input.vehicleId) {
    await assertVehicleInInstitute(admin, input.vehicleId, instituteId);
  }
  if (input.driverId) {
    await assertDriverInInstitute(admin, input.driverId, instituteId);
  }

  const row = await insertRoute(admin, {
    ...input,
    instituteId,
    name,
    approvalStatus,
    submittedByUserId: writer ? null : actor.userId,
  });
  return toRouteDto(row);
}

export async function updateRouteForActor(
  admin: SupabaseClient,
  actor: Actor,
  routeId: string,
  patch: UpdateRouteInput,
): Promise<RouteDto> {
  const existing = await findRouteById(admin, routeId);
  if (!existing) throw AppError.notFound("Route not found");
  assertTransportWriter(actor, existing.institute_id);

  if (patch.vehicleId) {
    await assertVehicleInInstitute(admin, patch.vehicleId, existing.institute_id);
  }
  if (patch.driverId) {
    await assertDriverInInstitute(admin, patch.driverId, existing.institute_id);
  }

  const fieldPatch = toRouteUpdatePatch(patch);
  if (typeof fieldPatch.name === "string") {
    fieldPatch.name = fieldPatch.name.trim();
  }
  if (Object.keys(fieldPatch).length === 0) return toRouteDto(existing);

  const updated = await updateRouteFields(admin, routeId, fieldPatch);
  if (!updated) throw AppError.notFound("Route not found");
  return toRouteDto(updated);
}

export async function deleteRouteForActor(
  admin: SupabaseClient,
  actor: Actor,
  routeId: string,
): Promise<void> {
  const existing = await findRouteById(admin, routeId);
  if (!existing) throw AppError.notFound("Route not found");
  if (isTransportWriter(actor, existing.institute_id)) {
    const deleted = await softDeleteRoute(admin, routeId);
    if (!deleted) throw AppError.conflict("Route was already deleted");
    return;
  }
  assertCanDeleteRejected(
    actor,
    existing.institute_id,
    existing.submitted_by_user_id,
    existing.approval_status,
  );
  const deleted = await softDeleteRoute(admin, routeId);
  if (!deleted) throw AppError.conflict("Route was already deleted");
}

// ── Stops ────────────────────────────────────────────────────────

export async function listStopsForActor(
  admin: SupabaseClient,
  actor: Actor,
  routeId: string,
): Promise<StopDto[]> {
  const route = await findRouteById(admin, routeId);
  if (!route) throw AppError.notFound("Route not found");
  assertTransportStaffReader(actor, route.institute_id);
  const rows = filterApprovalRows(
    actor,
    route.institute_id,
    await listStopsForRoute(admin, routeId),
  );
  return rows.map(toStopDto);
}

export async function getStopForActor(
  admin: SupabaseClient,
  actor: Actor,
  stopId: string,
): Promise<StopDto> {
  const row = await findStopById(admin, stopId);
  if (!row) throw AppError.notFound("Stop not found");
  assertTransportStaffReader(actor, row.institute_id);
  if (
    !isTransportWriter(actor, row.institute_id) &&
    row.approval_status !== "approved" &&
    row.submitted_by_user_id !== actor.userId
  ) {
    throw AppError.notFound("Stop not found");
  }
  return toStopDto(row);
}

export async function createStopForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateStopInput,
): Promise<StopDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertCanSubmitTransport(actor, instituteId);
  const writer = isTransportWriter(actor, instituteId);
  const approvalStatus = approvalStatusForCreate(actor, instituteId);

  await assertRouteInInstitute(admin, input.routeId, instituteId);

  const name = input.name.trim();
  const locationLabel = input.locationLabel.trim();
  if (!name || !locationLabel) {
    throw AppError.validation("name and location_label are required");
  }
  if (!Number.isInteger(input.routeOrder) || input.routeOrder < 0) {
    throw AppError.validation("route_order must be an integer >= 0");
  }
  if (input.latitude < -90 || input.latitude > 90) {
    throw AppError.validation("latitude must be between -90 and 90");
  }
  if (input.longitude < -180 || input.longitude > 180) {
    throw AppError.validation("longitude must be between -180 and 180");
  }

  const row = await insertStop(admin, {
    ...input,
    instituteId,
    name,
    locationLabel,
    approvalStatus,
    submittedByUserId: writer ? null : actor.userId,
  });
  return toStopDto(row);
}

export async function updateStopForActor(
  admin: SupabaseClient,
  actor: Actor,
  stopId: string,
  patch: UpdateStopInput,
): Promise<StopDto> {
  const existing = await findStopById(admin, stopId);
  if (!existing) throw AppError.notFound("Stop not found");
  assertTransportWriter(actor, existing.institute_id);

  const fieldPatch = toStopUpdatePatch(patch);
  if (typeof fieldPatch.name === "string") {
    fieldPatch.name = fieldPatch.name.trim();
  }
  if (typeof fieldPatch.location_label === "string") {
    fieldPatch.location_label = fieldPatch.location_label.trim();
  }
  if (
    fieldPatch.route_order !== undefined &&
    (!Number.isInteger(fieldPatch.route_order) ||
      (fieldPatch.route_order as number) < 0)
  ) {
    throw AppError.validation("route_order must be an integer >= 0");
  }
  if (Object.keys(fieldPatch).length === 0) return toStopDto(existing);

  const updated = await updateStopFields(admin, stopId, fieldPatch);
  if (!updated) throw AppError.notFound("Stop not found");
  return toStopDto(updated);
}

export async function deleteStopForActor(
  admin: SupabaseClient,
  actor: Actor,
  stopId: string,
): Promise<void> {
  const existing = await findStopById(admin, stopId);
  if (!existing) throw AppError.notFound("Stop not found");
  if (isTransportWriter(actor, existing.institute_id)) {
    const deleted = await softDeleteStop(admin, stopId);
    if (!deleted) throw AppError.conflict("Stop was already deleted");
    return;
  }
  assertCanDeleteRejected(
    actor,
    existing.institute_id,
    existing.submitted_by_user_id,
    existing.approval_status,
  );
  const deleted = await softDeleteStop(admin, stopId);
  if (!deleted) throw AppError.conflict("Stop was already deleted");
}

// ── Enrollments ──────────────────────────────────────────────────

export async function listEnrollmentsForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
): Promise<TransportEnrollmentDto[]> {
  const id = requireInstituteId(actor, instituteId);

  if (isStaffReader(actor, id)) {
    const rows = filterApprovalRows(actor, id, await listEnrollments(admin, id));
    return rows.map(toEnrollmentDto);
  }

  const linked = await resolveLinkedStudentIds(admin, actor, id);
  if (linked.size === 0) {
    throw AppError.forbidden("Insufficient permissions");
  }
  const rows = filterApprovalRows(
    actor,
    id,
    await listEnrollments(admin, id, [...linked]),
  );
  return rows.map(toEnrollmentDto);
}

export async function getEnrollmentForActor(
  admin: SupabaseClient,
  actor: Actor,
  enrollmentId: string,
): Promise<TransportEnrollmentDto> {
  const row = await findEnrollmentById(admin, enrollmentId);
  if (!row) throw AppError.notFound("Enrollment not found");
  await assertCanAccessEnrollment(admin, actor, row);
  return toEnrollmentDto(row);
}

export async function createEnrollmentForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateEnrollmentInput,
): Promise<TransportEnrollmentDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertCanSubmitTransport(actor, instituteId);
  const writer = isTransportWriter(actor, instituteId);
  const approvalStatus = approvalStatusForCreate(actor, instituteId);

  const student = await findStudentById(admin, input.studentId);
  if (!student || student.institute_id !== instituteId) {
    throw AppError.notFound("Student not found");
  }

  await assertRouteInInstitute(admin, input.routeId, instituteId);
  await assertStopOnRoute(admin, input.pickupStopId, input.routeId, instituteId);
  await assertStopOnRoute(admin, input.dropStopId, input.routeId, instituteId);

  const row = await insertEnrollment(admin, {
    ...input,
    instituteId,
    approvalStatus,
    submittedByUserId: writer ? null : actor.userId,
  });
  return toEnrollmentDto(row);
}

export async function updateEnrollmentForActor(
  admin: SupabaseClient,
  actor: Actor,
  enrollmentId: string,
  patch: UpdateEnrollmentInput,
): Promise<TransportEnrollmentDto> {
  const existing = await findEnrollmentById(admin, enrollmentId);
  if (!existing) throw AppError.notFound("Enrollment not found");
  assertTransportWriter(actor, existing.institute_id);

  const routeId = patch.routeId ?? existing.route_id;
  if (patch.routeId) {
    await assertRouteInInstitute(admin, patch.routeId, existing.institute_id);
  }

  const pickupStopId = patch.pickupStopId ?? existing.pickup_stop_id;
  const dropStopId = patch.dropStopId ?? existing.drop_stop_id;

  if (
    patch.routeId !== undefined ||
    patch.pickupStopId !== undefined ||
    patch.dropStopId !== undefined
  ) {
    await assertStopOnRoute(
      admin,
      pickupStopId,
      routeId,
      existing.institute_id,
    );
    await assertStopOnRoute(admin, dropStopId, routeId, existing.institute_id);
  }

  const fieldPatch = toEnrollmentUpdatePatch(patch);
  if (Object.keys(fieldPatch).length === 0) return toEnrollmentDto(existing);

  const updated = await updateEnrollmentFields(admin, enrollmentId, fieldPatch);
  if (!updated) throw AppError.notFound("Enrollment not found");
  return toEnrollmentDto(updated);
}

export async function deleteEnrollmentForActor(
  admin: SupabaseClient,
  actor: Actor,
  enrollmentId: string,
): Promise<void> {
  const existing = await findEnrollmentById(admin, enrollmentId);
  if (!existing) throw AppError.notFound("Enrollment not found");
  if (isTransportWriter(actor, existing.institute_id)) {
    const deleted = await softDeleteEnrollment(admin, enrollmentId);
    if (!deleted) throw AppError.conflict("Enrollment was already deleted");
    return;
  }
  assertCanDeleteRejected(
    actor,
    existing.institute_id,
    existing.submitted_by_user_id,
    existing.approval_status,
  );
  const deleted = await softDeleteEnrollment(admin, enrollmentId);
  if (!deleted) throw AppError.conflict("Enrollment was already deleted");
}

// ── Settings ─────────────────────────────────────────────────────

export async function getTransportSettingsForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
): Promise<TransportSettingsDto> {
  const id = requireInstituteId(actor, instituteId);
  assertTransportStaffReader(actor, id);

  const row = await findTransportSettings(admin, id);
  if (!row) {
    return {
      instituteId: id,
      defaultNotificationRadiusM: 150,
      defaultPickupBufferMins: 5,
      workingDays: [1, 2, 3, 4, 5],
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    };
  }
  return toTransportSettingsDto(row);
}

export async function upsertTransportSettingsForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: UpsertTransportSettingsInput,
): Promise<TransportSettingsDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertTransportWriter(actor, instituteId);

  if (
    input.defaultNotificationRadiusM !== undefined &&
    (!Number.isInteger(input.defaultNotificationRadiusM) ||
      input.defaultNotificationRadiusM <= 0)
  ) {
    throw AppError.validation(
      "default_notification_radius_m must be a positive integer",
    );
  }
  if (
    input.defaultPickupBufferMins !== undefined &&
    (!Number.isInteger(input.defaultPickupBufferMins) ||
      input.defaultPickupBufferMins < 0)
  ) {
    throw AppError.validation(
      "default_pickup_buffer_mins must be an integer >= 0",
    );
  }
  if (input.workingDays !== undefined) {
    if (
      !Array.isArray(input.workingDays) ||
      input.workingDays.some(
        (d) => !Number.isInteger(d) || d < 0 || d > 6,
      )
    ) {
      throw AppError.validation("working_days must be integers 0-6");
    }
  }

  const row = await upsertTransportSettings(admin, { ...input, instituteId });
  return toTransportSettingsDto(row);
}
