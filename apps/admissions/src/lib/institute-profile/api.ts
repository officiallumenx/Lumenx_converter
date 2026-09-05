import { getAdmissionsApiClient } from "@/lib/admissions-api";
import type { AdmissionsApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import type { DemoInstituteProfile } from "@lumenx/types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Institute profile API is only available in API auth mode");
  }
}

export async function getInstitutePublicProfile(
  instituteId: string,
  client: AdmissionsApiClient = getAdmissionsApiClient(),
): Promise<{ instituteId: string; profile: DemoInstituteProfile }> {
  assertApiMode();
  if (!isInstituteUuid(instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.get<{ instituteId: string; profile: DemoInstituteProfile }>(
    `/api/v1/institutes/${instituteId.trim()}/public-profile`,
  );
}

export async function updateInstituteSettings(
  instituteId: string,
  input: { settings: Record<string, unknown> },
  client: AdmissionsApiClient = getAdmissionsApiClient(),
): Promise<{ instituteId: string; settings: Record<string, unknown> }> {
  assertApiMode();
  if (!isInstituteUuid(instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.patch<{ instituteId: string; settings: Record<string, unknown> }>(
    `/api/v1/institutes/${instituteId.trim()}/settings`,
    input,
  );
}
