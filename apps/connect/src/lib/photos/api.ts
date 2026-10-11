/**
 * Connect Photos API — resolve signed profile photo URLs.
 * Uses an in-memory TTL cache so remounts / list rows do not re-hit the API.
 */
import { getConnectApiClient } from "@/lib/connect-api";
import type { ConnectApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import {
  getCachedPhotoSignedUrl,
  setCachedPhotoSignedUrl,
} from "./signed-url-cache";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Photos API is only available in API auth mode");
  }
}

export type PhotoSignedUrlDto = {
  kind: "student" | "teacher" | "driver";
  id: string;
  photoAssetPath: string | null;
  photoSignedUrl: string | null;
  photoExpiresAt: string | null;
};

const inFlight = new Map<string, Promise<PhotoSignedUrlDto>>();

export async function getPhotoSignedUrl(
  kind: "student" | "teacher" | "driver",
  id: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<PhotoSignedUrlDto> {
  assertApiMode();
  if (!isInstituteUuid(id)) {
    throw new Error("id must be a valid UUID");
  }
  const trimmed = id.trim();
  const cached = getCachedPhotoSignedUrl(kind, trimmed);
  if (cached) {
    return { kind, id: trimmed, ...cached };
  }

  const flightKey = `${kind}:${trimmed}`;
  const existing = inFlight.get(flightKey);
  if (existing) return existing;

  const query = new URLSearchParams();
  query.set("kind", kind);
  query.set("id", trimmed);
  const promise = client
    .get<PhotoSignedUrlDto>(`/api/v1/photos/signed-url?${query}`)
    .then((dto) => {
      setCachedPhotoSignedUrl(kind, trimmed, {
        photoAssetPath: dto.photoAssetPath,
        photoSignedUrl: dto.photoSignedUrl,
        photoExpiresAt: dto.photoExpiresAt,
      });
      return dto;
    })
    .finally(() => {
      inFlight.delete(flightKey);
    });
  inFlight.set(flightKey, promise);
  return promise;
}

export {
  clearPhotoSignedUrlCache,
  invalidateCachedPhotoSignedUrl,
} from "./signed-url-cache";

export type SectionStudentPhotoDto = {
  id: string;
  photoAssetPath: string | null;
  photoSignedUrl: string | null;
  photoExpiresAt?: string | null;
};

/**
 * Batch student photos for one class/section — one HTTP round-trip, not N signed-url calls.
 */
export async function listSectionStudentPhotos(
  input: {
    instituteId: string;
    classId: string;
    sectionId: string;
  },
  client: ConnectApiClient = getConnectApiClient(),
): Promise<SectionStudentPhotoDto[]> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  if (!isInstituteUuid(input.classId) || !isInstituteUuid(input.sectionId)) {
    throw new Error("class_id and section_id must be valid UUIDs");
  }
  const query = new URLSearchParams();
  query.set("institute_id", input.instituteId.trim());
  query.set("class_id", input.classId.trim());
  query.set("section_id", input.sectionId.trim());
  const rows = await client.get<SectionStudentPhotoDto[]>(
    `/api/v1/photos/students?${query}`,
  );
  for (const row of rows) {
    if (!row?.id) continue;
    setCachedPhotoSignedUrl("student", row.id, {
      photoAssetPath: row.photoAssetPath ?? null,
      photoSignedUrl: row.photoSignedUrl ?? null,
      photoExpiresAt: row.photoExpiresAt ?? null,
    });
  }
  return rows;
}
