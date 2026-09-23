import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isApiAuthMode } from "@/auth/auth-mode";
import { getConnectApiClient } from "@/lib/connect-api";
import { bootstrapPushDeviceToken, dispatchInAppAlert } from "@lumenx/notifications";
import { bootstrapWebFcm, logLumenXAnalyticsEventForContext } from "@lumenx/auth";
import { connectQueryRoots } from "@/lib/connect-queries/keys";

/** Registers FCM token (native Capacitor and/or web) with backend in API mode. */
export function PushDeviceTokenRegistration({ enabled }: { enabled: boolean }): null {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !isApiAuthMode()) return;
    const invalidateInbox = () => {
      void queryClient.invalidateQueries({ queryKey: [connectQueryRoots.inbox] });
    };
    let cleanup: (() => void) | undefined;
    void bootstrapPushDeviceToken({
      app: "connect",
      register: async ({ app, platform, token }) => {
        await getConnectApiClient().post("/api/v1/notifications/device-tokens", {
          app,
          platform,
          token,
        });
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
      onForegroundPush: () => invalidateInbox(),
      onNotificationOpened: (href) => {
        if (typeof window === "undefined") return;
        if (href.startsWith("http")) window.location.assign(href);
        else window.location.assign(href);
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
            invalidateInbox();
          },
        }),
    }).then((dispose) => {
      cleanup = dispose;
    });
    return () => cleanup?.();
  }, [enabled, queryClient]);
  return null;
}
