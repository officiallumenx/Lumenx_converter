/**
 * Nexus registration review API — call only in API auth mode.
 */
import { getNexusApiClient } from "@/lib/nexus-api";
import { isNexusApiMode } from "@/lib/auth-mode";
import type { NexusApiClient } from "@/lib/api";
import type {
  InstituteRegistrationDto,
  InstituteRegistrationStatus,
  RegistrationStatusFilter,
} from "./types";

function assertApiMode(): void {
  if (!isNexusApiMode()) {
    throw new Error("Nexus registrations API is only available in API auth mode");
  }
}

function listPath(status?: InstituteRegistrationStatus): string {
  if (!status) return "/api/nexus/registrations";
  const params = new URLSearchParams({ status });
  return `/api/nexus/registrations?${params.toString()}`;
}

export async function listRegistrations(
  filter: RegistrationStatusFilter = "all",
  client: NexusApiClient = getNexusApiClient(),
): Promise<InstituteRegistrationDto[]> {
  assertApiMode();
  const path =
    filter === "all" ? listPath() : listPath(filter as InstituteRegistrationStatus);
  return client.get<InstituteRegistrationDto[]>(path);
}

export async function approveRegistration(
  registrationId: string,
  client: NexusApiClient = getNexusApiClient(),
): Promise<InstituteRegistrationDto> {
  assertApiMode();
  return client.post<InstituteRegistrationDto>(
    `/api/nexus/registrations/${registrationId}/approve`,
  );
}

export async function rejectRegistration(
  registrationId: string,
  reason: string,
  client: NexusApiClient = getNexusApiClient(),
): Promise<InstituteRegistrationDto> {
  assertApiMode();
  return client.post<InstituteRegistrationDto>(
    `/api/nexus/registrations/${registrationId}/reject`,
    { reason },
  );
}
