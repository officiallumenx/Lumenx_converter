/**
 * Institutes API repository — call only from API-mode institute context.
 * Demo mode must never invoke these functions.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { InstituteDto, InstituteSettingsDto } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Institutes API is only available in API auth mode");
  }
}

export async function listInstitutes(
  client: AdminApiClient = getAdminApiClient(),
): Promise<InstituteDto[]> {
  assertApiMode();
  return client.get<InstituteDto[]>("/api/v1/institutes");
}

export async function getInstitute(
  instituteId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<InstituteDto> {
  assertApiMode();
  if (!isInstituteUuid(instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.get<InstituteDto>(`/api/v1/institutes/${instituteId.trim()}`);
}

export async function getInstituteSettings(
  instituteId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<InstituteSettingsDto> {
  assertApiMode();
  if (!isInstituteUuid(instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.get<InstituteSettingsDto>(
    `/api/v1/institutes/${instituteId.trim()}/settings`,
  );
}
