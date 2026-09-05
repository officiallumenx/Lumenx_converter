/**
 * Nexus institutes directory API — API auth mode.
 */
import { getNexusApiClient } from "@/lib/nexus-api";
import { isNexusApiMode } from "@/lib/auth-mode";
import type { NexusApiClient } from "@/lib/api";

export type InstituteKind =
  | "school"
  | "junior_college"
  | "degree_college"
  | "engineering"
  | "university";

export type InstituteStatus = "active" | "inactive" | "suspended" | "archived";

export type InstituteDto = {
  id: string;
  code: string;
  name: string;
  kind: InstituteKind;
  status: InstituteStatus;
  createdAt: string;
  updatedAt: string;
};

function assertApiMode(): void {
  if (!isNexusApiMode()) {
    throw new Error("Nexus institutes API is only available in API auth mode");
  }
}

export async function listInstitutes(
  client: NexusApiClient = getNexusApiClient(),
): Promise<InstituteDto[]> {
  assertApiMode();
  return client.get<InstituteDto[]>("/api/v1/institutes");
}

export async function getInstitute(
  instituteId: string,
  client: NexusApiClient = getNexusApiClient(),
): Promise<InstituteDto> {
  assertApiMode();
  return client.get<InstituteDto>(
    `/api/v1/institutes/${encodeURIComponent(instituteId.trim())}`,
  );
}
