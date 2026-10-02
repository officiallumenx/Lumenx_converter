import {
  LOCATION_FIX_ATTEMPTS,
  getNativeCurrentPosition,
  hasNativeLocationPermission,
  isLocationPermissionDeniedError,
  isLocationServicesDisabledError,
  isNativeLocationServiceEnabled,
  isNativePlatform,
  readNativeLocationPermission,
  requestNativeLocationPermission,
  type NativeLocationPermission,
} from "./native-location";

export type ReadinessKey = "internet" | "notifications" | "gps";

export type ReadinessStatus = "waiting" | "checking" | "on" | "off";

export type ReadinessCheck = {
  key: ReadinessKey;
  label: string;
  status: ReadinessStatus;
  message: string;
};

export type ReadinessResult = {
  checks: ReadinessCheck[];
  allOn: boolean;
};

export type ReadinessProgressHandler = (checks: ReadinessCheck[]) => void;

export type TripReadinessOptions = {
  /** When false, only reads notification status (no system prompt). Use on sheet open. */
  requestNotifications?: boolean;
  /** When false, only probes location (no permission prompt). Use on sheet open. */
  requestLocation?: boolean;
};

const MIN_STATUS_VISIBLE_MS = 650;
const NOTIFICATION_PERMISSION_TIMEOUT_MS = 45_000;
const NOTIFICATION_PERMISSION_POLL_MS = 200;

type NotificationPermissionState = "granted" | "denied" | "prompt" | "unsupported";

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/** Native Android POST_NOTIFICATIONS — uses Local Notifications (no Firebase / FCM). */
async function getCapacitorNotificationPermission(): Promise<NotificationPermissionState | null> {
  if (!isNativePlatform()) return null;

  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const result = await LocalNotifications.checkPermissions();
    if (result.display === "granted") return "granted";
    if (result.display === "denied") return "denied";
    return "prompt";
  } catch {
    return null;
  }
}

async function waitForCapacitorNotificationPermission(): Promise<NotificationPermissionState> {
  const deadline = Date.now() + NOTIFICATION_PERMISSION_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const state = await getCapacitorNotificationPermission();
    if (state === "granted" || state === "denied") return state;
    await sleep(NOTIFICATION_PERMISSION_POLL_MS);
  }

  return (await getCapacitorNotificationPermission()) ?? "prompt";
}

async function requestCapacitorNotificationPermission(): Promise<NotificationPermissionState | null> {
  if (!isNativePlatform()) return null;

  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const initial = await LocalNotifications.checkPermissions();
    if (initial.display === "granted") return "granted";
    if (initial.display === "denied") return "denied";

    const result = await LocalNotifications.requestPermissions();
    if (result.display === "granted") return "granted";
    if (result.display === "denied") return "denied";

    return waitForCapacitorNotificationPermission();
  } catch {
    return null;
  }
}

async function queryNotificationPermission(): Promise<NotificationPermissionState | null> {
  if (!navigator.permissions?.query) return null;

  try {
    const result = await navigator.permissions.query({ name: "notifications" as PermissionName });
    if (result.state === "granted") return "granted";
    if (result.state === "denied") return "denied";
    return "prompt";
  } catch {
    return null;
  }
}

function readLegacyNotificationPermission(): NotificationPermissionState | null {
  if (typeof window === "undefined" || !("Notification" in window)) return null;

  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return "prompt";
}

async function readNotificationPermission(): Promise<NotificationPermissionState> {
  const fromCapacitor = await getCapacitorNotificationPermission();
  if (fromCapacitor === "granted" || fromCapacitor === "denied") return fromCapacitor;
  if (fromCapacitor === "prompt" && isNativePlatform()) return "prompt";

  const fromApi = await queryNotificationPermission();
  if (fromApi === "granted" || fromApi === "denied") return fromApi;

  const fromLegacy = readLegacyNotificationPermission();
  if (fromLegacy === "granted" || fromLegacy === "denied") return fromLegacy;

  if (fromCapacitor === "prompt" || fromApi === "prompt" || fromLegacy === "prompt") {
    return "prompt";
  }

  return "unsupported";
}

async function waitForNotificationPermissionChange(
  timeoutMs = NOTIFICATION_PERMISSION_TIMEOUT_MS,
): Promise<NotificationPermissionState> {
  if (isNativePlatform()) {
    return waitForCapacitorNotificationPermission();
  }

  if (!navigator.permissions?.query) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const legacy = readLegacyNotificationPermission();
      if (legacy === "granted" || legacy === "denied") return legacy;
      await sleep(NOTIFICATION_PERMISSION_POLL_MS);
    }
    return readLegacyNotificationPermission() ?? "prompt";
  }

  try {
    const status = await navigator.permissions.query({ name: "notifications" as PermissionName });

    if (status.state === "granted" || status.state === "denied") {
      return status.state;
    }

    return await new Promise<NotificationPermissionState>((resolve) => {
      let settled = false;

      const finish = (state: NotificationPermissionState) => {
        if (settled) return;
        settled = true;
        status.removeEventListener("change", onChange);
        window.clearTimeout(timeoutId);
        window.clearInterval(pollId);
        resolve(state);
      };

      const onChange = () => {
        if (status.state === "granted" || status.state === "denied") {
          finish(status.state);
        }
      };

      const pollId = window.setInterval(() => {
        const legacy = readLegacyNotificationPermission();
        if (legacy === "granted" || legacy === "denied") {
          finish(legacy);
          return;
        }
        if (status.state === "granted" || status.state === "denied") {
          finish(status.state);
        }
      }, NOTIFICATION_PERMISSION_POLL_MS);

      const timeoutId = window.setTimeout(() => {
        void readNotificationPermission().then((state) => finish(state));
      }, timeoutMs);

      status.addEventListener("change", onChange);
    });
  } catch {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const state = await readNotificationPermission();
      if (state === "granted" || state === "denied") return state;
      await sleep(NOTIFICATION_PERMISSION_POLL_MS);
    }
    return readNotificationPermission();
  }
}

async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  const initial = await readNotificationPermission();
  if (initial === "granted" || initial === "denied" || initial === "unsupported") {
    return initial;
  }

  const fromCapacitor = await requestCapacitorNotificationPermission();
  if (fromCapacitor === "granted" || fromCapacitor === "denied") {
    return fromCapacitor;
  }

  if ("Notification" in window) {
    try {
      const result = await Notification.requestPermission();
      if (result === "granted" || result === "denied") return result;
    } catch {
      // Fall through — poll for permission updates after the system sheet.
    }
  }

  return waitForNotificationPermissionChange();
}

async function checkNotifications(options?: {
  request?: boolean;
}): Promise<Omit<ReadinessCheck, "label">> {
  const request = options?.request ?? true;
  let permission = await readNotificationPermission();

  if (permission === "prompt" && request) {
    permission = await requestNotificationPermission();
  }

  if (permission === "granted") {
    return { key: "notifications", status: "on", message: "Notifications are allowed." };
  }

  if (permission === "unsupported") {
    return {
      key: "notifications",
      status: "off",
      message: "Notifications are not supported on this device.",
    };
  }

  if (permission === "prompt") {
    return {
      key: "notifications",
      status: "off",
      message: isNativePlatform()
        ? "Tap Check again, then allow notifications when Android asks."
        : "Tap Check again, then allow notifications when prompted.",
    };
  }

  return {
    key: "notifications",
    status: "off",
    message: isNativePlatform()
      ? "Turn on notifications in Android app settings, then check again."
      : "Turn on notifications in app settings, then check again.",
  };
}

async function checkInternet(): Promise<Omit<ReadinessCheck, "label">> {
  if (typeof navigator === "undefined") {
    return { key: "internet", status: "off", message: "Network status unavailable." };
  }

  if (!navigator.onLine) {
    return {
      key: "internet",
      status: "off",
      message: "Turn on mobile data or Wi‑Fi, then check again.",
    };
  }

  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 3500);
    await fetch("https://www.gstatic.com/generate_204", {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal,
    });
    window.clearTimeout(timeout);
    return { key: "internet", status: "on", message: "Internet is connected." };
  } catch {
    return {
      key: "internet",
      status: "off",
      message: "No internet. Turn on mobile data or Wi‑Fi, then check again.",
    };
  }
}

function readGeoPermission(): Promise<PermissionState | "unsupported"> {
  if (!navigator.permissions?.query) return Promise.resolve("unsupported");
  return navigator.permissions
    .query({ name: "geolocation" as PermissionName })
    .then((result) => result.state)
    .catch(() => "unsupported" as const);
}

type LocationPermissionState = "granted" | "denied" | "prompt" | "unsupported";

function mapNativePermission(state: NativeLocationPermission): LocationPermissionState | null {
  if (state === "granted" || state === "denied" || state === "prompt") return state;
  return null;
}

async function readLocationPermission(): Promise<LocationPermissionState> {
  if (isNativePlatform()) {
    const native = mapNativePermission(await readNativeLocationPermission());
    // Never use WebView permissions on Capacitor — they falsely report denied.
    return native ?? "unsupported";
  }

  const fromApi = await readGeoPermission();
  if (fromApi === "granted" || fromApi === "denied") return fromApi;
  if (fromApi === "prompt") return "prompt";

  return "unsupported";
}

async function requestLocationPermission(): Promise<LocationPermissionState> {
  if (isNativePlatform()) {
    const native = mapNativePermission(await requestNativeLocationPermission());
    return native ?? "unsupported";
  }

  const initial = await readLocationPermission();
  if (initial === "granted" || initial === "denied") return initial;
  return readLocationPermission();
}

function getWebPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation unavailable"));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

async function acquireLocationFix(): Promise<void> {
  let lastError: unknown = null;

  if (isNativePlatform()) {
    for (const options of LOCATION_FIX_ATTEMPTS) {
      try {
        await getNativeCurrentPosition(options);
        return;
      } catch (error) {
        lastError = error;
        // Permission truly denied — stop early.
        if (isLocationPermissionDeniedError(error)) throw error;
      }
    }
  }

  if (!navigator.geolocation) {
    throw lastError ?? new Error("Geolocation unavailable");
  }

  for (const options of LOCATION_FIX_ATTEMPTS) {
    try {
      await getWebPosition(options);
      return;
    } catch (error) {
      lastError = error;
      if (isLocationPermissionDeniedError(error)) throw error;
    }
  }

  throw lastError ?? new Error("Location failed");
}

function locationErrorMessage(
  permission: LocationPermissionState,
  error?: unknown,
): string {
  if (permission === "denied" || isLocationPermissionDeniedError(error)) {
    return isNativePlatform()
      ? "Turn on location permission in Android app settings, then check again."
      : "Turn on location/GPS permission, then check again.";
  }

  if (isLocationServicesDisabledError(error)) {
    return "Turn on GPS/location services, then check again.";
  }

  if (error instanceof GeolocationPositionError) {
    if (error.code === error.PERMISSION_DENIED) {
      return isNativePlatform()
        ? "Location permission is off. Allow it when Android asks, then check again."
        : "Location permission is off. Allow it in the browser, then check again.";
    }
    if (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE) {
      return "Location is on, but GPS needs a clearer signal. Step outdoors and check again.";
    }
  }

  return isNativePlatform()
    ? "Could not get a GPS fix yet. Keep location on, step outdoors, then check again."
    : "Could not get a GPS fix yet. Keep location on and check again.";
}

async function checkGps(options?: { request?: boolean }): Promise<Omit<ReadinessCheck, "label">> {
  const request = options?.request ?? true;

  if (typeof navigator === "undefined" && !isNativePlatform()) {
    return {
      key: "gps",
      status: "off",
      message: "GPS is not available on this device.",
    };
  }

  if (!isNativePlatform() && typeof navigator !== "undefined" && !navigator.geolocation) {
    return {
      key: "gps",
      status: "off",
      message: "GPS is not available in this browser.",
    };
  }

  let permission = await readLocationPermission();

  // Web Permissions API "denied" is trustworthy (unlike Cap on native).
  if (!isNativePlatform() && permission === "denied") {
    return {
      key: "gps",
      status: "off",
      message: locationErrorMessage("denied"),
    };
  }

  // Browser geolocation requires a user gesture to show the allow prompt.
  // Auto-check on sheet open must NOT call getCurrentPosition while still
  // "prompt" — Chrome often silent-denies and GPS stays stuck Not Ready.
  if (
    !isNativePlatform() &&
    !request &&
    (permission === "prompt" || permission === "unsupported")
  ) {
    return {
      key: "gps",
      status: "off",
      message: "Tap Fix & check again, then allow location when prompted.",
    };
  }

  if ((permission === "prompt" || permission === "unsupported") && request) {
    permission = await requestLocationPermission();
  }

  try {
    await acquireLocationFix();
    return { key: "gps", status: "on", message: "GPS location is available." };
  } catch (error) {
    const hardPermissionDenied =
      isLocationPermissionDeniedError(error) ||
      (typeof GeolocationPositionError !== "undefined" &&
        error instanceof GeolocationPositionError &&
        error.code === error.PERMISSION_DENIED);

    if (hardPermissionDenied) {
      const pkg = await hasNativeLocationPermission();
      // Native: Cap often false-labels settings dialogs as denied — trust PackageManager.
      if (isNativePlatform()) {
        if (pkg === false) {
          return {
            key: "gps",
            status: "off",
            message: locationErrorMessage("denied", error),
          };
        }
        // pkg granted/unknown → soft miss below
      } else {
        // Web: position error code 1 is authoritative.
        return {
          key: "gps",
          status: "off",
          message: locationErrorMessage("denied", error),
        };
      }
    }

    const enabledNow = await isNativeLocationServiceEnabled();
    if (enabledNow === false && isLocationServicesDisabledError(error)) {
      return {
        key: "gps",
        status: "off",
        message: "Turn on GPS/location services, then check again.",
      };
    }
    if (enabledNow === false) {
      const pkg = await hasNativeLocationPermission();
      if (pkg !== true && permission !== "granted") {
        return {
          key: "gps",
          status: "off",
          message: "Turn on GPS/location services, then check again.",
        };
      }
    }

    // Re-read after the fix attempt — Permissions API can lag behind the prompt.
    const permissionAfter = await readLocationPermission();
    if (!isNativePlatform() && permissionAfter === "denied") {
      return {
        key: "gps",
        status: "off",
        message: locationErrorMessage("denied", error),
      };
    }

    // Not a hard deny: indoor/timeout/prompt lag must not block starting.
    // Applies to native and to the HTTPS web/PWA driver app.
    if (
      isNativePlatform() ||
      permissionAfter === "granted" ||
      permissionAfter === "prompt" ||
      permissionAfter === "unsupported" ||
      permission === "granted" ||
      permission === "unsupported"
    ) {
      return {
        key: "gps",
        status: "on",
        message: "Location is on. GPS will strengthen outdoors.",
      };
    }

    return {
      key: "gps",
      status: "off",
      message: locationErrorMessage(permissionAfter, error),
    };
  }
}

const LABELS: Record<ReadinessKey, string> = {
  internet: "Internet",
  notifications: "Notifications",
  gps: "GPS",
};

const CHECKERS: Array<{
  key: ReadinessKey;
  run: () => Promise<Omit<ReadinessCheck, "label">>;
}> = [
  { key: "internet", run: checkInternet },
  { key: "notifications", run: () => checkNotifications() },
  { key: "gps", run: () => checkGps() },
];

function waitForStatusVisibility() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, MIN_STATUS_VISIBLE_MS);
  });
}

/** Run checks in sequence so the driver can follow each service status. */
export async function runTripReadinessChecks(
  onProgress?: ReadinessProgressHandler,
  options?: TripReadinessOptions,
): Promise<ReadinessResult> {
  const requestNotifications = options?.requestNotifications ?? true;
  const requestLocation = options?.requestLocation ?? true;
  let checks = createCheckingState();

  for (const checker of CHECKERS) {
    checks = checks.map((check) =>
      check.key === checker.key
        ? { ...check, status: "checking", message: `Checking ${check.label.toLowerCase()}…` }
        : check,
    );
    onProgress?.(checks.map((check) => ({ ...check })));

    const runCheck =
      checker.key === "notifications"
        ? () => checkNotifications({ request: requestNotifications })
        : checker.key === "gps"
          ? () => checkGps({ request: requestLocation })
          : checker.run;

    const [result] = await Promise.all([runCheck(), waitForStatusVisibility()]);
    checks = checks.map((check) =>
      check.key === checker.key ? { ...result, label: LABELS[result.key] } : check,
    );
    onProgress?.(checks.map((check) => ({ ...check })));
  }

  return {
    checks,
    allOn: checks.every((check) => check.status === "on"),
  };
}

export function createCheckingState(): ReadinessCheck[] {
  return (Object.keys(LABELS) as ReadinessKey[]).map((key, index) => ({
    key,
    label: LABELS[key],
    status: index === 0 ? "checking" : "waiting",
    message: index === 0 ? "Checking internet…" : "Waiting to check…",
  }));
}
