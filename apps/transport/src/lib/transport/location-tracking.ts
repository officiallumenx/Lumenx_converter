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

type LocationSettingsPlugin = {
  isEnabled: () => Promise<{ enabled: boolean }>;
  requestEnable: () => Promise<{ enabled: boolean }>;
};

const locationSettings = registerPlugin<LocationSettingsPlugin>("LocationSettings");

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

async function isNativeLocationEnabled(): Promise<boolean | null> {
  if (!isNativePlatform()) return null;
  try {
    return (await locationSettings.isEnabled()).enabled;
  } catch {
    return null;
  }
}

export function subscribeLocationTrack(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLocationTrackSnapshot(): LocationTrackState {
  return state;
}

async function probeFreshFix(): Promise<boolean> {
  const serviceEnabled = await isNativeLocationEnabled();
  if (serviceEnabled === false) return false;

  if (isNativePlatform()) {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 0,
      });
      return true;
    } catch {
      /* try web fallback */
    }
  }

  if (typeof navigator === "undefined" || !navigator.geolocation) return false;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve(true),
      () => resolve(false),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  });
}

async function checkLocationServiceNow() {
  if (checkingService) return;
  checkingService = true;

  try {
    const enabled = await isNativeLocationEnabled();
    if (enabled === false) {
      markOff("Location is off. Turn it on to continue marking attendance.");
      return;
    }

    if (enabled === true) {
      if (state.status === "off" || state.status === "checking") {
        const hasFix = await probeFreshFix();
        if (hasFix) markOn();
      }
      return;
    }

    // Web fallback: a fresh position is the only reliable service-state signal.
    const hasFix = await probeFreshFix();
    if (hasFix) markOn();
    else markOff("Location is off. Turn it on to continue marking attendance.");
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
      const hasFix = await probeFreshFix();
      if (hasFix) {
        markOn();
        return true;
      }
      markOff("Location is on, but a GPS fix is not available yet. Try again.");
      return false;
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
  const hasFix = await probeFreshFix();
  if (hasFix) markOn();
  else markOff("Location is off. Turn it on in your device controls, then try again.");
  return hasFix;
}

function markOn() {
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
  if (code === 1) {
    markOff("Location permission is off. Turn it on to continue the trip.");
    return;
  }
  if (code === 2) {
    markOff("GPS signal lost. Turn on location services.");
    return;
  }
  if (code === 3) {
    const stillOk = await probeFreshFix();
    if (stillOk) {
      markOn();
      return;
    }
    markOff("Could not get a fresh GPS fix. Turn on location and wait outdoors.");
    return;
  }
  markOff("Location is off. Turn on GPS to continue tracking.");
}

async function startNativeWatch() {
  const { Geolocation } = await import("@capacitor/geolocation");
  watchId = await Geolocation.watchPosition(
    {
      enableHighAccuracy: true,
      timeout: 15_000,
      maximumAge: 0,
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
      timeout: 15_000,
      maximumAge: 0,
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
  setState({
    status: "checking",
    message: "Starting live GPS tracking…",
    lastFixAt: null,
  });

  const ok = await probeFreshFix();
  if (ok) markOn();
  else markOff("Location is off. Turn on GPS to continue tracking.");

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
