/**
 * Transport write API — settings PUT + vehicles/drivers/routes/stops/enrollments CRUD.
 * API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type {
  DriverDto,
  EnrollmentStatus,
  RouteConfigStatus,
  RouteDto,
  StopDto,
  TransportAssetStatus,
  TransportEnrollmentDto,
  TransportSettingsDto,
  VehicleDto,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Transport API is only available in API auth mode");
  }
}

export type CreateVehicleInput = {
  instituteId: string;
  vehicleNumber: string;
  registrationNumber: string;
  capacity: number;
  status?: TransportAssetStatus;
  notes?: string | null;
};

export type UpdateVehicleInput = Partial<Omit<CreateVehicleInput, "instituteId">>;

export type CreateDriverInput = {
  instituteId: string;
  displayName: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry?: string | null;
  status?: TransportAssetStatus;
  notes?: string | null;
  userProfileId?: string | null;
};

export type UpdateDriverInput = Partial<
  Omit<CreateDriverInput, "instituteId" | "userProfileId">
>;

export type CreateRouteInput = {
  instituteId: string;
  name: string;
  vehicleId?: string | null;
  driverId?: string | null;
  status?: TransportAssetStatus;
  configStatus?: RouteConfigStatus;
};

export type UpdateRouteInput = Partial<Omit<CreateRouteInput, "instituteId">>;

export type CreateStopInput = {
  instituteId: string;
  routeId: string;
  name: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  routeOrder: number;
  notificationRadiusM?: number;
};

export type UpdateStopInput = Partial<
  Omit<CreateStopInput, "instituteId" | "routeId">
>;

export type CreateEnrollmentInput = {
  instituteId: string;
  studentId: string;
  routeId: string;
  pickupStopId: string;
  dropStopId: string;
  status?: EnrollmentStatus;
};

export type UpdateEnrollmentInput = Partial<
  Omit<CreateEnrollmentInput, "instituteId" | "studentId">
>;

export type UpsertTransportSettingsInput = {
  instituteId: string;
  defaultNotificationRadiusM?: number;
  defaultPickupBufferMins?: number;
  workingDays?: number[];
};

export async function createVehicle(
  input: CreateVehicleInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<VehicleDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.post<VehicleDto>("/api/v1/transport/vehicles", {
    institute_id: input.instituteId.trim(),
    vehicle_number: input.vehicleNumber.trim(),
    registration_number: input.registrationNumber.trim(),
    capacity: input.capacity,
    status: input.status,
    notes: input.notes,
  });
}

export async function updateVehicle(
  vehicleId: string,
  input: UpdateVehicleInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<VehicleDto> {
  assertApiMode();
  if (!isInstituteUuid(vehicleId)) {
    throw new Error("vehicle_id must be a valid UUID");
  }
  const body: Record<string, unknown> = {};
  if (input.vehicleNumber !== undefined) {
    body.vehicle_number = input.vehicleNumber.trim();
  }
  if (input.registrationNumber !== undefined) {
    body.registration_number = input.registrationNumber.trim();
  }
  if (input.capacity !== undefined) body.capacity = input.capacity;
  if (input.status !== undefined) body.status = input.status;
  if (input.notes !== undefined) body.notes = input.notes;
  if (Object.keys(body).length === 0) {
    throw new Error("At least one field is required");
  }
  return client.patch<VehicleDto>(
    `/api/v1/transport/vehicles/${vehicleId.trim()}`,
    body,
  );
}

export async function deleteVehicle(
  vehicleId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(vehicleId)) {
    throw new Error("vehicle_id must be a valid UUID");
  }
  await client.delete(`/api/v1/transport/vehicles/${vehicleId.trim()}`);
}

export async function createDriver(
  input: CreateDriverInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<DriverDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.post<DriverDto>("/api/v1/transport/drivers", {
    institute_id: input.instituteId.trim(),
    display_name: input.displayName.trim(),
    phone: input.phone.trim(),
    license_number: input.licenseNumber.trim(),
    license_expiry: input.licenseExpiry ?? null,
    status: input.status,
    notes: input.notes,
    user_profile_id: input.userProfileId ?? null,
  });
}

export async function updateDriver(
  driverId: string,
  input: UpdateDriverInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<DriverDto> {
  assertApiMode();
  if (!isInstituteUuid(driverId)) {
    throw new Error("driver_id must be a valid UUID");
  }
  const body: Record<string, unknown> = {};
  if (input.displayName !== undefined) body.display_name = input.displayName.trim();
  if (input.phone !== undefined) body.phone = input.phone.trim();
  if (input.licenseNumber !== undefined) {
    body.license_number = input.licenseNumber.trim();
  }
  if (input.licenseExpiry !== undefined) body.license_expiry = input.licenseExpiry;
  if (input.status !== undefined) body.status = input.status;
  if (input.notes !== undefined) body.notes = input.notes;
  if (Object.keys(body).length === 0) {
    throw new Error("At least one field is required");
  }
  return client.patch<DriverDto>(
    `/api/v1/transport/drivers/${driverId.trim()}`,
    body,
  );
}

export async function deleteDriver(
  driverId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(driverId)) {
    throw new Error("driver_id must be a valid UUID");
  }
  await client.delete(`/api/v1/transport/drivers/${driverId.trim()}`);
}

export async function createRoute(
  input: CreateRouteInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<RouteDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.post<RouteDto>("/api/v1/transport/routes", {
    institute_id: input.instituteId.trim(),
    name: input.name.trim(),
    vehicle_id: input.vehicleId ?? null,
    driver_id: input.driverId ?? null,
    status: input.status,
    config_status: input.configStatus,
  });
}

export async function updateRoute(
  routeId: string,
  input: UpdateRouteInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<RouteDto> {
  assertApiMode();
  if (!isInstituteUuid(routeId)) {
    throw new Error("route_id must be a valid UUID");
  }
  const body: Record<string, unknown> = {};
  if (input.name !== undefined) body.name = input.name.trim();
  if (input.vehicleId !== undefined) body.vehicle_id = input.vehicleId;
  if (input.driverId !== undefined) body.driver_id = input.driverId;
  if (input.status !== undefined) body.status = input.status;
  if (input.configStatus !== undefined) body.config_status = input.configStatus;
  if (Object.keys(body).length === 0) {
    throw new Error("At least one field is required");
  }
  return client.patch<RouteDto>(
    `/api/v1/transport/routes/${routeId.trim()}`,
    body,
  );
}

export async function deleteRoute(
  routeId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(routeId)) {
    throw new Error("route_id must be a valid UUID");
  }
  await client.delete(`/api/v1/transport/routes/${routeId.trim()}`);
}

export async function createStop(
  input: CreateStopInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<StopDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  if (!isInstituteUuid(input.routeId)) {
    throw new Error("route_id must be a valid UUID");
  }
  return client.post<StopDto>("/api/v1/transport/stops", {
    institute_id: input.instituteId.trim(),
    route_id: input.routeId.trim(),
    name: input.name.trim(),
    location_label: input.locationLabel.trim(),
    latitude: input.latitude,
    longitude: input.longitude,
    route_order: input.routeOrder,
    notification_radius_m: input.notificationRadiusM,
  });
}

export async function updateStop(
  stopId: string,
  input: UpdateStopInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<StopDto> {
  assertApiMode();
  if (!isInstituteUuid(stopId)) {
    throw new Error("stop_id must be a valid UUID");
  }
  const body: Record<string, unknown> = {};
  if (input.name !== undefined) body.name = input.name.trim();
  if (input.locationLabel !== undefined) {
    body.location_label = input.locationLabel.trim();
  }
  if (input.latitude !== undefined) body.latitude = input.latitude;
  if (input.longitude !== undefined) body.longitude = input.longitude;
  if (input.routeOrder !== undefined) body.route_order = input.routeOrder;
  if (input.notificationRadiusM !== undefined) {
    body.notification_radius_m = input.notificationRadiusM;
  }
  if (Object.keys(body).length === 0) {
    throw new Error("At least one field is required");
  }
  return client.patch<StopDto>(`/api/v1/transport/stops/${stopId.trim()}`, body);
}

export async function deleteStop(
  stopId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(stopId)) {
    throw new Error("stop_id must be a valid UUID");
  }
  await client.delete(`/api/v1/transport/stops/${stopId.trim()}`);
}

export async function createEnrollment(
  input: CreateEnrollmentInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<TransportEnrollmentDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  if (!isInstituteUuid(input.studentId)) {
    throw new Error("student_id must be a valid UUID");
  }
  if (!isInstituteUuid(input.routeId)) {
    throw new Error("route_id must be a valid UUID");
  }
  if (!isInstituteUuid(input.pickupStopId)) {
    throw new Error("pickup_stop_id must be a valid UUID");
  }
  if (!isInstituteUuid(input.dropStopId)) {
    throw new Error("drop_stop_id must be a valid UUID");
  }
  return client.post<TransportEnrollmentDto>("/api/v1/transport/enrollments", {
    institute_id: input.instituteId.trim(),
    student_id: input.studentId.trim(),
    route_id: input.routeId.trim(),
    pickup_stop_id: input.pickupStopId.trim(),
    drop_stop_id: input.dropStopId.trim(),
    status: input.status,
  });
}

export async function updateEnrollment(
  enrollmentId: string,
  input: UpdateEnrollmentInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<TransportEnrollmentDto> {
  assertApiMode();
  if (!isInstituteUuid(enrollmentId)) {
    throw new Error("enrollment_id must be a valid UUID");
  }
  const body: Record<string, unknown> = {};
  if (input.routeId !== undefined) body.route_id = input.routeId;
  if (input.pickupStopId !== undefined) body.pickup_stop_id = input.pickupStopId;
  if (input.dropStopId !== undefined) body.drop_stop_id = input.dropStopId;
  if (input.status !== undefined) body.status = input.status;
  if (Object.keys(body).length === 0) {
    throw new Error("At least one field is required");
  }
  return client.patch<TransportEnrollmentDto>(
    `/api/v1/transport/enrollments/${enrollmentId.trim()}`,
    body,
  );
}

export async function deleteEnrollment(
  enrollmentId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(enrollmentId)) {
    throw new Error("enrollment_id must be a valid UUID");
  }
  await client.delete(`/api/v1/transport/enrollments/${enrollmentId.trim()}`);
}

export async function upsertTransportSettings(
  input: UpsertTransportSettingsInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<TransportSettingsDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", input.instituteId.trim());
  const body: Record<string, unknown> = {};
  if (input.defaultNotificationRadiusM !== undefined) {
    body.default_notification_radius_m = input.defaultNotificationRadiusM;
  }
  if (input.defaultPickupBufferMins !== undefined) {
    body.default_pickup_buffer_mins = input.defaultPickupBufferMins;
  }
  if (input.workingDays !== undefined) body.working_days = input.workingDays;
  return client.put<TransportSettingsDto>(
    `/api/v1/transport/settings?${query.toString()}`,
    body,
  );
}
