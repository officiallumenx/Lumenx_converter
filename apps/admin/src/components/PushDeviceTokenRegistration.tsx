import { useEffect } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { getAdminApiClient } from "@/lib/admin-api";
import { bootstrapPushDeviceToken } from "@lumenx/notifications";

export function PushDeviceTokenRegistration({ enabled }: { enabled: boolean }): null {
  useEffect(() => {
    if (!enabled || !isApiAuthMode()) return;
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
    }).then((dispose) => {
      cleanup = dispose;
    });
    return () => cleanup?.();
  }, [enabled]);
  return null;
}
