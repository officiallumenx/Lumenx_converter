import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  AssetBucket,
  AssetCategory,
  AssetStatus,
  AssetVisibility,
  CreateAssetInput,
  ListAssetsFilter,
  StoredAssetRow,
} from "./types.js";

export const ASSET_COLS =
  "id, institute_id, bucket, object_path, category, file_name, content_type, byte_size, checksum, visibility, status, linked_entity_kind, linked_entity_id, owner_user_id, created_by_user_id, created_at, updated_at, deleted_at";

export async function listAssets(
  admin: SupabaseClient,
  filter: ListAssetsFilter,
): Promise<StoredAssetRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = admin
    .from("stored_asset")
    .select(ASSET_COLS)
    .eq("institute_id", filter.instituteId)
    .is("deleted_at", null);

  if (filter.category) query = query.eq("category", filter.category);
  if (filter.bucket) query = query.eq("bucket", filter.bucket);
  if (filter.visibility) query = query.eq("visibility", filter.visibility);
  if (filter.linkedEntityKind) {
    query = query.eq("linked_entity_kind", filter.linkedEntityKind);
  }
  if (filter.linkedEntityId) {
    query = query.eq("linked_entity_id", filter.linkedEntityId);
  }

  const result = await query;
  return ensureDbOk(result) as StoredAssetRow[];
}

export async function findAssetById(
  admin: SupabaseClient,
  id: string,
): Promise<StoredAssetRow | null> {
  const result = await admin
    .from("stored_asset")
    .select(ASSET_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as StoredAssetRow | null) ?? null;
}

export async function findAssetByBucketPath(
  admin: SupabaseClient,
  instituteId: string,
  bucket: AssetBucket,
  objectPath: string,
): Promise<StoredAssetRow | null> {
  const result = await admin
    .from("stored_asset")
    .select(ASSET_COLS)
    .eq("institute_id", instituteId)
    .eq("bucket", bucket)
    .eq("object_path", objectPath)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as StoredAssetRow | null) ?? null;
}

export async function insertAsset(
  admin: SupabaseClient,
  input: CreateAssetInput & {
    createdByUserId: string;
    ownerUserId: string | null;
    visibility: AssetVisibility;
    status: AssetStatus;
    category: AssetCategory;
  },
): Promise<StoredAssetRow> {
  const result = await admin
    .from("stored_asset")
    .insert({
      institute_id: input.instituteId,
      bucket: input.bucket,
      object_path: input.objectPath,
      category: input.category,
      file_name: input.fileName?.trim() || null,
      content_type: input.contentType?.trim() || null,
      byte_size: input.byteSize ?? null,
      checksum: input.checksum?.trim() || null,
      visibility: input.visibility,
      status: input.status,
      linked_entity_kind: input.linkedEntityKind ?? null,
      linked_entity_id: input.linkedEntityId ?? null,
      owner_user_id: input.ownerUserId,
      created_by_user_id: input.createdByUserId,
    })
    .select(ASSET_COLS)
    .single();
  return ensureDbOk(result) as StoredAssetRow;
}

export async function updateAssetFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<StoredAssetRow | null> {
  const result = await admin
    .from("stored_asset")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(ASSET_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as StoredAssetRow | null) ?? null;
}

export async function softDeleteAsset(
  admin: SupabaseClient,
  id: string,
): Promise<StoredAssetRow | null> {
  const result = await admin
    .from("stored_asset")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(ASSET_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as StoredAssetRow | null) ?? null;
}
