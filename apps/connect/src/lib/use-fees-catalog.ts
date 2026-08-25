import { useCallback, useEffect, useState } from "react";
import {
  loadFeesSnapshot,
  subscribeFeesUpdates,
  type FeesSnapshot,
} from "@lumenx/module-fees";

/** Shared fees catalog (same localStorage key as Admin). */
export function useFeesCatalog() {
  const [snapshot, setSnapshot] = useState<FeesSnapshot>(() => loadFeesSnapshot());

  const refresh = useCallback(() => {
    setSnapshot(loadFeesSnapshot());
  }, []);

  useEffect(() => subscribeFeesUpdates(refresh), [refresh]);

  return { snapshot, refresh };
}
