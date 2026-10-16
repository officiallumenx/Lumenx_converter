import { isApiAuthMode } from "@/auth/auth-mode";
import { getCareersApiClient } from "@/lib/careers-api";
import type { InboxItemDto, ListInboxParams } from "./types";

export async function listInboxNotifications(params: ListInboxParams = {}): Promise<InboxItemDto[]> {
  if (!isApiAuthMode()) {
    throw new Error("Careers notification inbox requires VITE_CAREERS_AUTH_MODE=api");
  }
  const query = new URLSearchParams();
  if (params.instituteId?.trim()) {
    query.set("institute_id", params.instituteId.trim());
  }
  const suffix = query.toString();
  return getCareersApiClient().get<InboxItemDto[]>(
    suffix ? `/api/v1/notifications?${suffix}` : "/api/v1/notifications",
  );
}

export async function markInboxItemRead(itemId: string): Promise<InboxItemDto> {
  if (!isApiAuthMode()) {
    throw new Error("Careers notification inbox requires VITE_CAREERS_AUTH_MODE=api");
  }
  return getCareersApiClient().patch<InboxItemDto>(
    `/api/v1/notifications/${itemId.trim()}`,
    { read: true },
  );
}
