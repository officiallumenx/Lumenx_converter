import { useEffect } from "react";
import { isNexusApiMode } from "@/lib/auth-mode";
import { getNexusApiClient } from "@/lib/nexus-api";
import { bootstrapPushDeviceToken } from "@lumenx/notifications";

/** Registers native FCM token with backend when user is in API mode. */
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
    }).then((dispose) => {
      cleanup = dispose;
    });
    return () => cleanup?.();
  }, [enabled]);
  return null;
}
