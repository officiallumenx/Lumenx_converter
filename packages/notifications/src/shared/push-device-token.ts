export type DeviceApp = "connect" | "admin" | "transport" | "nexus" | "careers";
export type DevicePlatform = "android" | "ios" | "web";

export type RegisterDeviceTokenFn = (input: {
  app: DeviceApp;
  platform: DevicePlatform;
  token: string;
}) => Promise<void>;

function detectPlatform(): DevicePlatform {
  if (typeof navigator === "undefined") return "web";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "web";
}

/**
 * Register FCM device token with backend when Capacitor PushNotifications is available.
 */
export async function bootstrapPushDeviceToken(input: {
  app: DeviceApp;
  register: RegisterDeviceTokenFn;
}): Promise<() => void> {
  if (typeof window === "undefined") return () => undefined;

  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (!cap?.isNativePlatform?.()) return () => undefined;

  try {
    const mod = await import(/* @vite-ignore */ "@capacitor/push-notifications").catch(() => null);
    if (!mod?.PushNotifications) return () => undefined;

    const { PushNotifications } = mod;
    const perm = await PushNotifications.checkPermissions();
    const granted =
      perm.receive === "granted"
        ? true
        : (await PushNotifications.requestPermissions()).receive === "granted";
    if (!granted) return () => undefined;

    const registrationHandler = await PushNotifications.addListener(
      "registration",
      (event: { value: string }) => {
        const token = event.value?.trim();
        if (!token) return;
        void input.register({
          app: input.app,
          platform: detectPlatform(),
          token,
        }).catch(() => undefined);
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
