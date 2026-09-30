import { useQuery } from "@tanstack/react-query";
import { isApiAuthMode } from "@/auth/auth-mode";
import { adminQueryKeys } from "@/lib/admin-queries/keys";
import { getPhotoSignedUrl } from "@/lib/photos/api";
import {
  isSignedPhotoUrlUsable,
  signedPhotoStaleTimeMs,
} from "@/lib/photos/signed-url";

/**
 * Resolves a short-lived signed URL for a student or teacher profile photo.
 * Looks up by person id — the API returns null when no photo is stored.
 * Expired persisted URLs are treated as stale so reopen refetches quickly.
 */
export function usePersonPhotoUrl(
  kind: "student" | "teacher",
  personId: string | null | undefined,
  _photoAssetPath?: string | null | undefined,
) {
  return useQuery({
    queryKey: adminQueryKeys.photosSignedUrl(kind, personId ?? ""),
    enabled: isApiAuthMode() && Boolean(personId?.trim()),
    queryFn: () => getPhotoSignedUrl(kind, personId!.trim()),
    select: (data) =>
      isSignedPhotoUrlUsable(data.photoSignedUrl, data.photoExpiresAt)
        ? data.photoSignedUrl
        : null,
    staleTime: (query) =>
      signedPhotoStaleTimeMs(query.state.data?.photoExpiresAt ?? null),
    refetchOnMount: true,
    refetchOnReconnect: true,
  });
}
