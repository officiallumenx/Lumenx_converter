/**
 * Connect Photos API — resolve signed profile photo URLs.
 */
import { getConnectApiClient } from "@/lib/connect-api";
import type { ConnectApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Photos API is only available in API auth mode");
  }
}

export type PhotoSignedUrlDto = {
  kind: "student" | "teacher";
  id: string;
  photoAssetPath: string | null;
  photoSignedUrl: string | null;
  photoExpiresAt: string | null;
};

export async function getPhotoSignedUrl(
  kind: "student" | "teacher",
  id: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<PhotoSignedUrlDto> {
  assertApiMode();
  if (!isInstituteUuid(id)) {
    throw new Error("id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("kind", kind);
  query.set("id", id.trim());
  return client.get<PhotoSignedUrlDto>(`/api/v1/photos/signed-url?${query}`);
}
