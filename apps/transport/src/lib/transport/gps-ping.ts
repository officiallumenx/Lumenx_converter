import { isApiAuthMode } from "@/lib/auth/auth-mode";
import { pingTripLocation } from "@/lib/transport-api";
import { captureCurrentGps } from "./capture-gps";
import { getTripSessionSnapshot, subscribeTripSession } from "./trip/store";

let pingTimer: ReturnType<typeof setInterval> | null = null;

async function pingOnce() {
  const trip = getTripSessionSnapshot();
  if (!trip.tripId || trip.phase === "completed" || trip.phase === "ready") return;
  try {
    const fix = await captureCurrentGps({ allowDemo: false });
    await pingTripLocation(trip.tripId, {
      latitude: fix.latitude,
      longitude: fix.longitude,
      accuracyM: fix.accuracyM ?? null,
    });
  } catch {
    // GPS optional — skip failed pings
  }
}

export function startTripGpsPing() {
  if (!isApiAuthMode()) return;
  stopTripGpsPing();
  void pingOnce();
  pingTimer = setInterval(() => {
    void pingOnce();
  }, 30_000);
}

export function stopTripGpsPing() {
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
}

if (typeof window !== "undefined") {
  subscribeTripSession(() => {
    const trip = getTripSessionSnapshot();
    if (
      isApiAuthMode() &&
      trip.tripId &&
      trip.phase !== "completed" &&
      trip.phase !== "ready"
    ) {
      if (!pingTimer) startTripGpsPing();
    } else {
      stopTripGpsPing();
    }
  });
}
