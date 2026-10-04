import { normalizeSafeAppDeepLink } from "./safe-deep-link.js";

export type DeviceApp =
  | "connect"
  | "admin"
  | "transport"
  | "nexus"
  | "careers"
  | "admissions";
export type DevicePlatform = "android" | "ios" | "web";

export type RegisterDeviceTokenFn = (input: {
  app: DeviceApp;
  platform: DevicePlatform;
  token: string;
}) => Promise<void>;

export type InvalidateDeviceTokensFn = (input: {
  app: DeviceApp;
}) => Promise<void>;

export type PushBootstrapDiagnostic =
  | "plugin_missing"
  | "permission_denied"
  | "registration_error"
  | "channels_failed";

const ALERT_CHANNEL = "lumenx_alerts";
const NOTIFICATION_CHANNEL = "lumenx_notifications";

function detectPlatform(): DevicePlatform {
  if (typeof navigator === "undefined") return "web";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "web";
}

function isNativeCapacitor(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

type PushNotificationsApi = {
  checkPermissions: () => Promise<{ receive: string }>;
  requestPermissions: () => Promise<{ receive: string }>;
  register: () => Promise<void>;
  createChannel?: (opts: {
    id: string;
    name: string;
    description?: string;
    importance: number;
    visibility?: number;
  }) => Promise<void>;
  addListener: (
    event: string,
    cb: (event: unknown) => void,
  ) => Promise<{ remove: () => Promise<void> }>;
};

async function ensureAndroidPushChannels(
  PushNotifications: PushNotificationsApi,
): Promise<boolean> {
  if (typeof PushNotifications.createChannel !== "function") return true;
  try {
    await Promise.all([
      PushNotifications.createChannel({
        id: ALERT_CHANNEL,
        name: "LumenX Alerts",
        description: "Critical institute alerts",
        importance: 5,
        visibility: 1,
      }),
      PushNotifications.createChannel({
        id: NOTIFICATION_CHANNEL,
        name: "LumenX Notifications",
        description: "General institute notifications",
        importance: 4,
        visibility: 1,
      }),
    ]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Register FCM device token with backend when Capacitor PushNotifications is available.
 * Optionally registers web FCM when `bootstrapWeb` is provided (firebase/messaging + VAPID).
 */
export async function bootstrapPushDeviceToken(input: {
  app: DeviceApp;
  register: RegisterDeviceTokenFn;
  /** Optional web FCM bootstrap (from @lumenx/auth messaging-web). */
  bootstrapWeb?: (args: {
    register: (token: string) => Promise<void>;
  }) => Promise<() => void>;
  onPermission?: (granted: boolean) => void;
  onTokenRegistered?: (platform: DevicePlatform) => void;
  /** Called when a push arrives in the foreground (native or after in-app dispatch). */
  onForegroundPush?: (data: { href?: string }) => void;
  /** Native notification tap. */
  onNotificationOpened?: (href: string) => void;
  /** Non-throwing diagnostics for missing plugin / denied permission / channel failures. */
  onDiagnostic?: (code: PushBootstrapDiagnostic, detail?: string) => void;
}): Promise<() => void> {
  if (typeof window === "undefined") return () => undefined;

  const disposers: Array<() => void> = [];

  if (isNativeCapacitor()) {
    const nativeDispose = await bootstrapNativePush(input);
    disposers.push(nativeDispose);
  } else if (input.bootstrapWeb) {
    try {
      const webDispose = await input.bootstrapWeb({
        register: async (token) => {
          await input.register({
            app: input.app,
            platform: "web",
            token,
          });
          input.onTokenRegistered?.("web");
        },
      });
      disposers.push(webDispose);
    } catch {
      // Web FCM is optional — never block the app shell.
    }
  }

  return () => {
    for (const d of disposers) d();
  };
}

async function bootstrapNativePush(input: {
  app: DeviceApp;
  register: RegisterDeviceTokenFn;
  onPermission?: (granted: boolean) => void;
  onTokenRegistered?: (platform: DevicePlatform) => void;
  onForegroundPush?: (data: { href?: string }) => void;
  onNotificationOpened?: (href: string) => void;
  onDiagnostic?: (code: PushBootstrapDiagnostic, detail?: string) => void;
}): Promise<() => void> {
  try {
    const mod = await import(/* @vite-ignore */ "@capacitor/push-notifications").catch(
      () => null,
    );
    if (!mod?.PushNotifications) {
      input.onDiagnostic?.(
        "plugin_missing",
        "@capacitor/push-notifications not available",
      );
      return () => undefined;
    }

    const PushNotifications = mod.PushNotifications as PushNotificationsApi;
    const perm = await PushNotifications.checkPermissions();
    const granted =
      perm.receive === "granted"
        ? true
        : (await PushNotifications.requestPermissions()).receive === "granted";
    input.onPermission?.(granted);
    if (!granted) {
      input.onDiagnostic?.("permission_denied");
      return () => undefined;
    }

    const channelsOk = await ensureAndroidPushChannels(PushNotifications);
    if (!channelsOk) {
      input.onDiagnostic?.("channels_failed");
    }

    const registrationHandler = await PushNotifications.addListener(
      "registration",
      (event: unknown) => {
        const token = (event as { value?: string }).value?.trim();
        if (!token) return;
        const platform = detectPlatform();
        void input
          .register({
            app: input.app,
            platform,
            token,
          })
          .then(() => input.onTokenRegistered?.(platform))
          .catch(() => undefined);
      },
    );

    const receivedHandler = await PushNotifications.addListener(
      "pushNotificationReceived",
      (event: unknown) => {
        const ev = event as {
          title?: string;
          body?: string;
          data?: Record<string, string>;
        };
        const data = ev.data ?? {};
        const isAlert =
          data.presentation === "alert" ||
          data.variant === "alert" ||
          data.priority === "critical";
        const safeHref = normalizeSafeAppDeepLink(data.href) ?? undefined;
        void import("./in-app-alert.js").then(({ dispatchInAppAlert }) => {
          dispatchInAppAlert({
            title: ev.title ?? data.title ?? "Notification",
            body: ev.body ?? data.body ?? "",
            href: safeHref,
            variant: isAlert ? "alert" : "notification",
            severity:
              data.alertSeverity === "emergency" || data.priority === "critical"
                ? "emergency"
                : "mandatory",
          });
        });
        input.onForegroundPush?.({ href: safeHref });
      },
    );

    const openedHandler = await PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (event: unknown) => {
        const href = (
          event as { notification?: { data?: Record<string, string> } }
        ).notification?.data?.href?.trim();
        const safe = normalizeSafeAppDeepLink(href);
        if (safe) input.onNotificationOpened?.(safe);
      },
    );

    const errorHandler = await PushNotifications.addListener(
      "registrationError",
      (event: unknown) => {
        const detail =
          event && typeof event === "object" && "error" in event
            ? String((event as { error?: unknown }).error ?? "unknown")
            : "unknown";
        input.onDiagnostic?.("registration_error", detail);
      },
    );

    await PushNotifications.register();

    return () => {
      void registrationHandler.remove();
      void receivedHandler.remove();
      void openedHandler.remove();
      void errorHandler.remove();
    };
  } catch {
    input.onDiagnostic?.("plugin_missing", "native bootstrap threw");
    return () => undefined;
  }
}

/**
 * Soft-invalidate device tokens for this app via backend DELETE /device-tokens?app=.
 */
export async function invalidatePushDeviceTokens(input: {
  app: DeviceApp;
  apiBaseUrl: string;
  accessToken: string;
  fetchImpl?: typeof fetch;
}): Promise<void> {
  const base = input.apiBaseUrl.replace(/\/+$/, "");
  const fetchFn = input.fetchImpl ?? fetch;
  await fetchFn(
    `${base}/api/v1/notifications/device-tokens?app=${encodeURIComponent(input.app)}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${input.accessToken}`,
      },
    },
  ).catch(() => undefined);
}

/**
 * Best-effort logout cleanup: invalidate tokens using the current session token.
 */
export async function invalidatePushDeviceTokensBeforeSignOut(input: {
  app: DeviceApp;
  apiBaseUrl: string;
  getAccessToken: () => Promise<string | null | undefined>;
}): Promise<void> {
  try {
    const accessToken = await input.getAccessToken();
    if (!accessToken) return;
    await invalidatePushDeviceTokens({
      app: input.app,
      apiBaseUrl: input.apiBaseUrl,
      accessToken,
    });
  } catch {
    // Never block sign-out.
  }
}
