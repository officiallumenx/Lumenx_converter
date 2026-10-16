import { useEffect } from "react";
import { isApiAuthMode } from "@/lib/auth/auth-mode";
import { registerTransportDeviceToken } from "@/lib/transport-api";
import {
  bootstrapPushDeviceToken,
  dispatchInAppAlert,
  openSafeAppDeepLink,
} from "@lumenx/notifications";
import { bootstrapWebFcm, logLumenXAnalyticsEventForContext } from "@lumenx/auth";

export function PushDeviceTokenRegistration({ enabled }: { enabled: boolean }): null {
  useEffect(() => {
    if (!enabled || !isApiAuthMode()) return;
    let cleanup: (() => void) | undefined;
    void bootstrapPushDeviceToken({
      app: "transport",
      register: async ({ app, platform, token }) => {
        await registerTransportDeviceToken({ app, platform, token });
      },
      onPermission: (granted) => {
        void logLumenXAnalyticsEventForContext({
          name: granted ? "push_permission_granted" : "push_permission_denied",
        });
      },
      onTokenRegistered: (platform) => {
        void logLumenXAnalyticsEventForContext({
          name: "push_token_registered",
          params: { platform },
        });
      },
      onDiagnostic: (code) => {
        void logLumenXAnalyticsEventForContext({
          name: "push_bootstrap_diagnostic",
          params: { code },
        });
      },
      onForegroundPush: () => {
        // Refresh driver inbox without inventing toast copy (web FCM uses onForegroundMessage).
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("lumenx-transport-push-foreground"));
        }
      },
      onNotificationOpened: (href) => {
        openSafeAppDeepLink(href);
      },
      bootstrapWeb: async ({ register }) =>
        bootstrapWebFcm({
          register: async ({ token }) => register(token),
          onForegroundMessage: (payload) => {
            const isAlert =
              payload.data?.presentation === "alert" ||
              payload.data?.variant === "alert" ||
              payload.data?.priority === "critical";
            dispatchInAppAlert({
              title: payload.title ?? "Notification",
              body: payload.body ?? "",
              href: payload.data?.href,
              variant: isAlert ? "alert" : "notification",
              severity: payload.data?.priority === "critical" ? "emergency" : "mandatory",
            });
          },
        }),
    }).then((dispose) => {
      cleanup = dispose;
    });
    return () => cleanup?.();
  }, [enabled]);
  return null;
}
