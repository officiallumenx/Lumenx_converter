import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  getAssetSignedUrlForActor,
  uploadAssetForActor,
  type AssetSignedUrlDto,
} from "../assets/service.js";
import { findAssetByBucketPath, listAssets } from "../assets/repository.js";
import type {
  AssetBucket,
  AssetCategory,
  AssetLinkedEntityKind,
} from "../assets/types.js";

export async function persistInstitutePdfAsset(
  admin: SupabaseClient,
  actor: Actor,
  input: {
    instituteId: string;
    bucket: AssetBucket;
    category: AssetCategory;
    fileName: string;
    body: Uint8Array;
    linkedEntityKind: AssetLinkedEntityKind;
    linkedEntityId: string;
  },
): Promise<{ objectPath: string; assetId: string }> {
  const body = input.body.buffer.slice(
    input.body.byteOffset,
    input.body.byteOffset + input.body.byteLength,
  ) as ArrayBuffer;

  const asset = await uploadAssetForActor(admin, actor, {
    instituteId: input.instituteId,
    bucket: input.bucket,
    category: input.category,
    fileName: input.fileName,
    contentType: "application/pdf",
    byteSize: input.body.byteLength,
    body,
    linkedEntityKind: input.linkedEntityKind,
    linkedEntityId: input.linkedEntityId,
    visibility: "institute",
  });

  return { objectPath: asset.objectPath, assetId: asset.id };
}

export async function resolveLinkedAssetSignedUrl(
  admin: SupabaseClient,
  actor: Actor,
  input: {
    instituteId: string;
    linkedEntityKind: AssetLinkedEntityKind;
    linkedEntityId: string;
    bucket: AssetBucket;
    objectPath: string | null;
    expiresInSec?: number;
  },
): Promise<AssetSignedUrlDto> {
  const linked = await listAssets(admin, {
    instituteId: input.instituteId,
    linkedEntityKind: input.linkedEntityKind,
    linkedEntityId: input.linkedEntityId,
  });
  const asset =
    linked[0] ??
    (input.objectPath
      ? await findAssetByBucketPath(
          admin,
          input.instituteId,
          input.bucket,
          input.objectPath,
        )
      : null);

  if (!asset) {
    throw AppError.notFound("Document file not found");
  }

  return getAssetSignedUrlForActor(
    admin,
    actor,
    asset.id,
    input.expiresInSec,
  );
}
