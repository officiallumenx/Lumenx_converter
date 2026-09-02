import { getConnectApiClient } from "@/lib/connect-api";
import type { ConnectApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import type { PortalSchoolAlertDto } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("School alerts API is only available in API auth mode");
  }
}

export async function listPortalSchoolAlerts(
  params: { instituteId: string },
  client: ConnectApiClient = getConnectApiClient(),
): Promise<PortalSchoolAlertDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams({ institute_id: params.instituteId.trim() });
  return client.get<PortalSchoolAlertDto[]>(
    `/api/v1/school-alerts/portal/inbox?${query.toString()}`,
  );
}

export async function acknowledgePortalSchoolAlert(
  recipientId: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<PortalSchoolAlertDto> {
  assertApiMode();
  return client.patch<PortalSchoolAlertDto>(
    `/api/v1/school-alerts/portal/inbox/${recipientId.trim()}/acknowledge`,
  );
}

export async function acknowledgeAllPortalSchoolAlerts(
  instituteId: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<{ acknowledged: number }> {
  assertApiMode();
  return client.post<{ acknowledged: number }>(
    "/api/v1/school-alerts/portal/inbox/acknowledge-all",
    { institute_id: instituteId.trim() },
  );
}
