import { getConnectApiClient } from "@/lib/connect-api";
import type { ConnectApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import type { InboxItemDto, ListInboxParams } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Notification inbox API is only available in API auth mode");
  }
}

export async function listInboxNotifications(
  params: ListInboxParams = {},
  client: ConnectApiClient = getConnectApiClient(),
): Promise<InboxItemDto[]> {
  assertApiMode();

  const query = new URLSearchParams();
  if (params.instituteId?.trim()) {
    if (!isInstituteUuid(params.instituteId)) {
      throw new Error("institute_id must be a valid UUID");
    }
    query.set("institute_id", params.instituteId.trim());
  }

  const suffix = query.toString();
  return client.get<InboxItemDto[]>(
    suffix ? `/api/v1/notifications?${suffix}` : "/api/v1/notifications",
  );
}

export async function markInboxItemRead(
  itemId: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<InboxItemDto> {
  assertApiMode();
  if (!isInstituteUuid(itemId)) {
    throw new Error("item_id must be a valid UUID");
  }
  return client.patch<InboxItemDto>(`/api/v1/notifications/${itemId.trim()}`, {
    read: true,
  });
}
