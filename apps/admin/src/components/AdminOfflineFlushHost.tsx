import { useEffect } from "react";
import { registerAdminOfflineFlushHandler } from "@/lib/offline/admin-offline-flush";

/** Mount once under OfflineSyncHost so reconnect flushes real Admin API writes. */
export function AdminOfflineFlushHost() {
  useEffect(() => registerAdminOfflineFlushHandler(), []);
  return null;
}
