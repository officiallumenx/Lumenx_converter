import { useEffect } from "react";

/**
 * Subscribe to one or more `window` events and invoke `handler` for each.
 * Pass a stable `handler` (e.g. `useCallback`) and prefer a module-level `events` array.
 */
export function useWindowEvents(
  events: readonly string[],
  handler: (event: Event) => void,
): void {
  const eventsKey = events.join("\0");
  useEffect(() => {
    const names = eventsKey ? eventsKey.split("\0") : [];
    for (const name of names) {
      window.addEventListener(name, handler);
    }
    return () => {
      for (const name of names) {
        window.removeEventListener(name, handler);
      }
    };
  }, [eventsKey, handler]);
}
