import { Capacitor } from "@capacitor/core";

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

type PositionAttempt = {
  enableHighAccuracy: boolean;
  timeout: number;
  maximumAge: number;
};

const ATTEMPTS: PositionAttempt[] = [
  { enableHighAccuracy: true, timeout: 8_000, maximumAge: 60_000 },
  { enableHighAccuracy: false, timeout: 10_000, maximumAge: 120_000 },
  { enableHighAccuracy: true, timeout: 14_000, maximumAge: 0 },
];

/**
 * One-shot GPS capture for "Save Current Stop" / SOS.
 * Never fabricates coordinates.
 */
export async function captureCurrentGps(_options?: CaptureGpsOptions): Promise<GpsFix> {
  const capturedAt = new Date().toISOString();
  let lastDenied = false;

  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      for (const options of ATTEMPTS) {
        try {
          const pos = await Geolocation.getCurrentPosition(options);
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
    } catch (err) {
      lastDenied = isPermissionDenied(err);
    }
  }

  if (typeof navigator !== "undefined" && navigator.geolocation) {
    for (const options of ATTEMPTS) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, options);
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

function isPermissionDenied(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = "code" in err ? Number((err as { code?: number }).code) : NaN;
  if (code === 1) return true;
  const message = "message" in err ? String((err as { message?: string }).message) : "";
  return /denied|permission/i.test(message);
}
