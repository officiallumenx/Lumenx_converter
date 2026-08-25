import { useSyncExternalStore } from "react";

import { routeSetupRepository } from "@/lib/transport/route-setup";

export function useRouteSetup() {
  return useSyncExternalStore(
    routeSetupRepository.subscribe,
    routeSetupRepository.getSnapshot,
    routeSetupRepository.getSnapshot,
  );
}
