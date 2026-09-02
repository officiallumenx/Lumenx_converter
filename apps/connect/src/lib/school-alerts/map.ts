import type { AlertCategory, AlertSeverity, SchoolAlert } from "@lumenx/types";
import { getInitials } from "@lumenx/utils";
import type { PortalSchoolAlertDto } from "./types";

export type { PortalSchoolAlertDto } from "./types";

export function portalSchoolAlertToSchoolAlert(dto: PortalSchoolAlertDto): SchoolAlert {
  return {
    id: dto.id,
    title: dto.title,
    summary: dto.summary,
    detail: dto.detail,
    severity: dto.severity as AlertSeverity,
    category: dto.category as AlertCategory,
    time: dto.time,
    source: dto.source,
    childName: dto.childName ?? undefined,
    childId: dto.studentId ?? undefined,
    unread: dto.unread,
    acknowledged: dto.acknowledged,
    actionRequired: dto.severity === "emergency" && !dto.acknowledged,
    actionLabel: dto.severity === "emergency" ? "Acknowledge now" : "Acknowledge",
  };
}

export function portalSchoolAlertsToSchoolAlerts(dtos: PortalSchoolAlertDto[]): SchoolAlert[] {
  return dtos.map(portalSchoolAlertToSchoolAlert);
}

export function schoolAlertInitials(name: string): string {
  return getInitials(name, 2);
}
