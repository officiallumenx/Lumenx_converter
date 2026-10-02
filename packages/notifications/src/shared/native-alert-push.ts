/** Optional native local notification when Capacitor is available (distinct styling for alerts). */
import type { InAppAlertEventDetail } from "./in-app-alert";

const ALERT_CHANNEL = "lumenx_alerts";
const NOTIFICATION_CHANNEL = "lumenx_notifications";

let channelsReady: Promise<void> | null = null;

type LocalNotificationsApi = {
  createChannel?: (opts: {
    id: string;
    name: string;
    importance: number;
    visibility?: number;
  }) => Promise<void>;
  requestPermissions: () => Promise<{ display: string }>;
  checkPermissions: () => Promise<{ display: string }>;
  schedule: (opts: {
    notifications: Array<{
      id: number;
      title: string;
      body: string;
      schedule: { at: Date };
      extra?: Record<string, unknown>;
      channelId?: string;
    }>;
  }) => Promise<unknown>;
};

async function ensureLocalNotificationChannels(
  LocalNotifications: LocalNotificationsApi,
): Promise<boolean> {
  let perm = await LocalNotifications.checkPermissions();
  if (perm.display !== "granted") {
    perm = await LocalNotifications.requestPermissions();
  }
  if (perm.display !== "granted") return false;

  if (!channelsReady && typeof LocalNotifications.createChannel === "function") {
    const createChannel = LocalNotifications.createChannel.bind(LocalNotifications);
    channelsReady = Promise.all([
      createChannel({
        id: ALERT_CHANNEL,
        name: "LumenX Alerts",
        importance: 5,
        visibility: 1,
      }),
      createChannel({
        id: NOTIFICATION_CHANNEL,
        name: "LumenX Notifications",
        importance: 4,
        visibility: 1,
      }),
    ])
      .then(() => undefined)
      .catch(() => undefined);
  }
  if (channelsReady) await channelsReady;
  return true;
}

/**
 * Schedule a native local notification only when the app is backgrounded.
 * Foreground alerts are shown via Sonner to avoid double banners.
 */
export async function scheduleNativeAlertNotification(
  detail: InAppAlertEventDetail,
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    if (typeof document !== "undefined" && document.visibilityState === "visible") {
      return;
    }

    const cap = (
      window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }
    ).Capacitor;
    if (!cap?.isNativePlatform?.()) return;

    const mod = await import("@capacitor/local-notifications").catch(() => null);
    const LocalNotifications = (mod as { LocalNotifications?: LocalNotificationsApi } | null)
      ?.LocalNotifications;
    if (!LocalNotifications) return;

    const ok = await ensureLocalNotificationChannels(LocalNotifications);
    if (!ok) return;

    const isAlert = detail.variant === "alert";
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Math.random() * 1_000_000),
          title: isAlert ? `Important: ${detail.title}` : detail.title,
          body: detail.body,
          schedule: { at: new Date(Date.now() + 400) },
          extra: { href: detail.href, variant: detail.variant },
          channelId: isAlert ? ALERT_CHANNEL : NOTIFICATION_CHANNEL,
        },
      ],
    });
  } catch {
    // Native push is best-effort only.
  }
}
