import { useEffect, useRef } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";
import { listRecentSchoolAlerts } from "@/lib/school-alerts";
import { setAdminEmergencyBroadcastCount } from "@/lib/use-admin-alerts-nav-badge";

const POLL_MS = 60_000;

/** Keeps sidebar /alerts red badge in sync with recent emergency broadcasts. */
export function AdminAlertsNavBadgeSync(): null {
  const instituteCtx = useInstituteContext();

  useEffect(() => {
    if (!isApiAuthMode()) {
      setAdminEmergencyBroadcastCount(0);
      return;
    }
    if (instituteCtx.status !== "ready" || !instituteCtx.activeInstituteId) {
      setAdminEmergencyBroadcastCount(0);
      return;
    }

    let cancelled = false;

    const refresh = () => {
      void listRecentSchoolAlerts(instituteCtx.activeInstituteId!).then((alerts) => {
        if (cancelled) return;
        const emergency = alerts.filter((alert) => alert.severity === "emergency").length;
        setAdminEmergencyBroadcastCount(emergency);
      });
    };

    refresh();
    const timer = window.setInterval(refresh, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [instituteCtx.status, instituteCtx.activeInstituteId]);

  return null;
}
