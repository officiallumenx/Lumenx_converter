import { useEffect } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { getSupabaseAccessToken } from "@/lib/supabase-browser";
import { bootstrapPushDeviceToken } from "@lumenx/notifications";

function apiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787").replace(/\/+$/, "");
}

/** Registers native FCM token with backend when user is in API mode. */
export function PushDeviceTokenRegistration({ enabled }: { enabled: boolean }): null {
  useEffect(() => {
    if (!enabled || !isApiAuthMode()) return;
    let cleanup: (() => void) | undefined;
    void bootstrapPushDeviceToken({
      app: "careers",
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
    }).then((dispose) => {
      cleanup = dispose;
    });
    return () => cleanup?.();
  }, [enabled]);
  return null;
}
