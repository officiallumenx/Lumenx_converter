import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type {
  ListTransportReviewQueueParams,
  TransportReviewQueueItem,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Transport API is only available in API auth mode");
  }
}

export async function listTransportReviewQueue(
  params: ListTransportReviewQueueParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<TransportReviewQueueItem[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  return client.get<TransportReviewQueueItem[]>(
    `/api/v1/transport/review-queue?${query.toString()}`,
  );
}
