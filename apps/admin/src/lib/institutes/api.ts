/**
 * Institutes API repository — call only from API-mode institute context.
 * Demo mode must never invoke these functions.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import type { InstituteDto } from "./types";

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
  return client.get<InstituteDto>(`/api/v1/institutes/${instituteId}`);
}
