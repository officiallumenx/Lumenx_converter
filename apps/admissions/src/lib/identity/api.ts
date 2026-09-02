import { getAdmissionsApiClient } from "@/lib/admissions-api";
import type { AdmissionsApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Identity API is only available in API auth mode");
  }
}

export type ProfileDto = {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  status: "active" | "disabled";
  createdAt: string;
  updatedAt: string;
};

export async function getProfile(
  profileId: string,
  client: AdmissionsApiClient = getAdmissionsApiClient(),
): Promise<ProfileDto> {
  assertApiMode();
  if (!isInstituteUuid(profileId)) {
    throw new Error("profile_id must be a valid UUID");
  }
  return client.get<ProfileDto>(`/api/v1/profiles/${profileId.trim()}`);
}

export async function updateOwnProfile(
  profileId: string,
  input: { displayName?: string; phone?: string | null },
  client: AdmissionsApiClient = getAdmissionsApiClient(),
): Promise<ProfileDto> {
  assertApiMode();
  if (!isInstituteUuid(profileId)) {
    throw new Error("profile_id must be a valid UUID");
  }
  const body: Record<string, unknown> = {};
  if (input.displayName !== undefined) body.display_name = input.displayName.trim();
  if (input.phone !== undefined) body.phone = input.phone;
  return client.patch<ProfileDto>(`/api/v1/profiles/${profileId.trim()}`, body);
}
