import { useCallback, useEffect, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import {
  loadFeesSnapshot,
  subscribeFeesUpdates,
  type FeesSnapshot,
} from "@lumenx/module-fees";

/** Shared fees catalog (same localStorage key as Admin). Demo auth mode only. */
export function useFeesCatalog() {
  const apiMode = isApiAuthMode();
  const [snapshot, setSnapshot] = useState<FeesSnapshot>(() => loadFeesSnapshot());

  const refresh = useCallback(() => {
    setSnapshot(loadFeesSnapshot());
  }, []);

  useEffect(() => {
    if (apiMode) return;
    return subscribeFeesUpdates(refresh);
  }, [refresh, apiMode]);

  return { snapshot, refresh };
}
