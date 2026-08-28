/**
 * Events API repository — API auth mode only.
 * Never called from demo mode; institute UUID validated before any fetch.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { EventDto, ListEventsParams } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Events API is only available in API auth mode");
  }
}

export async function listEvents(
  params: ListEventsParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<EventDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }

  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.source) query.set("source", params.source);
  if (params.kind) query.set("kind", params.kind);
  if (params.published !== undefined) {
    query.set("published", params.published ? "true" : "false");
  }
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.includeCancelled !== undefined) {
    query.set("include_cancelled", params.includeCancelled ? "true" : "false");
  }

  return client.get<EventDto[]>(`/api/v1/events?${query.toString()}`);
}
