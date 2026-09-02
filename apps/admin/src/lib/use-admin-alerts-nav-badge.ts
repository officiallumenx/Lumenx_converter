import { useSyncExternalStore } from "react";

let emergencyBroadcastCount = 0;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function setAdminEmergencyBroadcastCount(count: number): void {
  emergencyBroadcastCount = count;
  notify();
}

export function useAdminAlertsNavBadge(): number {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => emergencyBroadcastCount,
    () => 0,
  );
}
