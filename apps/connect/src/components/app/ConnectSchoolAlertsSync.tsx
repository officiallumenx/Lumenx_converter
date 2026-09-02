import { useEffect, useRef } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useApp } from "@/lib/app-state";
import { useTeacherPortal } from "@/context/TeacherPortalContext";
import { getTeacherPortalApiCache } from "@/lib/teacher-classes";
import { loadPortalSchoolAlerts } from "@/lib/school-alerts";
import { alertStore } from "@/lib/alert-store";
import { loadTeacherLeavePortal } from "@/lib/leave";
import {
  setConnectApiAlertCounts,
  setConnectTeacherLeaveAlertCount,
} from "@/lib/use-connect-alert-badge";
import { dispatchInAppAlert } from "@lumenx/notifications";

const POLL_MS = 45_000;

/** Polls school alerts / teacher leave counts so badges and toasts update without navigating. */
export function ConnectSchoolAlertsSync(): null {
  const { role, activeInstituteId } = useApp();
  const portal = useTeacherPortal();
  const seenAlertIdsRef = useRef<Set<string> | null>(null);
  const initialLoadDoneRef = useRef(false);

  useEffect(() => {
    if (!isApiAuthMode() || !activeInstituteId) return;
    if (role !== "parent" && role !== "student" && role !== "teacher") return;

    let cancelled = false;

    const pollLearnerAlerts = async () => {
      const result = await loadPortalSchoolAlerts({ instituteId: activeInstituteId });
      if (cancelled || result.status === "error" || result.status === "forbidden") return;

      const unack = result.alerts.filter((alert) => !alert.acknowledged).length;
      const emergency = result.alerts.filter(
        (alert) => alert.severity === "emergency" && !alert.acknowledged,
      ).length;
      setConnectApiAlertCounts({ unack, emergency });

      if (result.status === "ready" || result.status === "empty") {
        alertStore.replaceFromApi(result.alerts);
      }

      const currentIds = new Set(result.alerts.map((alert) => alert.id));
      if (seenAlertIdsRef.current !== null && initialLoadDoneRef.current) {
        for (const alert of result.alerts) {
          if (alert.acknowledged || seenAlertIdsRef.current.has(alert.id)) continue;
          dispatchInAppAlert({
            title: alert.title,
            body: alert.summary || alert.title,
            href: "/alerts",
            variant: "alert",
            severity: alert.severity,
          });
        }
      }
      seenAlertIdsRef.current = currentIds;
      initialLoadDoneRef.current = true;
    };

    const pollTeacherLeave = async () => {
      if (!portal.isTeacher) return;
      const teacherId =
        getTeacherPortalApiCache()?.teacherId ?? portal.profile?.id ?? null;
      const result = await loadTeacherLeavePortal({
        instituteId: activeInstituteId,
        teacherId,
      });
      if (cancelled) return;
      const pending = result.studentRequests.filter((row) => row.status === "pending").length;
      setConnectTeacherLeaveAlertCount(pending);
    };

    const poll = () => {
      if (role === "parent" || role === "student") void pollLearnerAlerts();
      if (role === "teacher") void pollTeacherLeave();
    };

    poll();
    const timer = window.setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [role, activeInstituteId, portal.isTeacher, portal.profile?.id]);

  return null;
}
