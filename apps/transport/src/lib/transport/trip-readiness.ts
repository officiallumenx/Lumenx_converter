import { Capacitor } from "@capacitor/core";

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
const LOCATION_PERMISSION_TIMEOUT_MS = 45_000;
const LOCATION_PERMISSION_POLL_MS = 250;

type NotificationPermissionState = "granted" | "denied" | "prompt" | "unsupported";

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function isNativePlatform() {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
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

async function getCapacitorLocationPermission(): Promise<LocationPermissionState | null> {
  if (!isNativePlatform()) return null;

  try {
    const { Geolocation } = await import("@capacitor/geolocation");
    const result = await Geolocation.checkPermissions();
    if (result.location === "granted" || result.coarseLocation === "granted") return "granted";
    if (result.location === "denied") return "denied";
    return "prompt";
  } catch {
    return null;
  }
}

async function requestCapacitorLocationPermission(): Promise<LocationPermissionState | null> {
  if (!isNativePlatform()) return null;

  try {
    const { Geolocation } = await import("@capacitor/geolocation");
    const initial = await Geolocation.checkPermissions();
    if (initial.location === "granted" || initial.coarseLocation === "granted") return "granted";
    if (initial.location === "denied") return "denied";

    const result = await Geolocation.requestPermissions();
    if (result.location === "granted" || result.coarseLocation === "granted") return "granted";
    if (result.location === "denied") return "denied";

    const deadline = Date.now() + LOCATION_PERMISSION_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const next = await Geolocation.checkPermissions();
      if (next.location === "granted" || next.coarseLocation === "granted") return "granted";
      if (next.location === "denied") return "denied";
      await sleep(LOCATION_PERMISSION_POLL_MS);
    }

    return (await getCapacitorLocationPermission()) ?? "prompt";
  } catch {
    return null;
  }
}

async function readLocationPermission(): Promise<LocationPermissionState> {
  const fromCapacitor = await getCapacitorLocationPermission();
  if (fromCapacitor === "granted" || fromCapacitor === "denied") return fromCapacitor;
  if (fromCapacitor === "prompt" && isNativePlatform()) return "prompt";

  const fromApi = await readGeoPermission();
  if (fromApi === "granted" || fromApi === "denied") return fromApi;
  if (fromApi === "prompt") return "prompt";

  return "unsupported";
}

async function requestLocationPermission(): Promise<LocationPermissionState> {
  const initial = await readLocationPermission();
  if (initial === "granted" || initial === "denied") return initial;

  const fromCapacitor = await requestCapacitorLocationPermission();
  if (fromCapacitor === "granted" || fromCapacitor === "denied") return fromCapacitor;

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

async function getCapacitorPosition(): Promise<void> {
  const { Geolocation } = await import("@capacitor/geolocation");
  await Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: 18_000,
    maximumAge: 0,
  });
}

async function acquireLocationFix(): Promise<void> {
  if (isNativePlatform()) {
    try {
      await getCapacitorPosition();
      return;
    } catch {
      // Fall through to web geolocation inside the Capacitor WebView.
    }
  }

  if (!navigator.geolocation) {
    throw new Error("Geolocation unavailable");
  }

  const attempts: PositionOptions[] = [
    { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
    { enableHighAccuracy: false, timeout: 15_000, maximumAge: 0 },
    { enableHighAccuracy: true, timeout: 18_000, maximumAge: 0 },
  ];

  let lastError: GeolocationPositionError | Error | null = null;
  for (const options of attempts) {
    try {
      await getWebPosition(options);
      return;
    } catch (error) {
      lastError = error instanceof GeolocationPositionError ? error : new Error("Location failed");
    }
  }

  throw lastError ?? new Error("Location failed");
}

function locationErrorMessage(
  permission: LocationPermissionState,
  error?: GeolocationPositionError | Error | null,
): string {
  if (permission === "denied") {
    return isNativePlatform()
      ? "Turn on location permission in Android app settings, then check again."
      : "Turn on location/GPS permission, then check again.";
  }

  if (error instanceof GeolocationPositionError) {
    if (error.code === error.PERMISSION_DENIED) {
      return isNativePlatform()
        ? "Location permission is off. Allow it when Android asks, then check again."
        : "Location permission is off. Allow it in the browser, then check again.";
    }
    if (error.code === error.TIMEOUT) {
      return "GPS is taking too long. Move to an open area or wait a moment, then check again.";
    }
  }

  return isNativePlatform()
    ? "Could not get location. Turn on GPS/location services, then check again."
    : "Could not get location. Turn on GPS and check again.";
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

  let permission = await readLocationPermission();

  if (permission === "prompt" && request) {
    permission = await requestLocationPermission();
  }

  if (permission === "denied") {
    return {
      key: "gps",
      status: "off",
      message: locationErrorMessage("denied"),
    };
  }

  if (permission === "prompt") {
    return {
      key: "gps",
      status: "off",
      message: isNativePlatform()
        ? "Tap Check again, then allow location when Android asks."
        : "Tap Check again, then allow location when prompted.",
    };
  }

  try {
    await acquireLocationFix();
    return { key: "gps", status: "on", message: "GPS location is available." };
  } catch (error) {
    const geoError = error instanceof GeolocationPositionError ? error : null;
    return {
      key: "gps",
      status: "off",
      message: locationErrorMessage(permission, geoError),
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
