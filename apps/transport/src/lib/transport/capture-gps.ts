import {
  LOCATION_FIX_ATTEMPTS,
  getNativeCurrentPosition,
  isLocationPermissionDeniedError,
  isNativePlatform,
} from "./native-location";
import type { GpsFix } from "./route-setup/types";

export class GpsCaptureError extends Error {
  readonly code: "denied" | "unavailable";

  constructor(code: "denied" | "unavailable", message: string) {
    super(message);
    this.name = "GpsCaptureError";
    this.code = code;
  }
}

export type CaptureGpsOptions = {
  /** @deprecated Demo GPS fallback removed — device GPS only. */
  allowDemo?: boolean;
};

/**
 * One-shot GPS capture for "Save Current Stop" / SOS.
 * Never fabricates coordinates.
 */
export async function captureCurrentGps(_options?: CaptureGpsOptions): Promise<GpsFix> {
  const capturedAt = new Date().toISOString();
  let lastDenied = false;

  if (typeof window !== "undefined" && isNativePlatform()) {
    for (const options of LOCATION_FIX_ATTEMPTS) {
      try {
        const pos = await getNativeCurrentPosition(options);
        return {
          latitude: pos.latitude,
          longitude: pos.longitude,
          accuracyM: pos.accuracy,
          speedKmh: null,
          capturedAt,
          source: "device",
        };
      } catch (err) {
        lastDenied = lastDenied || isLocationPermissionDeniedError(err);
      }
    }
  }

  if (typeof navigator !== "undefined" && navigator.geolocation) {
    for (const options of LOCATION_FIX_ATTEMPTS) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, options);
        });
        const speedMs = pos.coords.speed;
        const speedKmh =
          speedMs != null && Number.isFinite(speedMs) && speedMs >= 0
            ? speedMs * 3.6
            : null;
        return {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyM: pos.coords.accuracy ?? null,
          speedKmh,
          capturedAt,
          source: "device",
        };
      } catch (err) {
        lastDenied = lastDenied || isLocationPermissionDeniedError(err);
      }
    }
  }

  if (lastDenied) {
    throw new GpsCaptureError(
      "denied",
      "Location permission is off. Allow location for this app, then try again.",
    );
  }

  throw new GpsCaptureError(
    "unavailable",
    "Could not get a GPS fix yet. Keep location on and try outdoors, then retry.",
  );
}
