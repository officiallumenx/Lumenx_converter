import { useEffect } from "react";
import { subscribeInAppAlerts } from "@lumenx/notifications";

import { isApiAuthMode } from "@/lib/auth/auth-mode";
import { useTransportAuth } from "@/lib/auth/transport-auth";
import { useInboxQuery } from "@/lib/transport-queries";

/**
 * Keeps driver notification inbox warm via TanStack Query (poll + push invalidate).
 * Urgent toasts are surfaced by the alerts store when the query updates it.
 */
export function TransportAlertsSync(): null {
  const { user, apiMode } = useTransportAuth();
  const instituteId = apiMode && isApiAuthMode() ? (user?.instituteId ?? null) : null;
  const { refresh } = useInboxQuery(instituteId);

  useEffect(() => {
    if (!instituteId) return;
    const onInApp = () => {
      refresh();
    };
    const onPushForeground = () => {
      refresh();
    };
    const unsub = subscribeInAppAlerts(onInApp);
    window.addEventListener("lumenx-transport-push-foreground", onPushForeground);
    return () => {
      unsub();
      window.removeEventListener(
        "lumenx-transport-push-foreground",
        onPushForeground,
      );
    };
  }, [instituteId, refresh]);

  return null;
}
