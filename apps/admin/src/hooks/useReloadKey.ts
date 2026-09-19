import {
  useCallback,
  useState,
  useSyncExternalStore,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  getDataRefreshGeneration,
  getDataRefreshSnapshot,
  requestDataRefresh,
  subscribeDataRefresh,
  type DataRefreshSnapshot,
} from "@/lib/data-refresh";

export function useDataRefreshSnapshot(): DataRefreshSnapshot {
  return useSyncExternalStore(
    subscribeDataRefresh,
    getDataRefreshSnapshot,
    getDataRefreshSnapshot,
  );
}

export function useDataRefreshGeneration(): number {
  return useSyncExternalStore(
    subscribeDataRefresh,
    getDataRefreshGeneration,
    () => 0,
  );
}

/**
 * Drop-in for `const [reloadKey, setReloadKey] = useState(0)`.
 * Local bumps still work; global soft-refresh also changes the token.
 */
export function useReloadKey(): [number, Dispatch<SetStateAction<number>>] {
  const [local, setLocal] = useState(0);
  const generation = useDataRefreshGeneration();
  return [local + generation * 1_000_000, setLocal];
}

export function useRequestDataRefresh() {
  return useCallback((source: "manual" | "auto" = "manual") => {
    return requestDataRefresh(source);
  }, []);
}
