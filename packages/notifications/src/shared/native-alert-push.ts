/** Optional native local notification when Capacitor is available (distinct styling for alerts). */
import type { InAppAlertEventDetail } from "./in-app-alert";

export async function scheduleNativeAlertNotification(
  detail: InAppAlertEventDetail,
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (!cap?.isNativePlatform?.()) return;

    // Dynamic import — only apps with @capacitor/local-notifications installed resolve this.
    const mod = await import("@capacitor/local-notifications").catch(() => null);
    if (!mod?.LocalNotifications) return;

    const { LocalNotifications } = mod;
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") return;

    const isAlert = detail.variant === "alert";
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Math.random() * 1_000_000),
          title: isAlert ? `Important: ${detail.title}` : detail.title,
          body: detail.body,
          schedule: { at: new Date(Date.now() + 400) },
          extra: { href: detail.href, variant: detail.variant },
          channelId: isAlert ? "lumenx-alerts" : "lumenx-notifications",
        },
      ],
    });
  } catch {
    // Native push is best-effort only.
  }
}
