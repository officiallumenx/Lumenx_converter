import { useEffect, useMemo, useSyncExternalStore } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useApp } from "@/lib/app-state";
import { alertStore } from "@/lib/alert-store";
import { leaveStore } from "@/lib/leave-store";
import { selectPendingLeaveRequests } from "@/lib/leave-utils";
import { loadPortalSchoolAlerts } from "@/lib/school-alerts";
import type { Role } from "@lumenx/types";

let apiUnackCount = 0;
let apiEmergencyCount = 0;
let apiTeacherLeaveCount = 0;
const apiListeners = new Set<() => void>();

function notifyApiListeners(): void {
  apiListeners.forEach((listener) => listener());
}

export function setConnectTeacherLeaveAlertCount(count: number): void {
  apiTeacherLeaveCount = count;
  notifyApiListeners();
}

export function setConnectApiAlertCounts(counts: {
  unack: number;
  emergency: number;
}): void {
  apiUnackCount = counts.unack;
  apiEmergencyCount = counts.emergency;
  notifyApiListeners();
}

export function useConnectAlertBadge(role: Role | null): number {
  const { activeInstituteId } = useApp();
  const demoUnack = useSyncExternalStore(
    alertStore.subscribe,
    alertStore.getUnackCount,
    () => 0,
  );

  const apiLearnerUnack = useSyncExternalStore(
    (listener) => {
      apiListeners.add(listener);
      return () => apiListeners.delete(listener);
    },
    () => apiUnackCount,
    () => 0,
  );

  const apiTeacherPending = useSyncExternalStore(
    (listener) => {
      apiListeners.add(listener);
      return () => apiListeners.delete(listener);
    },
    () => apiTeacherLeaveCount,
    () => 0,
  );

  const demoTeacherPending = useSyncExternalStore(
    leaveStore.subscribe,
    () => selectPendingLeaveRequests(leaveStore.getAll()).length,
    () => 0,
  );

  useEffect(() => {
    if (!isApiAuthMode() || !activeInstituteId) return;
    if (role !== "parent" && role !== "student") return;
    let cancelled = false;
    void loadPortalSchoolAlerts({ instituteId: activeInstituteId }).then((result) => {
      if (cancelled) return;
      const unack = result.alerts.filter((alert) => !alert.acknowledged).length;
      const emergency = result.alerts.filter(
        (alert) => alert.severity === "emergency" && !alert.acknowledged,
      ).length;
      setConnectApiAlertCounts({ unack, emergency });
    });
    return () => {
      cancelled = true;
    };
  }, [role, activeInstituteId]);

  return useMemo(() => {
    if (!role) return 0;
    if (role === "teacher") {
      return isApiAuthMode() ? apiTeacherPending : demoTeacherPending;
    }
    if (isApiAuthMode()) return apiLearnerUnack;
    return demoUnack;
  }, [role, demoUnack, apiLearnerUnack, apiTeacherPending, demoTeacherPending]);
}

export function useConnectEmergencyAlertBadge(role: Role | null): number {
  const demoEmergency = useSyncExternalStore(
    alertStore.subscribe,
    alertStore.getEmergencyCount,
    () => 0,
  );
  const apiEmergency = useSyncExternalStore(
    (listener) => {
      apiListeners.add(listener);
      return () => apiListeners.delete(listener);
    },
    () => apiEmergencyCount,
    () => 0,
  );
  if (!role || role === "teacher") return 0;
  return isApiAuthMode() ? apiEmergency : demoEmergency;
}
