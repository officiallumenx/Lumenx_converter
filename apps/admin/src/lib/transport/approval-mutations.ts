import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import type {
  RouteDto,
  StopDto,
  TransportEnrollmentDto,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Transport API is only available in API auth mode");
  }
}

export async function approveTransportRoute(
  routeId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<RouteDto> {
  assertApiMode();
  return client.post<RouteDto>(`/api/v1/transport/routes/${routeId}/approve`);
}

export async function rejectTransportRoute(
  routeId: string,
  reason: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<RouteDto> {
  assertApiMode();
  return client.post<RouteDto>(`/api/v1/transport/routes/${routeId}/reject`, {
    reason,
  });
}

export async function approveTransportStop(
  stopId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<StopDto> {
  assertApiMode();
  return client.post<StopDto>(`/api/v1/transport/stops/${stopId}/approve`);
}

export async function rejectTransportStop(
  stopId: string,
  reason: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<StopDto> {
  assertApiMode();
  return client.post<StopDto>(`/api/v1/transport/stops/${stopId}/reject`, {
    reason,
  });
}

export async function approveTransportEnrollment(
  enrollmentId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<TransportEnrollmentDto> {
  assertApiMode();
  return client.post<TransportEnrollmentDto>(
    `/api/v1/transport/enrollments/${enrollmentId}/approve`,
  );
}

export async function rejectTransportEnrollment(
  enrollmentId: string,
  reason: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<TransportEnrollmentDto> {
  assertApiMode();
  return client.post<TransportEnrollmentDto>(
    `/api/v1/transport/enrollments/${enrollmentId}/reject`,
    { reason },
  );
}
