import { useSyncExternalStore } from "react";

let activePlatformAlertCount = 0;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function setNexusActivePlatformAlertCount(count: number): void {
  activePlatformAlertCount = count;
  notify();
}

export function useNexusPoliciesNavBadge(): number {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => activePlatformAlertCount,
    () => 0,
  );
}
