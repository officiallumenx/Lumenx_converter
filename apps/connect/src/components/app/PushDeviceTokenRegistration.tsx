import { useEffect } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { getConnectApiClient } from "@/lib/connect-api";
import { bootstrapPushDeviceToken } from "@lumenx/notifications";

/** Registers native FCM token with backend when user is in API mode. */
export function PushDeviceTokenRegistration({ enabled }: { enabled: boolean }): null {
  useEffect(() => {
    if (!enabled || !isApiAuthMode()) return;
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
    }).then((dispose) => {
      cleanup = dispose;
    });
    return () => cleanup?.();
  }, [enabled]);
  return null;
}
