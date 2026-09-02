import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type {
  GetTransportAnalyticsParams,
  ListTransportBoardingMarksParams,
  ListTransportEmergenciesParams,
  ListTransportTripsParams,
  TransportAnalyticsDto,
  TransportBoardingEventDto,
  TransportEmergencyDto,
  TransportTripDto,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Transport ops API is only available in API auth mode");
  }
}

export async function listTransportTrips(
  params: ListTransportTripsParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<TransportTripDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.tripDate?.trim()) query.set("trip_date", params.tripDate.trim());
  return client.get<TransportTripDto[]>(`/api/v1/transport/trips?${query.toString()}`);
}

export async function listTransportBoardingMarks(
  params: ListTransportBoardingMarksParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<TransportBoardingEventDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.tripDate?.trim()) query.set("trip_date", params.tripDate.trim());
  return client.get<TransportBoardingEventDto[]>(
    `/api/v1/transport/boarding-marks?${query.toString()}`,
  );
}

export async function listTransportEmergencies(
  params: ListTransportEmergenciesParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<TransportEmergencyDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.status) query.set("status", params.status);
  return client.get<TransportEmergencyDto[]>(
    `/api/v1/transport/emergencies?${query.toString()}`,
  );
}

export async function acknowledgeTransportEmergencyApi(
  emergencyId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<TransportEmergencyDto> {
  assertApiMode();
  return client.post<TransportEmergencyDto>(
    `/api/v1/transport/emergencies/${emergencyId}/acknowledge`,
  );
}

export async function resolveTransportEmergencyApi(
  emergencyId: string,
  resolveNote?: string | null,
  client: AdminApiClient = getAdminApiClient(),
): Promise<TransportEmergencyDto> {
  assertApiMode();
  return client.post<TransportEmergencyDto>(
    `/api/v1/transport/emergencies/${emergencyId}/resolve`,
    { resolve_note: resolveNote ?? null },
  );
}

export async function getTransportAnalytics(
  params: GetTransportAnalyticsParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<TransportAnalyticsDto> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.tripDate?.trim()) query.set("trip_date", params.tripDate.trim());
  return client.get<TransportAnalyticsDto>(
    `/api/v1/transport/analytics?${query.toString()}`,
  );
}
