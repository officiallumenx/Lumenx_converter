/**
 * Calendar API repository — API auth mode only.
 * Never called from demo mode; institute UUID validated before any fetch.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { EventDto, ListCalendarParams } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Calendar API is only available in API auth mode");
  }
}

export { assertApiMode };

export async function listCalendarEvents(
  params: ListCalendarParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<EventDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }

  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());

  return client.get<EventDto[]>(`/api/v1/events/calendar?${query.toString()}`);
}
