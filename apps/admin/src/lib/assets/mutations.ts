/**
 * Assets write API — create / update / delete. API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { AssetBucket, AssetCategory, AssetDto } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Assets API is only available in API auth mode");
  }
}

export type CreateAssetInput = {
  instituteId: string;
  bucket: AssetBucket;
  objectPath: string;
  category: AssetCategory;
  fileName?: string | null;
  contentType?: string | null;
  byteSize?: number | null;
  checksum?: string | null;
  visibility?: "private" | "institute" | "staff";
  status?: "active" | "pending" | "archived";
  linkedEntityKind?: string | null;
  linkedEntityId?: string | null;
  ownerUserId?: string | null;
};

export type UpdateAssetInput = {
  category?: AssetCategory;
  fileName?: string | null;
  contentType?: string | null;
  byteSize?: number | null;
  checksum?: string | null;
  visibility?: "private" | "institute" | "staff";
  status?: "active" | "pending" | "archived";
  linkedEntityKind?: string | null;
  linkedEntityId?: string | null;
  ownerUserId?: string | null;
};

export async function createAsset(
  input: CreateAssetInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<AssetDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.post<AssetDto>("/api/v1/assets", {
    institute_id: input.instituteId.trim(),
    bucket: input.bucket,
    object_path: input.objectPath.trim(),
    category: input.category,
    file_name: input.fileName,
    content_type: input.contentType,
    byte_size: input.byteSize,
    checksum: input.checksum,
    visibility: input.visibility,
    status: input.status,
    linked_entity_kind: input.linkedEntityKind,
    linked_entity_id: input.linkedEntityId,
    owner_user_id: input.ownerUserId,
  });
}

export async function updateAsset(
  assetId: string,
  input: UpdateAssetInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<AssetDto> {
  assertApiMode();
  if (!isInstituteUuid(assetId)) {
    throw new Error("asset_id must be a valid UUID");
  }
  const body: Record<string, unknown> = {};
  if (input.category !== undefined) body.category = input.category;
  if (input.fileName !== undefined) body.file_name = input.fileName;
  if (input.contentType !== undefined) body.content_type = input.contentType;
  if (input.byteSize !== undefined) body.byte_size = input.byteSize;
  if (input.checksum !== undefined) body.checksum = input.checksum;
  if (input.visibility !== undefined) body.visibility = input.visibility;
  if (input.status !== undefined) body.status = input.status;
  if (input.linkedEntityKind !== undefined) {
    body.linked_entity_kind = input.linkedEntityKind;
  }
  if (input.linkedEntityId !== undefined) {
    body.linked_entity_id = input.linkedEntityId;
  }
  if (input.ownerUserId !== undefined) body.owner_user_id = input.ownerUserId;
  if (Object.keys(body).length === 0) {
    throw new Error("At least one field is required");
  }
  return client.patch<AssetDto>(`/api/v1/assets/${assetId.trim()}`, body);
}

export async function deleteAsset(
  assetId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(assetId)) {
    throw new Error("asset_id must be a valid UUID");
  }
  await client.delete(`/api/v1/assets/${assetId.trim()}`);
}

export type UploadAssetInput = {
  instituteId: string;
  bucket: AssetBucket;
  category: AssetCategory;
  file: File;
  visibility?: "private" | "institute" | "staff";
};

export async function uploadAsset(
  input: UploadAssetInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<AssetDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const form = new FormData();
  form.set("institute_id", input.instituteId.trim());
  form.set("bucket", input.bucket);
  form.set("category", input.category);
  form.set("file", input.file);
  if (input.visibility) form.set("visibility", input.visibility);
  return client.uploadForm<AssetDto>("/api/v1/assets/upload", form);
}
