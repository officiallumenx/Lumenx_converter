import { useQuery } from "@tanstack/react-query";
import { isApiAuthMode } from "@/auth/auth-mode";
import { adminQueryRoots } from "@/lib/admin-queries/keys";
import { getPhotoSignedUrl } from "@/lib/photos/api";

/**
 * Resolves a short-lived signed URL for a student or teacher profile photo.
 * Looks up by person id — the API returns null when no photo is stored.
 */
export function usePersonPhotoUrl(
  kind: "student" | "teacher",
  personId: string | null | undefined,
  _photoAssetPath?: string | null | undefined,
) {
  return useQuery({
    queryKey: [adminQueryRoots.photos, "signed-url", kind, personId ?? ""] as const,
    enabled: isApiAuthMode() && Boolean(personId?.trim()),
    queryFn: () => getPhotoSignedUrl(kind, personId!.trim()),
    select: (data) => data.photoSignedUrl,
    staleTime: 25 * 60 * 1000,
  });
}
