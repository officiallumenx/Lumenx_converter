import type { AlertCategory, AlertSeverity, SchoolAlert } from "@lumenx/types";

export const ALERT_SEVERITY_LABELS: Record<AlertSeverity, string> = {
  emergency: "Emergency",
  mandatory: "Mandatory",
};

export const ALERT_CATEGORY_LABELS: Record<AlertCategory, string> = {
  absence: "Absence",
  health: "Health",
  remark: "Urgent remark",
  safety: "Safety",
  attendance: "Attendance",
  leave: "Leave",
  general: "General",
};

export type AlertFilterId = "all" | AlertSeverity | AlertCategory;

export function filterAlerts(alerts: SchoolAlert[], filter: AlertFilterId): SchoolAlert[] {
  if (filter === "all") return alerts;
  if (filter === "emergency" || filter === "mandatory") {
    return alerts.filter((a) => a.severity === filter);
  }
  return alerts.filter((a) => a.category === filter);
}

export function countUnacknowledged(alerts: SchoolAlert[]): number {
  return alerts.filter((a) => !a.acknowledged).length;
}

export function countEmergency(alerts: SchoolAlert[]): number {
  return alerts.filter((a) => a.severity === "emergency" && !a.acknowledged).length;
}

export function sortAlerts(alerts: SchoolAlert[]): SchoolAlert[] {
  return [...alerts].sort((a, b) => {
    const sev = (s: AlertSeverity) => (s === "emergency" ? 0 : 1);
    if (sev(a.severity) !== sev(b.severity)) return sev(a.severity) - sev(b.severity);
    if (a.acknowledged !== b.acknowledged) return a.acknowledged ? 1 : -1;
    return 0;
  });
}

export function alertsForChild(alerts: SchoolAlert[], childId: string | undefined): SchoolAlert[] {
  if (!childId) return alerts;
  return alerts.filter((a) => !a.childId || a.childId === childId);
}
