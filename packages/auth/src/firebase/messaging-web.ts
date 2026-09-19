/**
 * Web FCM (firebase/messaging) — optional when VAPID + messagingSenderId are set.
 * Native Capacitor push remains the primary path via @lumenx/notifications.
 *
 * Does not use Firestore / RTDB / Storage.
 */

import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type Messaging,
  type Unsubscribe,
} from "firebase/messaging";
import { getFirebaseApp } from "./client";
import {
  resolveFirebaseWebConfig,
  type FirebaseWebConfigSource,
} from "./config";
import { logLumenXAnalyticsEventForContext } from "./analytics";

export type WebFcmRegisterFn = (input: {
  platform: "web";
  token: string;
}) => Promise<void>;

const TOKEN_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

function readVapidKey(): string {
  const env =
    typeof import.meta !== "undefined"
      ? (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
      : undefined;
  return env?.VITE_FIREBASE_VAPID_KEY?.trim() ?? "";
}

function postFirebaseConfigToServiceWorker(
  registration: ServiceWorkerRegistration | undefined,
  source?: FirebaseWebConfigSource,
): void {
  const config = resolveFirebaseWebConfig(source);
  if (!config?.messagingSenderId || !registration) return;
  const payload = {
    type: "FIREBASE_CLIENT_CONFIG",
    config: {
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      appId: config.appId,
      messagingSenderId: config.messagingSenderId,
      measurementId: config.measurementId,
      storageBucket: config.storageBucket,
    },
  };
  const post = (worker: ServiceWorker | null | undefined) => {
    worker?.postMessage(payload);
  };
  post(registration.active);
  post(registration.waiting);
  post(registration.installing);
  void navigator.serviceWorker.ready.then((ready) => post(ready.active));
}

export async function getFirebaseMessaging(
  source?: FirebaseWebConfigSource,
): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  const config = resolveFirebaseWebConfig(source);
  if (!config?.messagingSenderId) return null;
  const app = getFirebaseApp(source);
  if (!app) return null;
  try {
    if (!(await isSupported())) return null;
    return getMessaging(app);
  } catch {
    return null;
  }
}

/**
 * Request notification permission, obtain FCM web token, register with backend callback,
 * attach foreground onMessage handler, and refresh tokens on visibility / interval.
 */
export async function bootstrapWebFcm(input: {
  register: WebFcmRegisterFn;
  source?: FirebaseWebConfigSource;
  serviceWorkerPath?: string;
  onForegroundMessage?: (payload: {
    title?: string;
    body?: string;
    data?: Record<string, string>;
  }) => void;
}): Promise<() => void> {
  if (typeof window === "undefined") return () => undefined;

  const vapidKey = readVapidKey();
  if (!vapidKey) return () => undefined;

  const messaging = await getFirebaseMessaging(input.source);
  if (!messaging) return () => undefined;

  let unsubscribe: Unsubscribe | null = null;
  let lastToken = "";
  let refreshTimer: number | undefined;

  const registerToken = async (token: string) => {
    const trimmed = token.trim();
    if (!trimmed || trimmed === lastToken) return;
    lastToken = trimmed;
    await input.register({ platform: "web", token: trimmed });
  };

  const refreshToken = async (registration?: ServiceWorkerRegistration) => {
    try {
      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });
      if (token) await registerToken(token);
    } catch {
      // Token refresh is best-effort.
    }
  };

  try {
    const permission =
      typeof Notification !== "undefined"
        ? Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission()
        : "denied";

    if (permission === "granted") {
      void logLumenXAnalyticsEventForContext({ name: "push_permission_granted" });
    } else {
      void logLumenXAnalyticsEventForContext({ name: "push_permission_denied" });
      return () => undefined;
    }

    const swPath = input.serviceWorkerPath ?? "/firebase-messaging-sw.js";
    const registration = await navigator.serviceWorker
      .register(swPath)
      .catch(() => undefined);

    postFirebaseConfigToServiceWorker(registration, input.source);
    await refreshToken(registration);

    unsubscribe = onMessage(messaging, (payload) => {
      input.onForegroundMessage?.({
        title: payload.notification?.title,
        body: payload.notification?.body,
        data: (payload.data ?? {}) as Record<string, string>,
      });
    });

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        postFirebaseConfigToServiceWorker(registration, input.source);
        void refreshToken(registration);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    refreshTimer = window.setInterval(() => {
      void refreshToken(registration);
    }, TOKEN_REFRESH_INTERVAL_MS);

    return () => {
      unsubscribe?.();
      document.removeEventListener("visibilitychange", onVisibility);
      if (refreshTimer !== undefined) window.clearInterval(refreshTimer);
    };
  } catch {
    return () => undefined;
  }
}
