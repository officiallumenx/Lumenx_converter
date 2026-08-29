/**
 * Announcements write API — create / update / publish / archive / delete. API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { AnnouncementAudienceScope, AnnouncementDto } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Announcements API is only available in API auth mode");
  }
}

export type CreateAnnouncementInput = {
  instituteId: string;
  title: string;
  body?: string | null;
  audienceScope?: AnnouncementAudienceScope;
  audienceLabel?: string | null;
  classId?: string | null;
  sectionId?: string | null;
  scheduledAt?: string | null;
  publishNow?: boolean;
  pinned?: boolean;
  pinUntil?: string | null;
};

export type UpdateAnnouncementInput = {
  title?: string;
  body?: string | null;
  audienceScope?: AnnouncementAudienceScope;
  audienceLabel?: string | null;
  classId?: string | null;
  sectionId?: string | null;
  scheduledAt?: string | null;
  pinned?: boolean;
  pinUntil?: string | null;
};

export async function createAnnouncement(
  input: CreateAnnouncementInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<AnnouncementDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.post<AnnouncementDto>("/api/v1/announcements", {
    institute_id: input.instituteId.trim(),
    title: input.title.trim(),
    body: input.body,
    audience_scope: input.audienceScope,
    audience_label: input.audienceLabel,
    class_id: input.classId,
    section_id: input.sectionId,
    scheduled_at: input.scheduledAt,
    publish_now: input.publishNow,
    pinned: input.pinned,
    pin_until: input.pinUntil,
  });
}

export async function updateAnnouncement(
  announcementId: string,
  input: UpdateAnnouncementInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<AnnouncementDto> {
  assertApiMode();
  if (!isInstituteUuid(announcementId)) {
    throw new Error("announcement_id must be a valid UUID");
  }
  const body: Record<string, unknown> = {};
  if (input.title !== undefined) body.title = input.title.trim();
  if (input.body !== undefined) body.body = input.body;
  if (input.audienceScope !== undefined) body.audience_scope = input.audienceScope;
  if (input.audienceLabel !== undefined) body.audience_label = input.audienceLabel;
  if (input.classId !== undefined) body.class_id = input.classId;
  if (input.sectionId !== undefined) body.section_id = input.sectionId;
  if (input.scheduledAt !== undefined) body.scheduled_at = input.scheduledAt;
  if (input.pinned !== undefined) body.pinned = input.pinned;
  if (input.pinUntil !== undefined) body.pin_until = input.pinUntil;
  if (Object.keys(body).length === 0) {
    throw new Error("At least one field is required");
  }
  return client.patch<AnnouncementDto>(
    `/api/v1/announcements/${announcementId.trim()}`,
    body,
  );
}

export async function publishAnnouncement(
  announcementId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<AnnouncementDto> {
  assertApiMode();
  if (!isInstituteUuid(announcementId)) {
    throw new Error("announcement_id must be a valid UUID");
  }
  return client.post<AnnouncementDto>(
    `/api/v1/announcements/${announcementId.trim()}/publish`,
  );
}

export async function archiveAnnouncement(
  announcementId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<AnnouncementDto> {
  assertApiMode();
  if (!isInstituteUuid(announcementId)) {
    throw new Error("announcement_id must be a valid UUID");
  }
  return client.post<AnnouncementDto>(
    `/api/v1/announcements/${announcementId.trim()}/archive`,
  );
}

export async function deleteAnnouncement(
  announcementId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(announcementId)) {
    throw new Error("announcement_id must be a valid UUID");
  }
  await client.delete(`/api/v1/announcements/${announcementId.trim()}`);
}
