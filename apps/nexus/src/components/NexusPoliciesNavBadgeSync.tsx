import { useEffect } from "react";
import { isNexusApiMode } from "@/lib/auth-mode";
import { listDerivedPlatformAlerts } from "@/lib/policies/api";
import { setNexusActivePlatformAlertCount } from "@/lib/use-nexus-policies-nav-badge";
import { subscribeInAppAlerts } from "@lumenx/notifications";

const POLL_MS = 60_000;

/** Sidebar badge for unhandled critical/high platform alerts. */
export function NexusPoliciesNavBadgeSync(): null {
  useEffect(() => {
    if (!isNexusApiMode()) {
      setNexusActivePlatformAlertCount(0);
      return;
    }

    let cancelled = false;

    const refresh = () => {
      void listDerivedPlatformAlerts().then((alerts) => {
        if (cancelled) return;
        const active = alerts.filter(
          (alert) =>
            !alert.handledAt &&
            (alert.severity === "critical" || alert.severity === "high"),
        ).length;
        setNexusActivePlatformAlertCount(active);
      }).catch(() => {
        if (!cancelled) setNexusActivePlatformAlertCount(0);
      });
    };

    refresh();
    const unsubscribePush = subscribeInAppAlerts(refresh);
    const timer = window.setInterval(refresh, POLL_MS);
    return () => {
      cancelled = true;
      unsubscribePush();
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
