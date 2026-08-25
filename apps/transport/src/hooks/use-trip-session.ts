import { useSyncExternalStore } from "react";

import { tripRepository, type TripSession } from "@/lib/transport/trip";

export function useTripSession(): TripSession {
  return useSyncExternalStore(
    tripRepository.subscribe,
    tripRepository.getSessionSnapshot,
    tripRepository.getSessionSnapshot,
  );
}
