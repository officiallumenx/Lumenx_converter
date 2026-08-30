/**
 * Assets API repository — API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { AssetDto, ListAssetsParams } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Assets API is only available in API auth mode");
  }
}

export { assertApiMode };

export async function listAssets(
  params: ListAssetsParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<AssetDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.category) query.set("category", params.category);
  if (params.bucket) query.set("bucket", params.bucket);
  return client.get<AssetDto[]>(`/api/v1/assets?${query.toString()}`);
}

export type AssetSignedUrlDto = {
  signedUrl: string;
  expiresAt: string;
  assetId: string;
  bucket: AssetDto["bucket"];
  objectPath: string;
};

export async function getAssetSignedUrl(
  assetId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<AssetSignedUrlDto> {
  assertApiMode();
  if (!isInstituteUuid(assetId)) {
    throw new Error("asset id must be a valid UUID");
  }
  return client.get<AssetSignedUrlDto>(
    `/api/v1/assets/${assetId.trim()}/signed-url`,
  );
}
