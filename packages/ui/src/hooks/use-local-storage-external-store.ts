import { useCallback, useSyncExternalStore } from "react";

type UseLocalStorageExternalStoreOptions = {
  /** Also refresh when the window gains focus (same-tab publish without a custom event). */
  alsoOnFocus?: boolean;
};

/**
 * Subscribe to a localStorage key via `useSyncExternalStore`.
 * Returns the raw string value (or `""` when missing) so consumers can `void` the tick
 * or parse it as needed.
 */
export function useLocalStorageExternalStore(
  key: string,
  options: UseLocalStorageExternalStoreOptions = {},
): string {
  const { alsoOnFocus = false } = options;

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const onStorage = (e: StorageEvent) => {
        if (e.key === key || e.key === null) onStoreChange();
      };
      window.addEventListener("storage", onStorage);
      if (alsoOnFocus) {
        window.addEventListener("focus", onStoreChange);
      }
      return () => {
        window.removeEventListener("storage", onStorage);
        if (alsoOnFocus) {
          window.removeEventListener("focus", onStoreChange);
        }
      };
    },
    [key, alsoOnFocus],
  );

  const getSnapshot = useCallback(() => localStorage.getItem(key) ?? "", [key]);

  return useSyncExternalStore(subscribe, getSnapshot, () => "");
}
