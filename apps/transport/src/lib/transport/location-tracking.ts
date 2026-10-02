import {
  LOCATION_FIX_ATTEMPTS,
  getNativeCurrentPosition,
  hasNativeLocationPermission,
  isLocationPermissionDeniedError,
  isLocationServicesDisabledError,
  isNativeLocationServiceEnabled,
  isNativePlatform,
  readNativeLocationPermission,
  requestNativeLocationEnable,
} from "./native-location";

export type LocationTrackStatus = "unknown" | "on" | "off" | "checking";

export type LocationTrackState = {
  status: LocationTrackStatus;
  message: string;
  lastFixAt: string | null;
};

type Listener = () => void;

const listeners = new Set<Listener>();

let state: LocationTrackState = {
  status: "unknown",
  message: "Location not monitored yet.",
  lastFixAt: null,
};

let watchId: string | number | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let started = false;
let lastOffToastAt = 0;
let checkingService = false;
/** Consecutive soft GPS misses while system location stays on. */
let softMissStreak = 0;

const RECENT_FIX_MS = 120_000;
const SOFT_MISS_BEFORE_WARN = 3;

type ProbeResult = "ok" | "no-fix" | "denied" | "service-off";

function emit() {
  listeners.forEach((listener) => listener());
}

function setState(next: LocationTrackState) {
  state = next;
  emit();
}

function isRecentFix(iso: string | null, now = Date.now()): boolean {
  if (!iso) return false;
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return false;
  return now - at <= RECENT_FIX_MS;
}

async function isLocationPermissionGranted(): Promise<boolean | null> {
  if (isNativePlatform()) {
    const permission = await readNativeLocationPermission();
    if (permission === "granted") return true;
    if (permission === "denied") return false;
    return null;
  }

  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return null;
  }
  try {
    const result = await navigator.permissions.query({
      name: "geolocation" as PermissionName,
    });
    if (result.state === "granted") return true;
    if (result.state === "denied") return false;
    return null;
  } catch {
    return null;
  }
}

function tryWebPosition(options: PositionOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => resolve(true),
      () => resolve(false),
      options,
    );
  });
}

/**
 * Probe for a usable fix. Accepts a recent cached reading — requiring
 * maximumAge:0 + high accuracy was falsely reporting "location off" indoors.
 * Coarse-first so Android 12+ approximate location grants still succeed.
 */
async function probeFreshFix(): Promise<ProbeResult> {
  // Do not trust isEnabled===false alone — Cap/OEM checks false-negative.
  // Always attempt a position; only report service-off if acquire fails AND
  // LocationManager still says off.
  let denied = false;
  let sawServiceDisabled = false;

  if (isNativePlatform()) {
    for (const options of LOCATION_FIX_ATTEMPTS) {
      try {
        await getNativeCurrentPosition(options);
        return "ok";
      } catch (err) {
        if (isLocationPermissionDeniedError(err)) denied = true;
        if (isLocationServicesDisabledError(err)) sawServiceDisabled = true;
      }
    }
  }

  if (typeof navigator !== "undefined" && navigator.geolocation) {
    for (const options of LOCATION_FIX_ATTEMPTS) {
      const ok = await tryWebPosition(options);
      if (ok) return "ok";
    }
  }

  // Cap may label settings dialogs as "permission denied" — confirm with PackageManager.
  if (denied) {
    const pkg = await hasNativeLocationPermission();
    if (pkg === false) return "denied";
  }

  const serviceEnabled = await isNativeLocationServiceEnabled();
  if (sawServiceDisabled && serviceEnabled === false) {
    return "service-off";
  }
  if (serviceEnabled === false && !denied) {
    return "service-off";
  }

  return "no-fix";
}

/**
 * System location + app permission are enough to unblock the trip.
 * Missing a momentary fix is not the same as "location off".
 */
async function applyProbeResult(result: ProbeResult): Promise<void> {
  if (result === "ok") {
    softMissStreak = 0;
    markOn();
    return;
  }

  if (result === "service-off") {
    softMissStreak = 0;
    markOff("Location is off. Turn on GPS/location services to continue.");
    return;
  }

  if (result === "denied") {
    softMissStreak = 0;
    markOff(
      "Location permission is off. Allow location for Transport, then try again.",
    );
    return;
  }

  // Location services appear on, but no fix yet (indoors / weak signal).
  softMissStreak += 1;
  if (state.status === "on" || isRecentFix(state.lastFixAt)) {
    return;
  }

  const serviceEnabled = await isNativeLocationServiceEnabled();
  const permission = await isLocationPermissionGranted();
  if (serviceEnabled === true && permission !== false) {
    softMissStreak = 0;
    setState({
      status: "on",
      message: "Location is on. Waiting for a stronger GPS signal…",
      lastFixAt: state.lastFixAt,
    });
    return;
  }

  if (permission === false) {
    markOff(
      "Location permission is off. Allow location for Transport, then try again.",
    );
    return;
  }

  // Native + unknown permission: do not block the trip on a soft miss.
  if (isNativePlatform() && serviceEnabled !== false) {
    softMissStreak = 0;
    setState({
      status: "on",
      message: "Location is on. Waiting for a stronger GPS signal…",
      lastFixAt: state.lastFixAt,
    });
    return;
  }

  if (softMissStreak < SOFT_MISS_BEFORE_WARN && state.status !== "off") {
    setState({
      status: "checking",
      message: "Confirming live GPS…",
      lastFixAt: state.lastFixAt,
    });
    return;
  }

  markOff(
    "Could not get a GPS fix yet. Keep location on and move outdoors, then try again.",
  );
}

export function subscribeLocationTrack(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLocationTrackSnapshot(): LocationTrackState {
  return state;
}

async function checkLocationServiceNow() {
  if (checkingService) return;
  checkingService = true;

  try {
    // Probe first — isEnabled alone can false-negative on some OEMs.
    const result = await probeFreshFix();
    await applyProbeResult(result);
  } finally {
    checkingService = false;
  }
}

/**
 * Opens Android's location panel over the app. Android intentionally does not
 * allow applications to silently switch GPS on.
 */
export async function requestEnableLocation(): Promise<boolean> {
  if (isNativePlatform()) {
    try {
      const enabled = await requestNativeLocationEnable();
      if (enabled === false) {
        markOff("Location is still off. Turn it on to continue marking attendance.");
        return false;
      }
      setState({
        status: "checking",
        message: "Confirming live GPS…",
        lastFixAt: state.lastFixAt,
      });
      const probe = await probeFreshFix();
      await applyProbeResult(probe);
      return getLocationTrackSnapshot().status === "on";
    } catch {
      markOff("Could not open location controls. Turn on GPS and try again.");
      return false;
    }
  }

  setState({
    status: "checking",
    message: "Requesting location…",
    lastFixAt: state.lastFixAt,
  });
  const probe = await probeFreshFix();
  await applyProbeResult(probe);
  return getLocationTrackSnapshot().status === "on";
}

function markOn() {
  softMissStreak = 0;
  setState({
    status: "on",
    message: "Live GPS tracking is active.",
    lastFixAt: new Date().toISOString(),
  });
}

function markOff(message: string) {
  setState({
    status: "off",
    message,
    lastFixAt: state.lastFixAt,
  });
}

async function handlePositionError(code?: number | string) {
  const serviceEnabled = await isNativeLocationServiceEnabled();
  const permission = await isLocationPermissionGranted();
  const pkg = await hasNativeLocationPermission();

  const permissionDenied =
    (code === 1 ||
      code === "1" ||
      code === "OS-PLUG-GLOC-0003" ||
      code === "PERMISSION_DENIED" ||
      permission === false) &&
    pkg !== true;

  if (permissionDenied && pkg === false) {
    markOff("Location permission is off. Turn it on to continue the trip.");
    return;
  }

  if (serviceEnabled === false) {
    markOff("Location is off. Turn on GPS to continue tracking.");
    return;
  }

  // Service is on (or unknown) — timeout / unavailable is a weak signal, not "off".
  softMissStreak += 1;
  if (state.status === "on" || isRecentFix(state.lastFixAt)) {
    return;
  }
  if (softMissStreak < SOFT_MISS_BEFORE_WARN) {
    setState({
      status: "checking",
      message: "Waiting for GPS signal…",
      lastFixAt: state.lastFixAt,
    });
    return;
  }
  setState({
    status: "on",
    message: "Location is on. Waiting for a stronger GPS signal…",
    lastFixAt: state.lastFixAt,
  });
}

async function startNativeWatch() {
  const { Geolocation } = await import("@capacitor/geolocation");
  watchId = await Geolocation.watchPosition(
    {
      // Coarse-friendly watch; high accuracy alone fails on approximate grants.
      enableHighAccuracy: false,
      timeout: 20_000,
      maximumAge: 15_000,
    },
    (position, error) => {
      if (error || !position) {
        void handlePositionError(
          error && typeof error === "object" && "code" in error
            ? (error as { code?: number | string }).code
            : undefined,
        );
        return;
      }
      markOn();
    },
  );
}

function startWebWatch() {
  if (!navigator.geolocation) {
    markOff("GPS is not available on this device.");
    return;
  }

  watchId = navigator.geolocation.watchPosition(
    () => markOn(),
    (error) => {
      void handlePositionError(error.code);
    },
    {
      enableHighAccuracy: false,
      timeout: 20_000,
      maximumAge: 15_000,
    },
  );
}

async function stopWatch() {
  if (watchId == null) return;

  if (typeof watchId === "string" && isNativePlatform()) {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      await Geolocation.clearWatch({ id: watchId });
    } catch {
      /* ignore */
    }
  } else if (typeof watchId === "number" && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }

  watchId = null;
}

/**
 * Start continuous GPS monitoring for an active trip.
 * Detects when the driver turns location off after the start check.
 */
export async function startLocationTracking() {
  if (typeof window === "undefined") return;
  if (started) return;

  started = true;
  softMissStreak = 0;
  setState({
    status: "checking",
    message: "Starting live GPS tracking…",
    lastFixAt: null,
  });

  const probe = await probeFreshFix();
  await applyProbeResult(probe);

  try {
    if (isNativePlatform()) await startNativeWatch();
    else startWebWatch();
  } catch {
    startWebWatch();
  }

  // Native state poll catches the Android location switch within about two seconds.
  pollTimer = setInterval(() => {
    void checkLocationServiceNow();
  }, 2_000);
}

export async function stopLocationTracking() {
  started = false;
  softMissStreak = 0;
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  await stopWatch();
  setState({
    status: "unknown",
    message: "Location not monitored.",
    lastFixAt: null,
  });
}

/** Used by UI toasts so we do not spam when location stays off. */
export function shouldNotifyLocationOff(now = Date.now()): boolean {
  if (now - lastOffToastAt < 20_000) return false;
  lastOffToastAt = now;
  return true;
}
