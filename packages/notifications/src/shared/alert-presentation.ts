import type { AppNotification } from "@lumenx/types";

/** Payload flag set by Admin alert evaluate / school-alert broadcast. */
export const ALERT_PRESENTATION = "alert" as const;

export type AlertPresentationPayload = {
  presentation?: typeof ALERT_PRESENTATION | string;
  alertSeverity?: "mandatory" | "emergency";
  schoolAlertId?: string;
};

export function readAlertPayload(
  payload: Record<string, unknown> | null | undefined,
): AlertPresentationPayload {
  if (!payload || typeof payload !== "object") return {};
  return {
    presentation:
      typeof payload.presentation === "string" ? payload.presentation : undefined,
    alertSeverity:
      payload.alertSeverity === "mandatory" || payload.alertSeverity === "emergency"
        ? payload.alertSeverity
        : undefined,
    schoolAlertId:
      typeof payload.schoolAlertId === "string" ? payload.schoolAlertId : undefined,
  };
}

export function isAlertPresentationPayload(
  payload: Record<string, unknown> | null | undefined,
): boolean {
  return readAlertPayload(payload).presentation === ALERT_PRESENTATION;
}

/** True for mandatory/emergency school alerts and critical system notifications. */
export function isAlertNotification(n: AppNotification): boolean {
  if (n.category === "emergency") return true;
  if (n.priority === "high" && n.type === "warning") return true;
  const payload = (n as AppNotification & { payload?: Record<string, unknown> }).payload;
  return isAlertPresentationPayload(payload);
}

export const ALERT_ROW_CLASS =
  "border-destructive/45 bg-destructive/[0.07] ring-1 ring-destructive/20";

export const ALERT_ICON_CHIP_CLASS =
  "bg-destructive/15 text-destructive border border-destructive/30";

export const ALERT_BADGE_CLASS =
  "border-0 bg-destructive text-destructive-foreground";

export const NOTIFICATION_ROW_CLASS = "border-border bg-card";
