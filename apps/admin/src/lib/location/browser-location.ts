/**
 * One-shot location for Admin (school endpoint).
 *
 * Web: navigator.geolocation (requires secure context + user gesture).
 * Native Capacitor: @capacitor/geolocation (needs ACCESS_*_LOCATION in the manifest).
 *
 * Never treat a missing Permissions API result as "denied".
 * Do not call this at app startup — only from an explicit user action.
 */
import { Capacitor } from "@capacitor/core";

export type AdminLocationCoords = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

export type AdminLocationFailureKind =
  | "unsupported"
  | "insecure_context"
  | "permission_denied"
  | "unavailable"
  | "timeout"
  | "unknown";

export class AdminLocationError extends Error {
  readonly kind: AdminLocationFailureKind;

  constructor(kind: AdminLocationFailureKind, message: string) {
    super(message);
    this.name = "AdminLocationError";
    this.kind = kind;
  }
}

export function isSecureLocationContext(): boolean {
  if (typeof window === "undefined") return false;
  if (Capacitor.isNativePlatform()) return true;
  return window.isSecureContext === true;
}

export function isGeolocationApiAvailable(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.geolocation);
}

/**
 * Optional hint only. Missing / errored Permissions API → "unknown", never "denied".
 */
export async function queryGeolocationPermissionHint(): Promise<
  "granted" | "denied" | "prompt" | "unknown"
> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return "unknown";
  }
  try {
    const status = await navigator.permissions.query({
      name: "geolocation" as PermissionName,
    });
    if (status.state === "granted") return "granted";
    if (status.state === "denied") return "denied";
    if (status.state === "prompt") return "prompt";
    return "unknown";
  } catch {
    return "unknown";
  }
}

function mapGeolocationPositionError(err: GeolocationPositionError): AdminLocationError {
  if (err.code === err.PERMISSION_DENIED) {
    return new AdminLocationError(
      "permission_denied",
      Capacitor.isNativePlatform()
        ? "Location permission denied. Open system Settings → Apps → LumenX Admin → Permissions → Location, allow While using the app, then try again."
        : "Location permission denied for this site. Click the lock icon in the address bar → Site settings → Location → Allow, then retry.",
    );
  }
  if (err.code === err.POSITION_UNAVAILABLE) {
    return new AdminLocationError(
      "unavailable",
      "Location unavailable. Turn on device Location / GPS, move outdoors if needed, then try again.",
    );
  }
  if (err.code === err.TIMEOUT) {
    return new AdminLocationError(
      "timeout",
      "Location timed out. Stay outdoors with a clear sky view and try again.",
    );
  }
  return new AdminLocationError("unknown", "Could not detect location.");
}

function mapUnknownLocationError(err: unknown): AdminLocationError {
  if (err instanceof AdminLocationError) return err;
  if (
    typeof GeolocationPositionError !== "undefined" &&
    err instanceof GeolocationPositionError
  ) {
    return mapGeolocationPositionError(err);
  }
  const message = err instanceof Error ? err.message : String(err ?? "");
  if (/permission|denied|restricted/i.test(message)) {
    return new AdminLocationError(
      "permission_denied",
      Capacitor.isNativePlatform()
        ? "Location permission denied. Enable Location for LumenX Admin in device Settings, then try again."
        : "Location permission denied for this site. Allow Location in site settings, then try again.",
    );
  }
  if (/timeout/i.test(message)) {
    return new AdminLocationError("timeout", "Location timed out. Try again.");
  }
  if (/unavailable|disabled|services are not enabled|settings/i.test(message)) {
    return new AdminLocationError(
      "unavailable",
      "Location services appear off or unavailable. Enable GPS / Location on the device, then try again.",
    );
  }
  return new AdminLocationError(
    "unknown",
    message.trim() || "Could not detect location.",
  );
}

function getWebCurrentPosition(options: PositionOptions): Promise<AdminLocationCoords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(
        new AdminLocationError(
          "unsupported",
          "Location is not supported in this browser.",
        ),
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy:
            typeof pos.coords.accuracy === "number" ? pos.coords.accuracy : null,
        });
      },
      (err) => reject(mapGeolocationPositionError(err)),
      options,
    );
  });
}

async function getNativeCurrentPosition(options: {
  enableHighAccuracy: boolean;
  timeout: number;
  maximumAge: number;
}): Promise<AdminLocationCoords> {
  const { Geolocation } = await import("@capacitor/geolocation");

  try {
    const current = await Geolocation.checkPermissions();
    const already =
      current.location === "granted" || current.coarseLocation === "granted";
    if (!already) {
      const requested = await Geolocation.requestPermissions();
      const granted =
        requested.location === "granted" ||
        requested.coarseLocation === "granted";
      // Still attempt getCurrentPosition when Cap says denied — it can be a false
      // negative; the OS dialog / fused provider is the source of truth.
      if (!granted) {
        // continue
      }
    }
  } catch (err) {
    // Cap may throw when location services are off — still try a position fix.
    if (/permission|denied|restricted/i.test(String((err as Error)?.message ?? err))) {
      throw mapUnknownLocationError(err);
    }
  }

  try {
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: options.enableHighAccuracy,
      timeout: options.timeout,
      maximumAge: options.maximumAge,
    });
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy:
        typeof pos.coords.accuracy === "number" ? pos.coords.accuracy : null,
    };
  } catch (err) {
    throw mapUnknownLocationError(err);
  }
}

/**
 * Detect current coordinates. Call only from an explicit user gesture
 * (e.g. "Detect my location").
 */
export async function detectCurrentLocation(): Promise<AdminLocationCoords> {
  if (!isSecureLocationContext()) {
    throw new AdminLocationError(
      "insecure_context",
      "Location requires HTTPS (or localhost). Open Admin over https://admin.lumenxtech.in.",
    );
  }

  if (Capacitor.isNativePlatform()) {
    // Coarse-first so Android "Approximate" grants still succeed.
    try {
      return await getNativeCurrentPosition({
        enableHighAccuracy: false,
        timeout: 12_000,
        maximumAge: 60_000,
      });
    } catch (first) {
      try {
        return await getNativeCurrentPosition({
          enableHighAccuracy: true,
          timeout: 20_000,
          maximumAge: 0,
        });
      } catch (second) {
        throw mapUnknownLocationError(second ?? first);
      }
    }
  }

  if (!isGeolocationApiAvailable()) {
    throw new AdminLocationError(
      "unsupported",
      "Location is not supported in this browser.",
    );
  }

  try {
    return await getWebCurrentPosition({
      enableHighAccuracy: true,
      timeout: 20_000,
      maximumAge: 0,
    });
  } catch (err) {
    throw mapUnknownLocationError(err);
  }
}

export function adminLocationUserMessage(err: unknown): string {
  if (err instanceof AdminLocationError) return err.message;
  return mapUnknownLocationError(err).message;
}
