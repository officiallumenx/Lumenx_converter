import { useEffect } from "react";
import { isNexusApiMode } from "@/lib/auth-mode";
import { getNexusApiClient } from "@/lib/nexus-api";
import { bootstrapPushDeviceToken, dispatchInAppAlert } from "@lumenx/notifications";
import { bootstrapWebFcm, logLumenXAnalyticsEventForContext } from "@lumenx/auth";

export function PushDeviceTokenRegistration({ enabled }: { enabled: boolean }): null {
  useEffect(() => {
    if (!enabled || !isNexusApiMode()) return;
    let cleanup: (() => void) | undefined;
    void bootstrapPushDeviceToken({
      app: "nexus",
      register: async ({ app, platform, token }) => {
        await getNexusApiClient().post("/api/v1/notifications/device-tokens", {
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
