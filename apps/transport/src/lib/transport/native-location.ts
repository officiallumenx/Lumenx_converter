import { Capacitor, registerPlugin } from "@capacitor/core";

/**
 * Shared Android/iOS location helpers for Transport.
 *
 * Capacitor Geolocation v7 quirks we must handle:
 * - checkPermissions()/requestPermissions() throw when location services look off
 * - enableHighAccuracy:true requires fine location; approximate-only grants fail
 * - error codes are strings like OS-PLUG-GLOC-0003 (not GeolocationPositionError)
 * - WebView navigator.permissions often reports denied even when native grants exist
 */

export type NativeLocationPermission = "granted" | "denied" | "prompt" | "unknown";

type LocationSettingsPlugin = {
  isEnabled: () => Promise<{ enabled: boolean }>;
  requestEnable: () => Promise<{ enabled: boolean }>;
};

const locationSettings = registerPlugin<LocationSettingsPlugin>("LocationSettings");

export type PositionAttempt = {
  enableHighAccuracy: boolean;
  timeout: number;
  maximumAge: number;
};

/** Coarse-first so Android 12+ "Approximate" grants still succeed. */
export const LOCATION_FIX_ATTEMPTS: PositionAttempt[] = [
  { enableHighAccuracy: false, timeout: 10_000, maximumAge: 120_000 },
  { enableHighAccuracy: true, timeout: 8_000, maximumAge: 60_000 },
  { enableHighAccuracy: false, timeout: 14_000, maximumAge: 0 },
  { enableHighAccuracy: true, timeout: 16_000, maximumAge: 0 },
];

export function isNativePlatform() {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

export async function isNativeLocationServiceEnabled(): Promise<boolean | null> {
  if (!isNativePlatform()) return null;
  try {
    return (await locationSettings.isEnabled()).enabled;
  } catch {
    return null;
  }
}

export async function requestNativeLocationEnable(): Promise<boolean | null> {
  if (!isNativePlatform()) return null;
  try {
    return (await locationSettings.requestEnable()).enabled;
  } catch {
    return null;
  }
}

function errorCode(err: unknown): string | number | null {
  if (!err || typeof err !== "object" || !("code" in err)) return null;
  return (err as { code?: string | number }).code ?? null;
}

function errorMessage(err: unknown): string {
  if (!err || typeof err !== "object" || !("message" in err)) return "";
  return String((err as { message?: string }).message ?? "");
}

/** System location toggle / Play Services location mode is off. */
export function isLocationServicesDisabledError(err: unknown): boolean {
  const code = errorCode(err);
  if (code === "OS-PLUG-GLOC-0007" || code === "OS-PLUG-GLOC-0016") return true;
  const message = errorMessage(err);
  return /location services are not enabled|location settings error/i.test(message);
}

/**
 * App location *permission* denied — not the "enable GPS" Play Services dialog.
 * "Request to enable location was denied" must NOT count as permission denial.
 */
export function isLocationPermissionDeniedError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;

  const code = errorCode(err);
  if (code === 1 || code === "1" || code === "OS-PLUG-GLOC-0003") return true;

  const message = errorMessage(err);
  if (!message) return false;
  if (/request to enable location was denied/i.test(message)) return false;
  if (/location services are not enabled/i.test(message)) return false;
  return /location permission/i.test(message) && /denied/i.test(message);
}

export function isLocationTimeoutOrUnavailableError(err: unknown): boolean {
  const code = errorCode(err);
  if (code === 2 || code === 3 || code === "2" || code === "3") return true;
  if (
    code === "OS-PLUG-GLOC-0002" ||
    code === "OS-PLUG-GLOC-0010" ||
    code === "OS-PLUG-GLOC-0009" ||
    code === "OS-PLUG-GLOC-0014" ||
    code === "OS-PLUG-GLOC-0015" ||
    code === "OS-PLUG-GLOC-0016"
  ) {
    return true;
  }
  const message = errorMessage(err);
  return /timeout|unavailable|could not obtain location|play services|enable location was denied/i.test(
    message,
  );
}

/**
 * Native permission status via Capacitor only.
 * Never falls back to WebView permissions (false "denied" on Android).
 */
export async function readNativeLocationPermission(): Promise<NativeLocationPermission> {
  if (!isNativePlatform()) return "unknown";

  try {
    const { Geolocation } = await import("@capacitor/geolocation");
    const result = await Geolocation.checkPermissions();
    if (result.location === "granted" || result.coarseLocation === "granted") {
      return "granted";
    }
    if (result.location === "denied" && result.coarseLocation === "denied") {
      return "denied";
    }
    return "prompt";
  } catch (err) {
    if (isLocationServicesDisabledError(err)) {
      const enabled = await isNativeLocationServiceEnabled();
      // Cap may disagree with LocationManager; prefer our plugin when it says on.
      if (enabled === true) return "unknown";
      if (enabled === false) return "denied";
      return "unknown";
    }
    return "unknown";
  }
}

export async function requestNativeLocationPermission(): Promise<NativeLocationPermission> {
  if (!isNativePlatform()) return "unknown";

  try {
    const { Geolocation } = await import("@capacitor/geolocation");
    const initial = await Geolocation.checkPermissions();
    if (initial.location === "granted" || initial.coarseLocation === "granted") {
      return "granted";
    }
    if (initial.location === "denied" && initial.coarseLocation === "denied") {
      return "denied";
    }

    const result = await Geolocation.requestPermissions();
    if (result.location === "granted" || result.coarseLocation === "granted") {
      return "granted";
    }
    if (result.location === "denied" && result.coarseLocation === "denied") {
      return "denied";
    }
    return "prompt";
  } catch (err) {
    if (isLocationServicesDisabledError(err)) {
      const enabled = await isNativeLocationServiceEnabled();
      if (enabled === true) return "unknown";
      if (enabled === false) return "denied";
    }
    return "unknown";
  }
}

export async function getNativeCurrentPosition(options: PositionAttempt): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}> {
  const { Geolocation } = await import("@capacitor/geolocation");
  const pos = await Geolocation.getCurrentPosition({
    enableHighAccuracy: options.enableHighAccuracy,
    timeout: options.timeout,
    maximumAge: options.maximumAge,
  });
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy ?? null,
    timestamp: pos.timestamp,
  };
}
