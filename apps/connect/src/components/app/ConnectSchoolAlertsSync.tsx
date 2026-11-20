import { useEffect, useRef } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useApp } from "@/lib/app-state";
import { useTeacherPortal } from "@/context/TeacherPortalContext";
import { alertStore } from "@/lib/alert-store";
import {
  setConnectApiAlertCounts,
  setConnectTeacherLeaveAlertCount,
} from "@/lib/use-connect-alert-badge";
import { dispatchInAppAlert } from "@lumenx/notifications";
import {
  useSchoolAlertsQuery,
  useTeacherLeaveQuery,
} from "@/lib/connect-queries/hooks";

const POLL_MS = 45_000;

/**
 * Single shared source for school-alert / teacher-leave badge freshness.
 * Uses React Query (same keys as Alerts / Leave modules) with a 45s refetch interval
 * so Home widgets and nav badges do not run competing timers.
 */
export function ConnectSchoolAlertsSync(): null {
  const { role, activeInstituteId } = useApp();
  const portal = useTeacherPortal();
  const seenAlertIdsRef = useRef<Set<string> | null>(null);
  const initialLoadDoneRef = useRef(false);

  const isLearner = role === "parent" || role === "student";
  const isTeacher = role === "teacher" && portal.isTeacher;
  const teacherId = portal.teacherId ?? portal.profile?.id ?? null;

  const alertsQuery = useSchoolAlertsQuery(activeInstituteId, isLearner && isApiAuthMode(), {
    refetchInterval: POLL_MS,
  });
  const leaveQuery = useTeacherLeaveQuery(
    activeInstituteId,
    teacherId,
    isTeacher && isApiAuthMode(),
    { refetchInterval: POLL_MS },
  );

  useEffect(() => {
    if (!isLearner) return;
    const result = alertsQuery.data;
    if (!result) return;
    if (result.status === "error" || result.status === "forbidden") return;

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
  }, [isLearner, alertsQuery.data]);

  useEffect(() => {
    if (!isTeacher) return;
    const result = leaveQuery.data;
    if (!result) return;
    const pending = result.studentRequests.filter((row) => row.status === "pending").length;
    setConnectTeacherLeaveAlertCount(pending);
  }, [isTeacher, leaveQuery.data]);

  return null;
}
