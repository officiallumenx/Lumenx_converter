/**
 * Nexus licenses API — API auth mode.
 */
import { getNexusApiClient } from "@/lib/nexus-api";
import { isNexusApiMode } from "@/lib/auth-mode";
import type { NexusApiClient } from "@/lib/api";

export type LicensePlan = "core" | "plus" | "max";
export type LicenseCadence = "monthly" | "yearly";
export type EntitlementScope =
  | "admin_module"
  | "connect_portal"
  | "connect_module"
  | "platform_app";

export type ModuleEntitlementDto = {
  id: string;
  scope: EntitlementScope;
  portalId: string | null;
  targetId: string;
  enabled: boolean;
};

export type LicenseDto = {
  id: string;
  instituteId: string;
  plan: LicensePlan;
  cadence: LicenseCadence;
  startsOn: string | null;
  reminderDays: number[];
  entitlements: ModuleEntitlementDto[];
  createdAt: string;
  updatedAt: string;
};

export type UpsertLicenseInput = {
  instituteId: string;
  plan: LicensePlan;
  cadence: LicenseCadence;
  startsOn?: string | null;
  reminderDays?: number[];
  entitlements?: Array<{
    scope: EntitlementScope;
    portalId?: string | null;
    targetId: string;
    enabled?: boolean;
  }>;
};

function assertApiMode(): void {
  if (!isNexusApiMode()) {
    throw new Error("Nexus licenses API is only available in API auth mode");
  }
}

export async function listLicenses(
  instituteId?: string,
  client: NexusApiClient = getNexusApiClient(),
): Promise<LicenseDto[]> {
  assertApiMode();
  const query = instituteId
    ? `?${new URLSearchParams({ institute_id: instituteId }).toString()}`
    : "";
  return client.get<LicenseDto[]>(`/api/nexus/licenses${query}`);
}

export async function upsertLicense(
  input: UpsertLicenseInput,
  client: NexusApiClient = getNexusApiClient(),
): Promise<LicenseDto> {
  assertApiMode();
  return client.request<LicenseDto>("/api/nexus/licenses", {
    method: "PUT",
    body: input,
  });
}
