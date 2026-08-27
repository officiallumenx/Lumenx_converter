/**
 * Announcements API repository — API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { AnnouncementDto } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Announcements API is only available in API auth mode");
  }
}

export type ListAnnouncementsParams = {
  instituteId: string;
  status?: AnnouncementDto["status"];
  audienceScope?: AnnouncementDto["audienceScope"];
  pinned?: boolean;
};

export async function listAnnouncements(
  params: ListAnnouncementsParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<AnnouncementDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }

  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.status) query.set("status", params.status);
  if (params.audienceScope) query.set("audience_scope", params.audienceScope);
  if (params.pinned !== undefined) {
    query.set("pinned", params.pinned ? "true" : "false");
  }

  return client.get<AnnouncementDto[]>(
    `/api/v1/announcements?${query.toString()}`,
  );
}
