import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isApiAuthMode } from "@/auth/auth-mode";
import { getAdminApiClient } from "@/lib/admin-api";
import { bootstrapPushDeviceToken } from "@lumenx/notifications";
import { bootstrapWebFcm, logLumenXAnalyticsEventForContext } from "@lumenx/auth";
import { dispatchInAppAlert } from "@lumenx/notifications";
import { adminQueryRoots } from "@/lib/admin-queries/keys";

export function PushDeviceTokenRegistration({ enabled }: { enabled: boolean }): null {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !isApiAuthMode()) return;
    const invalidateInbox = () => {
      void queryClient.invalidateQueries({ queryKey: [adminQueryRoots.notifications] });
    };
    let cleanup: (() => void) | undefined;
    void bootstrapPushDeviceToken({
      app: "admin",
      register: async ({ app, platform, token }) => {
        await getAdminApiClient().post("/api/v1/notifications/device-tokens", {
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
        window.location.assign(href);
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
