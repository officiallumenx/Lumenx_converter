import { useEffect, useSyncExternalStore } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { isApiAuthMode } from "@/auth/auth-mode";
import { getAdminApiClient } from "@/lib/admin-api";
import {
  bootstrapPushDeviceToken,
  dispatchInAppAlert,
  openSafeAppDeepLink,
} from "@lumenx/notifications";
import { bootstrapWebFcm, logLumenXAnalyticsEventForContext } from "@lumenx/auth";
import { adminQueryRoots, ADMIN_QUERY_SCOPE } from "@/lib/admin-queries/keys";
import {
  isAdminPushBootstrapAllowed,
  subscribeAdminPushBootstrap,
} from "@/lib/push-bootstrap-gate";

/**
 * Registers FCM / native push after authenticated shell enables the bootstrap gate.
 */
export function PushDeviceTokenRegistration({ enabled }: { enabled: boolean }): null {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const pushAllowed = useSyncExternalStore(
    subscribeAdminPushBootstrap,
    isAdminPushBootstrapAllowed,
    () => false,
  );

  useEffect(() => {
    if (!enabled || !pushAllowed || !isApiAuthMode()) return;
    const invalidateInbox = () => {
      void queryClient.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          q.queryKey[0] === ADMIN_QUERY_SCOPE &&
          q.queryKey[2] === adminQueryRoots.notifications,
      });
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
      onDiagnostic: (code) => {
        void logLumenXAnalyticsEventForContext({
          name: "push_bootstrap_diagnostic",
          params: { code },
        });
      },
      onForegroundPush: () => invalidateInbox(),
      onNotificationOpened: (href) => {
        openSafeAppDeepLink(href, (path) => {
          void navigate({ to: path as "/" });
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
            invalidateInbox();
          },
        }),
    }).then((dispose) => {
      cleanup = dispose;
    }).catch(() => {
      // Permission unavailable / plugin missing — never crash Admin shell.
    });
    return () => cleanup?.();
  }, [enabled, pushAllowed, queryClient, navigate]);
  return null;
}
