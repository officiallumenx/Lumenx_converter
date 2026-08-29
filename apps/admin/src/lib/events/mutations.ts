/**
 * Events write API — create / update / publish / cancel / delete.
 * Shared by calendar (source: calendar) and events (source: events) routes.
 * API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type {
  EventAudienceScope,
  EventDto,
  EventKind,
  EventReminder,
  EventSource,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Events API is only available in API auth mode");
  }
}

export type CreateEventInput = {
  instituteId: string;
  title: string;
  kind: EventKind;
  customKindLabel?: string | null;
  source: EventSource;
  startsOn: string;
  endsOn?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  audienceScope?: EventAudienceScope;
  audienceLabel?: string | null;
  classId?: string | null;
  sectionId?: string | null;
  location?: string | null;
  description?: string | null;
  reminder?: EventReminder;
  bannerAssetPath?: string | null;
  registrationRequired?: boolean;
  recurrence?: string | null;
  published?: boolean;
};

export type UpdateEventInput = {
  title?: string;
  kind?: EventKind;
  customKindLabel?: string | null;
  source?: EventSource;
  startsOn?: string;
  endsOn?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  audienceScope?: EventAudienceScope;
  audienceLabel?: string | null;
  classId?: string | null;
  sectionId?: string | null;
  location?: string | null;
  description?: string | null;
  reminder?: EventReminder;
  bannerAssetPath?: string | null;
  registrationRequired?: boolean;
  recurrence?: string | null;
};

function toCreateBody(input: CreateEventInput): Record<string, unknown> {
  return {
    institute_id: input.instituteId.trim(),
    title: input.title.trim(),
    kind: input.kind,
    custom_kind_label: input.customKindLabel,
    source: input.source,
    starts_on: input.startsOn,
    ends_on: input.endsOn,
    start_time: input.startTime,
    end_time: input.endTime,
    audience_scope: input.audienceScope,
    audience_label: input.audienceLabel,
    class_id: input.classId,
    section_id: input.sectionId,
    location: input.location,
    description: input.description,
    reminder: input.reminder,
    banner_asset_path: input.bannerAssetPath,
    registration_required: input.registrationRequired,
    recurrence: input.recurrence,
    published: input.published,
  };
}

function toUpdateBody(input: UpdateEventInput): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (input.title !== undefined) body.title = input.title.trim();
  if (input.kind !== undefined) body.kind = input.kind;
  if (input.customKindLabel !== undefined) {
    body.custom_kind_label = input.customKindLabel;
  }
  if (input.source !== undefined) body.source = input.source;
  if (input.startsOn !== undefined) body.starts_on = input.startsOn;
  if (input.endsOn !== undefined) body.ends_on = input.endsOn;
  if (input.startTime !== undefined) body.start_time = input.startTime;
  if (input.endTime !== undefined) body.end_time = input.endTime;
  if (input.audienceScope !== undefined) body.audience_scope = input.audienceScope;
  if (input.audienceLabel !== undefined) body.audience_label = input.audienceLabel;
  if (input.classId !== undefined) body.class_id = input.classId;
  if (input.sectionId !== undefined) body.section_id = input.sectionId;
  if (input.location !== undefined) body.location = input.location;
  if (input.description !== undefined) body.description = input.description;
  if (input.reminder !== undefined) body.reminder = input.reminder;
  if (input.bannerAssetPath !== undefined) {
    body.banner_asset_path = input.bannerAssetPath;
  }
  if (input.registrationRequired !== undefined) {
    body.registration_required = input.registrationRequired;
  }
  if (input.recurrence !== undefined) body.recurrence = input.recurrence;
  return body;
}

export async function createEvent(
  input: CreateEventInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<EventDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.post<EventDto>("/api/v1/events", toCreateBody(input));
}

export async function updateEvent(
  eventId: string,
  input: UpdateEventInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<EventDto> {
  assertApiMode();
  if (!isInstituteUuid(eventId)) {
    throw new Error("event_id must be a valid UUID");
  }
  const body = toUpdateBody(input);
  if (Object.keys(body).length === 0) {
    throw new Error("At least one field is required");
  }
  return client.patch<EventDto>(`/api/v1/events/${eventId.trim()}`, body);
}

export async function publishEvent(
  eventId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<EventDto> {
  assertApiMode();
  if (!isInstituteUuid(eventId)) {
    throw new Error("event_id must be a valid UUID");
  }
  return client.post<EventDto>(`/api/v1/events/${eventId.trim()}/publish`);
}

export async function cancelEvent(
  eventId: string,
  input: { cancellationReason?: string | null } = {},
  client: AdminApiClient = getAdminApiClient(),
): Promise<EventDto> {
  assertApiMode();
  if (!isInstituteUuid(eventId)) {
    throw new Error("event_id must be a valid UUID");
  }
  return client.post<EventDto>(`/api/v1/events/${eventId.trim()}/cancel`, {
    cancellation_reason: input.cancellationReason,
  });
}

export async function deleteEvent(
  eventId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(eventId)) {
    throw new Error("event_id must be a valid UUID");
  }
  await client.delete(`/api/v1/events/${eventId.trim()}`);
}
