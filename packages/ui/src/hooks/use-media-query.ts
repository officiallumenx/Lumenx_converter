import { useSyncExternalStore } from "react";

/**
 * Subscribe to a CSS media query. Server / first SSR snapshot defaults to `false`.
 */
export function useMediaQuery(query: string, getServerSnapshot: () => boolean = () => false): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onStoreChange);
      return () => mql.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia(query).matches,
    getServerSnapshot,
  );
}
