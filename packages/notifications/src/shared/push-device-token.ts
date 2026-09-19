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
}): Promise<() => void> {
  try {
    const mod = await import(/* @vite-ignore */ "@capacitor/push-notifications").catch(
      () => null,
    );
    if (!mod?.PushNotifications) return () => undefined;

    const { PushNotifications } = mod;
    const perm = await PushNotifications.checkPermissions();
    const granted =
      perm.receive === "granted"
        ? true
        : (await PushNotifications.requestPermissions()).receive === "granted";
    input.onPermission?.(granted);
    if (!granted) return () => undefined;

    const registrationHandler = await PushNotifications.addListener(
      "registration",
      (event: { value: string }) => {
        const token = event.value?.trim();
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
      (event: {
        title?: string;
        body?: string;
        data?: Record<string, string>;
      }) => {
        const data = event.data ?? {};
        const isAlert =
          data.presentation === "alert" ||
          data.variant === "alert" ||
          data.priority === "critical";
        void import("./in-app-alert.js").then(({ dispatchInAppAlert }) => {
          dispatchInAppAlert({
            title: event.title ?? data.title ?? "Notification",
            body: event.body ?? data.body ?? "",
            href: data.href,
            variant: isAlert ? "alert" : "notification",
            severity:
              data.alertSeverity === "emergency" || data.priority === "critical"
                ? "emergency"
                : "mandatory",
          });
        });
      },
    );

    const errorHandler = await PushNotifications.addListener(
      "registrationError",
      () => undefined,
    );

    await PushNotifications.register();

    return () => {
      void registrationHandler.remove();
      void receivedHandler.remove();
      void errorHandler.remove();
    };
  } catch {
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
