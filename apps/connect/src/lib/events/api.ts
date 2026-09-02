import { getConnectApiClient } from "@/lib/connect-api";
import type { ConnectApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import type { EventDto, ListCalendarParams, ListEventsParams } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Events API is only available in API auth mode");
  }
}

export async function listCalendarEvents(
  params: ListCalendarParams,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<EventDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  return client.get<EventDto[]>(`/api/v1/events/calendar?${query.toString()}`);
}

export async function listInstituteEvents(
  params: ListEventsParams,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<EventDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  query.set("source", params.source ?? "events");
  if (params.kind) query.set("kind", params.kind);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  return client.get<EventDto[]>(`/api/v1/events?${query.toString()}`);
}

export async function getEvent(
  eventId: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<EventDto> {
  assertApiMode();
  if (!isInstituteUuid(eventId)) {
    throw new Error("event_id must be a valid UUID");
  }
  return client.get<EventDto>(`/api/v1/events/${eventId.trim()}`);
}
