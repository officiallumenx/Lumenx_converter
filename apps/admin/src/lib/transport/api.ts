/**
 * Transport vehicles API repository — API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type {
  DriverDto,
  ListTransportDriversParams,
  ListTransportRoutesParams,
  ListTransportStopsParams,
  ListTransportVehiclesParams,
  RouteDto,
  StopDto,
  GetTransportSettingsParams,
  TransportSettingsDto,
  VehicleDto,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Transport API is only available in API auth mode");
  }
}

export { assertApiMode };

export async function listTransportVehicles(
  params: ListTransportVehiclesParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<VehicleDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  return client.get<VehicleDto[]>(
    `/api/v1/transport/vehicles?${query.toString()}`,
  );
}

export async function listTransportDrivers(
  params: ListTransportDriversParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<DriverDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  return client.get<DriverDto[]>(
    `/api/v1/transport/drivers?${query.toString()}`,
  );
}

export async function listTransportRoutes(
  params: ListTransportRoutesParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<RouteDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  return client.get<RouteDto[]>(
    `/api/v1/transport/routes?${query.toString()}`,
  );
}

export async function listTransportStops(
  params: ListTransportStopsParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<StopDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.routeId)) {
    throw new Error("route_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("route_id", params.routeId.trim());
  return client.get<StopDto[]>(
    `/api/v1/transport/stops?${query.toString()}`,
  );
}

export async function getTransportSettings(
  params: GetTransportSettingsParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<TransportSettingsDto> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  return client.get<TransportSettingsDto>(
    `/api/v1/transport/settings?${query.toString()}`,
  );
}
