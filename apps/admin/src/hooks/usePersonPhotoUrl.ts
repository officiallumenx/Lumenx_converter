import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { isApiAuthMode } from "@/auth/auth-mode";
import { adminQueryKeys } from "@/lib/admin-queries/keys";
import { getPhotoSignedUrl } from "@/lib/photos/api";
import {
  isSignedPhotoUrlUsable,
  signedPhotoStaleTimeMs,
} from "@/lib/photos/signed-url";

/**
 * Resolves a short-lived signed URL for a student, teacher, or driver profile photo.
 * Skips the network when there is no stored photo asset path.
 * Pass `enabled: false` until the avatar is near-viewport to avoid N+1 list storms.
 */
export function usePersonPhotoUrl(
  kind: "student" | "teacher" | "driver",
  personId: string | null | undefined,
  photoAssetPath?: string | null | undefined,
  opts?: { enabled?: boolean },
) {
  const hasPhoto = Boolean(photoAssetPath?.trim());
  const fetchEnabled = opts?.enabled !== false;
  return useQuery({
    queryKey: adminQueryKeys.photosSignedUrl(kind, personId ?? ""),
    enabled:
      isApiAuthMode() &&
      Boolean(personId?.trim()) &&
      hasPhoto &&
      fetchEnabled,
    queryFn: () => getPhotoSignedUrl(kind, personId!.trim()),
    select: (data) =>
      isSignedPhotoUrlUsable(data.photoSignedUrl, data.photoExpiresAt)
        ? data.photoSignedUrl
        : null,
    staleTime: (query) =>
      signedPhotoStaleTimeMs(query.state.data?.photoExpiresAt ?? null),
    placeholderData: keepPreviousData,
    refetchOnMount: false,
    refetchOnReconnect: true,
  });
}
