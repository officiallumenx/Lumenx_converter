import { Capacitor, registerPlugin } from "@capacitor/core";

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

type LocationSettingsPlugin = {
  isEnabled: () => Promise<{ enabled: boolean }>;
  requestEnable: () => Promise<{ enabled: boolean }>;
};

const locationSettings = registerPlugin<LocationSettingsPlugin>("LocationSettings");

type ProbeResult = "ok" | "no-fix" | "denied" | "service-off";

function emit() {
  listeners.forEach((listener) => listener());
}

function setState(next: LocationTrackState) {
  state = next;
  emit();
}

function isNativePlatform() {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

function isRecentFix(iso: string | null, now = Date.now()): boolean {
  if (!iso) return false;
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return false;
  return now - at <= RECENT_FIX_MS;
}

async function isNativeLocationEnabled(): Promise<boolean | null> {
  if (!isNativePlatform()) return null;
  try {
    return (await locationSettings.isEnabled()).enabled;
  } catch {
    return null;
  }
}

async function isLocationPermissionGranted(): Promise<boolean | null> {
  if (isNativePlatform()) {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      const result = await Geolocation.checkPermissions();
      if (result.location === "granted" || result.coarseLocation === "granted") {
        return true;
      }
      if (result.location === "denied") return false;
      return null;
    } catch {
      return null;
    }
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

function isPermissionDeniedError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = "code" in err ? Number((err as { code?: number }).code) : NaN;
  if (code === 1) return true;
  const message = "message" in err ? String((err as { message?: string }).message) : "";
  return /denied|permission/i.test(message);
}

async function tryNativePosition(options: {
  enableHighAccuracy: boolean;
  timeout: number;
  maximumAge: number;
}): Promise<boolean> {
  const { Geolocation } = await import("@capacitor/geolocation");
  await Geolocation.getCurrentPosition(options);
  return true;
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
 */
async function probeFreshFix(): Promise<ProbeResult> {
  const serviceEnabled = await isNativeLocationEnabled();
  if (serviceEnabled === false) return "service-off";

  const attempts: Array<{
    enableHighAccuracy: boolean;
    timeout: number;
    maximumAge: number;
  }> = [
    { enableHighAccuracy: true, timeout: 8_000, maximumAge: 60_000 },
    { enableHighAccuracy: false, timeout: 10_000, maximumAge: 120_000 },
    { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
  ];

  let denied = false;

  if (isNativePlatform()) {
    for (const options of attempts) {
      try {
        await tryNativePosition(options);
        return "ok";
      } catch (err) {
        if (isPermissionDeniedError(err)) denied = true;
      }
    }
  }

  if (typeof navigator !== "undefined" && navigator.geolocation) {
    for (const options of attempts) {
      const ok = await tryWebPosition(options);
      if (ok) return "ok";
    }
  }

  if (denied) return "denied";
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

  const serviceEnabled = await isNativeLocationEnabled();
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
    const enabled = await isNativeLocationEnabled();
    if (enabled === false) {
      softMissStreak = 0;
      markOff("Location is off. Turn it on to continue marking attendance.");
      return;
    }

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
      const result = await locationSettings.requestEnable();
      if (!result.enabled) {
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

async function handlePositionError(code?: number) {
  const serviceEnabled = await isNativeLocationEnabled();
  const permission = await isLocationPermissionGranted();

  if (code === 1 || permission === false) {
    markOff("Location permission is off. Turn it on to continue the trip.");
    return;
  }

  if (serviceEnabled === false) {
    markOff("Location is off. Turn on GPS to continue tracking.");
    return;
  }

  // Service is on (or unknown) — timeout / unavailable is a weak signal, not "off".
  if (code === 2 || code === 3 || code == null) {
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
      enableHighAccuracy: true,
      timeout: 20_000,
      maximumAge: 15_000,
    },
    (position, error) => {
      if (error || !position) {
        void handlePositionError(
          typeof error?.code === "number" ? error.code : undefined,
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
      enableHighAccuracy: true,
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
