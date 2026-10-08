/**
 * Bridge to Android TripTrackingService — keeps the existing JS GPS outbox
 * alive under screen-lock / background. No-op on web / iOS until a peer exists.
 * Reuses LocationSettings plugin registration from native-location.ts.
 */

import { Capacitor } from "@capacitor/core";
import {
  startNativeTripTrackingService,
  stopNativeTripTrackingService,
} from "./native-location";

export async function startNativeTripTracking(): Promise<void> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
    return;
  }
  try {
    await startNativeTripTrackingService();
  } catch {
    // Permissions / OEM — GPS ping still runs in foreground.
  }
}

export async function stopNativeTripTracking(): Promise<void> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
    return;
  }
  try {
    await stopNativeTripTrackingService();
  } catch {
    // ignore
  }
}
