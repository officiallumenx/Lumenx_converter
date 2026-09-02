import { isApiAuthMode } from "@/lib/auth/auth-mode";
import { transportFetch } from "@/lib/transport/events-api-client";
import type { EventDto } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Events API requires API auth mode");
  }
}

export async function listCalendarEvents(params: {
  instituteId: string;
  from?: string;
  to?: string;
}): Promise<EventDto[]> {
  assertApiMode();
  const query = new URLSearchParams({ institute_id: params.instituteId.trim() });
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  return transportFetch<EventDto[]>(`/api/v1/events/calendar?${query.toString()}`);
}

export async function listInstituteEvents(params: {
  instituteId: string;
  source?: "calendar" | "events";
}): Promise<EventDto[]> {
  assertApiMode();
  const query = new URLSearchParams({
    institute_id: params.instituteId.trim(),
    source: params.source ?? "events",
  });
  return transportFetch<EventDto[]>(`/api/v1/events?${query.toString()}`);
}
