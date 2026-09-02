import { playAlertChime, playNotificationChime } from "./alert-chime";
import { scheduleNativeAlertNotification } from "./native-alert-push";

export type InAppAlertEventDetail = {
  title: string;
  body: string;
  href?: string;
  variant: "alert" | "notification";
  severity?: "mandatory" | "emergency" | "critical" | "high";
};

export const IN_APP_ALERT_EVENT = "lumenx:in-app-alert";

export function dispatchInAppAlert(detail: InAppAlertEventDetail): void {
  if (typeof window === "undefined") return;
  if (detail.variant === "alert") playAlertChime();
  else playNotificationChime();
  void scheduleNativeAlertNotification(detail);
  window.dispatchEvent(new CustomEvent(IN_APP_ALERT_EVENT, { detail }));
}

export function subscribeInAppAlerts(
  listener: (detail: InAppAlertEventDetail) => void,
): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = (event: Event) => {
    const custom = event as CustomEvent<InAppAlertEventDetail>;
    if (!custom.detail?.title) return;
    listener(custom.detail);
  };
  window.addEventListener(IN_APP_ALERT_EVENT, handler);
  return () => window.removeEventListener(IN_APP_ALERT_EVENT, handler);
}
