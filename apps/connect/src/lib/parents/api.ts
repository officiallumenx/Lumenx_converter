import { getConnectApiClient } from "@/lib/connect-api";
import type { ConnectApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import type { ParentDto } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Parents API is only available in API auth mode");
  }
}

export async function getParent(
  parentId: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<ParentDto> {
  assertApiMode();
  if (!isInstituteUuid(parentId)) {
    throw new Error("parent_id must be a valid UUID");
  }
  return client.get<ParentDto>(`/api/v1/parents/${parentId.trim()}`);
}
