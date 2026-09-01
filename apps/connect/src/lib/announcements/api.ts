import { getConnectApiClient } from "@/lib/connect-api";
import type { ConnectApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import type { AnnouncementDto, CreateAnnouncementInput, ListAnnouncementsParams } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Announcements API is only available in API auth mode");
  }
}

export async function listAnnouncements(
  params: ListAnnouncementsParams,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<AnnouncementDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }

  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.pinned !== undefined) {
    query.set("pinned", params.pinned ? "true" : "false");
  }
  if (params.audienceScope) {
    query.set("audience_scope", params.audienceScope);
  }

  return client.get<AnnouncementDto[]>(`/api/v1/announcements?${query.toString()}`);
}

export async function createAnnouncement(
  input: CreateAnnouncementInput,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<AnnouncementDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }

  return client.post<AnnouncementDto>("/api/v1/announcements", {
    institute_id: input.instituteId.trim(),
    title: input.title.trim(),
    body: input.body ?? null,
    audience_scope: input.audienceScope ?? "all",
    audience_label: input.audienceLabel ?? null,
    class_id: input.classId ?? null,
    section_id: input.sectionId ?? null,
    activity_team_id: input.activityTeamId ?? null,
    publish_now: input.publishNow ?? false,
    pinned: input.pinned ?? false,
  });
}

export async function getAnnouncement(
  id: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<AnnouncementDto> {
  assertApiMode();
  return client.get<AnnouncementDto>(`/api/v1/announcements/${id.trim()}`);
}

export async function recordAnnouncementView(
  id: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<AnnouncementDto> {
  assertApiMode();
  return client.post<AnnouncementDto>(`/api/v1/announcements/${id.trim()}/view`, {});
}
