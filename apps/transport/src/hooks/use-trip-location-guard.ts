import { useEffect, useRef } from "react";
import { useSyncExternalStore } from "react";
import { toast } from "sonner";

import { useTripSession } from "@/hooks/use-trip-session";
import { isTripActive } from "@/lib/transport/trip";
import {
  getLocationTrackSnapshot,
  shouldNotifyLocationOff,
  startLocationTracking,
  stopLocationTracking,
  subscribeLocationTrack,
  type LocationTrackState,
} from "@/lib/transport/location-tracking";

export function useLocationTrack(): LocationTrackState {
  return useSyncExternalStore(
    subscribeLocationTrack,
    getLocationTrackSnapshot,
    getLocationTrackSnapshot,
  );
}

/** Keep live GPS monitoring tied to the active trip session. */
export function useTripLocationGuard() {
  const session = useTripSession();
  const track = useLocationTrack();
  const wasOff = useRef(false);
  const active = isTripActive(session.phase);

  useEffect(() => {
    if (active) {
      void startLocationTracking();
      return () => {
        void stopLocationTracking();
      };
    }
    void stopLocationTracking();
  }, [active]);

  useEffect(() => {
    if (!active) {
      wasOff.current = false;
      return;
    }

    if (track.status === "off") {
      if (!wasOff.current && shouldNotifyLocationOff()) {
        toast.error("Location turned off", {
          id: "transport-location-off",
          description: "Turn GPS back on to keep tracking this trip.",
        });
      }
      wasOff.current = true;
      return;
    }

    if (track.status === "on" && wasOff.current) {
      toast.success("Location restored", {
        id: "transport-location-on",
        description: "Live GPS tracking is active again.",
      });
      wasOff.current = false;
    }
  }, [active, track.status]);

  return track;
}
