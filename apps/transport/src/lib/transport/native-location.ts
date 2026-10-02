import { Capacitor, registerPlugin } from "@capacitor/core";

/**
 * Shared Android/iOS location helpers for Transport.
 *
 * Capacitor Geolocation v7 quirks we must handle:
 * - checkPermissions()/requestPermissions() throw when Cap thinks services are off
 * - enableHighAccuracy:true requires fine location; approximate-only grants fail
 * - error codes are strings like OS-PLUG-GLOC-0003 (not GeolocationPositionError)
 * - WebView navigator.permissions often reports denied even when native grants exist
 * - Cap "Location services are not enabled" ≠ app permission denied
 *
 * Prefer LocationSettings plugin (PackageManager + Fused/LocationManager) over Cap.
 */

export type NativeLocationPermission = "granted" | "denied" | "prompt" | "unknown";

type LocationSettingsPlugin = {
  isEnabled: () => Promise<{ enabled: boolean }>;
  hasPermission: () => Promise<{ granted: boolean; fine: boolean; coarse: boolean }>;
  getCurrentPosition: (options: {
    enableHighAccuracy?: boolean;
    timeout?: number;
    maximumAge?: number;
  }) => Promise<{
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    timestamp: number;
  }>;
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
  { enableHighAccuracy: false, timeout: 8_000, maximumAge: 120_000 },
  { enableHighAccuracy: false, timeout: 12_000, maximumAge: 0 },
  { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
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

/** PackageManager check — does not go through Capacitor Geolocation. */
export async function hasNativeLocationPermission(): Promise<boolean | null> {
  if (!isNativePlatform()) return null;
  try {
    return (await locationSettings.hasPermission()).granted;
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
  if (
    code === "OS-PLUG-GLOC-0007" ||
    code === "OS-PLUG-GLOC-0016" ||
    code === "SERVICES_DISABLED"
  ) {
    return true;
  }
  const message = errorMessage(err);
  return /location services are not enabled|location settings error/i.test(message);
}

/**
 * App location *permission* denied — not the "enable GPS" Play Services dialog.
 * "Request to enable location was denied" must NOT count as permission denial.
 */
export function isLocationPermissionDeniedError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;

  if (
    typeof GeolocationPositionError !== "undefined" &&
    err instanceof GeolocationPositionError &&
    err.code === err.PERMISSION_DENIED
  ) {
    return true;
  }

  const code = errorCode(err);
  if (
    code === 1 ||
    code === "1" ||
    code === "OS-PLUG-GLOC-0003" ||
    code === "PERMISSION_DENIED"
  ) {
    return true;
  }

  const message = errorMessage(err);
  if (!message) return false;
  if (/request to enable location was denied/i.test(message)) return false;
  if (/location services are not enabled/i.test(message)) return false;
  if (/location settings error/i.test(message)) return false;
  return (
    (/location permission/i.test(message) && /denied/i.test(message)) ||
    /^location permission denied$/i.test(message)
  );
}

export function isLocationTimeoutOrUnavailableError(err: unknown): boolean {
  const code = errorCode(err);
  if (
    code === 2 ||
    code === 3 ||
    code === "2" ||
    code === "3" ||
    code === "POSITION_UNAVAILABLE"
  ) {
    return true;
  }
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
 * Native permission status.
 * Prefer PackageManager via LocationSettings — Cap checkPermissions throws when
 * Cap thinks location services are off, which is unrelated to app permission.
 *
 * Important: when PackageManager says not granted, never trust Cap's "denied"
 * alone (Cap often returns denied when its services check fails). Treat as prompt
 * so getCurrentPosition can still request permission.
 */
export async function readNativeLocationPermission(): Promise<NativeLocationPermission> {
  if (!isNativePlatform()) return "unknown";

  const pkgGranted = await hasNativeLocationPermission();
  if (pkgGranted === true) return "granted";

  if (pkgGranted === false) {
    // Not granted yet — prompt vs permanently denied. Cap is unreliable here;
    // only treat as denied when Cap clearly says denied AND did not throw.
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      const result = await Geolocation.checkPermissions();
      if (result.location === "granted" || result.coarseLocation === "granted") {
        return "granted";
      }
      // Cap "denied" without a prior grant is often a false negative — keep prompt
      // so callers still attempt getCurrentPosition (which triggers the system dialog).
      return "prompt";
    } catch (err) {
      // Cap services-disabled throw must NOT become "denied".
      if (isLocationServicesDisabledError(err)) return "prompt";
      return "prompt";
    }
  }

  // PackageManager plugin unavailable — fall back to Cap carefully.
  try {
    const { Geolocation } = await import("@capacitor/geolocation");
    const result = await Geolocation.checkPermissions();
    if (result.location === "granted" || result.coarseLocation === "granted") {
      return "granted";
    }
    return "prompt";
  } catch (err) {
    if (isLocationServicesDisabledError(err)) return "unknown";
    return "unknown";
  }
}

export async function requestNativeLocationPermission(): Promise<NativeLocationPermission> {
  if (!isNativePlatform()) return "unknown";

  const already = await hasNativeLocationPermission();
  if (already === true) return "granted";

  try {
    const { Geolocation } = await import("@capacitor/geolocation");
    try {
      const initial = await Geolocation.checkPermissions();
      if (initial.location === "granted" || initial.coarseLocation === "granted") {
        return "granted";
      }
    } catch {
      // Cap may throw services-disabled — still try request/getPosition.
    }

    try {
      const result = await Geolocation.requestPermissions();
      if (result.location === "granted" || result.coarseLocation === "granted") {
        return "granted";
      }
    } catch (err) {
      // requestPermissions also throws when Cap thinks services are off.
      if (isLocationServicesDisabledError(err)) {
        const pkg = await hasNativeLocationPermission();
        if (pkg === true) return "granted";
        return "prompt";
      }
    }

    const pkgAfter = await hasNativeLocationPermission();
    if (pkgAfter === true) return "granted";
    // Never return Cap "denied" here — getCurrentPosition still triggers the dialog.
    return "prompt";
  } catch {
    const pkg = await hasNativeLocationPermission();
    if (pkg === true) return "granted";
    return "prompt";
  }
}

async function getPositionViaPlugin(options: PositionAttempt): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}> {
  const pos = await locationSettings.getCurrentPosition({
    enableHighAccuracy: options.enableHighAccuracy,
    timeout: options.timeout,
    maximumAge: options.maximumAge,
  });
  return {
    latitude: pos.latitude,
    longitude: pos.longitude,
    accuracy: pos.accuracy ?? null,
    timestamp: pos.timestamp,
  };
}

async function getPositionViaCap(options: PositionAttempt): Promise<{
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

/**
 * Prefer LocationSettings fused/last-known (bypasses Cap services gate),
 * then Capacitor Geolocation as a secondary path.
 */
export async function getNativeCurrentPosition(options: PositionAttempt): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}> {
  let pluginError: unknown = null;
  try {
    return await getPositionViaPlugin(options);
  } catch (err) {
    pluginError = err;
    // Hard permission deny from our plugin — don't bother Cap.
    if (isLocationPermissionDeniedError(err)) throw err;
  }

  try {
    return await getPositionViaCap(options);
  } catch (capError) {
    throw pluginError ?? capError;
  }
}
