/**
 * Registers Admin offline-queue flush: replay queued API writes when online.
 */
import {
  registerOfflineFlushHandler,
  type OfflineQueueItem,
} from "@lumenx/utils";
import { getAdminApiClient } from "@/lib/admin-api";
import type { ApiRequestOptions } from "@/lib/api";
import { isAdminOfflineApiPayload } from "./admin-offline-payload";

async function replayAdminApiWrite(item: OfflineQueueItem): Promise<void> {
  if (!isAdminOfflineApiPayload(item.payload)) {
    // Legacy / demo items without a real API payload — treat as no-op success.
    return;
  }

  const method = item.payload.method.toUpperCase();
  const path = item.payload.path;
  const body = item.payload.body;
  const client = getAdminApiClient();
  const opts: ApiRequestOptions = { skipOfflineQueue: true };

  switch (method) {
    case "POST":
      await client.post(path, body, opts);
      return;
    case "PATCH":
      await client.patch(path, body, opts);
      return;
    case "PUT":
      await client.put(path, body, opts);
      return;
    case "DELETE":
      await client.delete(path, opts);
      return;
    default:
      throw new Error(`Unsupported offline flush method: ${method}`);
  }
}

/** Call once from Admin shell so reconnect flushes the real API outbox. */
export function registerAdminOfflineFlushHandler(): () => void {
  return registerOfflineFlushHandler("admin", replayAdminApiWrite);
}
