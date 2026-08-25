import { Capacitor } from "@capacitor/core";

import type { GpsFix } from "./route-setup/types";

/** Demo coords near North Campus Gate (Delhi) when device GPS is unavailable. */
const DEMO_FIX = {
  latitude: 28.7041,
  longitude: 77.1025,
};

export class GpsCaptureError extends Error {
  readonly code: "denied" | "unavailable";

  constructor(code: "denied" | "unavailable", message: string) {
    super(message);
    this.name = "GpsCaptureError";
    this.code = code;
  }
}

export type CaptureGpsOptions = {
  /**
   * When true, fall back to demo coordinates if device GPS fails.
   * Route Setup must keep this false so stops are not saved with fake locations.
   * SOS may allow demo when location is optional.
   */
  allowDemo?: boolean;
};

/**
 * One-shot GPS capture for "Save Current Stop" / SOS.
 * Not continuous tracking — only called on user action.
 */
export async function captureCurrentGps(options?: CaptureGpsOptions): Promise<GpsFix> {
  const allowDemo = options?.allowDemo === true;
  const capturedAt = new Date().toISOString();
  let lastDenied = false;

  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 12_000,
        maximumAge: 0,
      });
      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracyM: pos.coords.accuracy ?? null,
        capturedAt,
        source: "device",
      };
    } catch (err) {
      lastDenied = isPermissionDenied(err);
    }
  }

  if (typeof navigator !== "undefined" && navigator.geolocation) {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12_000,
          maximumAge: 0,
        });
      });
      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracyM: pos.coords.accuracy ?? null,
        capturedAt,
        source: "device",
      };
    } catch (err) {
      lastDenied = lastDenied || isPermissionDenied(err);
    }
  }

  if (allowDemo) {
    const jitter = () => (Math.random() - 0.5) * 0.0015;
    return {
      latitude: DEMO_FIX.latitude + jitter(),
      longitude: DEMO_FIX.longitude + jitter(),
      accuracyM: 25,
      capturedAt,
      source: "demo",
    };
  }

  if (lastDenied) {
    throw new GpsCaptureError(
      "denied",
      "Location permission is off. Turn on GPS / allow location, then try again.",
    );
  }

  throw new GpsCaptureError(
    "unavailable",
    "Could not get GPS. Turn on location and try again.",
  );
}

function isPermissionDenied(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = "code" in err ? Number((err as { code?: number }).code) : NaN;
  // GeolocationPositionError.PERMISSION_DENIED = 1
  if (code === 1) return true;
  const message = "message" in err ? String((err as { message?: string }).message) : "";
  return /denied|permission/i.test(message);
}
