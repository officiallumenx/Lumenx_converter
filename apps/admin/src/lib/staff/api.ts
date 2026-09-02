import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";

export type StaffAccountDto = {
  id: string;
  instituteId: string;
  userProfileId: string | null;
  displayName: string;
  phone: string | null;
  email: string | null;
  department: string;
  jobTitle: string | null;
  status: string;
};

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Staff API is only available in API auth mode");
  }
}

export async function listStaffAccounts(
  params: { instituteId: string; q?: string },
  client: AdminApiClient = getAdminApiClient(),
): Promise<StaffAccountDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.q?.trim()) query.set("q", params.q.trim());
  return client.get<StaffAccountDto[]>(`/api/v1/staff?${query.toString()}`);
}
