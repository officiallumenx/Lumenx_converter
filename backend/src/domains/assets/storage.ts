import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { AssetBucket } from "./types.js";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const DEFAULT_SIGNED_URL_TTL_SEC = 3600;
export const MAX_SIGNED_URL_TTL_SEC = 86_400;

const BUCKET_IDS: ReadonlySet<string> = new Set([
  "institute-branding",
  "student-media",
  "certificates",
  "admission-docs",
  "career-docs",
  "generated-documents",
]);

export function assertAssetBucket(bucket: string): AssetBucket {
  if (!BUCKET_IDS.has(bucket)) {
    throw AppError.validation("Invalid bucket", { bucket: ["Unknown bucket"] });
  }
  return bucket as AssetBucket;
}

export function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop()?.trim() ?? "";
  const cleaned = base.replace(/[^\w.\-()+ ]/g, "_").slice(0, 200);
  return cleaned.length > 0 ? cleaned : "file";
}

/** Institute-scoped object key: {instituteId}/{assetId}/{fileName} */
export function buildInstituteObjectPath(
  instituteId: string,
  assetId: string,
  fileName: string,
): string {
  return `${instituteId}/${assetId}/${sanitizeFileName(fileName)}`;
}

export async function uploadToStorage(
  admin: SupabaseClient,
  bucket: AssetBucket,
  objectPath: string,
  body: ArrayBuffer,
  contentType: string,
): Promise<void> {
  const { error } = await admin.storage.from(bucket).upload(objectPath, body, {
    contentType,
    upsert: false,
    cacheControl: "3600",
  });
  if (error) {
    if (/already exists/i.test(error.message)) {
      throw AppError.conflict("Storage object already exists");
    }
    throw AppError.internal(`Storage upload failed: ${error.message}`);
  }
}

export async function removeFromStorage(
  admin: SupabaseClient,
  bucket: AssetBucket,
  objectPath: string,
): Promise<void> {
  const { error } = await admin.storage.from(bucket).remove([objectPath]);
  if (error) {
    throw AppError.internal(`Storage delete failed: ${error.message}`);
  }
}

export async function createStorageSignedUrl(
  admin: SupabaseClient,
  bucket: AssetBucket,
  objectPath: string,
  expiresInSec: number,
): Promise<{ signedUrl: string; expiresAt: string }> {
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(objectPath, expiresInSec);
  if (error || !data?.signedUrl) {
    throw AppError.internal(
      error?.message ?? "Failed to create signed URL",
    );
  }
  const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();
  return { signedUrl: data.signedUrl, expiresAt };
}

export async function listStorageBuckets(
  admin: SupabaseClient,
): Promise<Array<{ id: string; name: string; public: boolean }>> {
  const { data, error } = await admin.storage.listBuckets();
  if (error) {
    throw AppError.internal(`Storage list failed: ${error.message}`);
  }
  return (data ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    public: b.public,
  }));
}
