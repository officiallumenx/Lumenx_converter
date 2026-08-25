import { useSyncExternalStore } from "react";

import { alertsRepository, type TransportNotification } from "@/lib/transport";

export function useAlerts(): TransportNotification[] {
  return useSyncExternalStore(
    alertsRepository.subscribe,
    alertsRepository.getSnapshot,
    alertsRepository.getSnapshot,
  );
}
