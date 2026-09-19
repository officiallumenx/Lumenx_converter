import { useEffect } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { getSupabaseAccessToken } from "@/lib/supabase-browser";
import { bootstrapPushDeviceToken, dispatchInAppAlert } from "@lumenx/notifications";
import { bootstrapWebFcm, logLumenXAnalyticsEventForContext } from "@lumenx/auth";

function apiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787").replace(/\/+$/, "");
}

/** Registers FCM token with backend for the Admissions app (API mode). */
export function PushDeviceTokenRegistration({ enabled }: { enabled: boolean }): null {
  useEffect(() => {
    if (!enabled || !isApiAuthMode()) return;
    let cleanup: (() => void) | undefined;
    void bootstrapPushDeviceToken({
      app: "admissions",
      register: async ({ app, platform, token }) => {
        const accessToken = await getSupabaseAccessToken();
        if (!accessToken) throw new Error("Authentication required");
        const response = await fetch(`${apiBaseUrl()}/api/v1/notifications/device-tokens`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ app, platform, token }),
        });
        if (!response.ok) {
          const text = await response.text();
          let message = `Request failed (${response.status})`;
          try {
            const json = JSON.parse(text) as { error?: { message?: string } };
            if (json.error?.message) message = json.error.message;
          } catch {
            // ignore
          }
          throw new Error(message);
        }
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
