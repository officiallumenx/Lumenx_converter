/**
 * Transport notification severity → UI color + stored NotificationPriority.
 * INFO/ATTENTION must never use critical (red) for normal arrival/boarding.
 */
import type { NotificationPriority } from "../notifications/types.js";
import { TRANSPORT_EVENT, type TransportEventKind } from "./transport-events.js";

export type TransportSeverity = "info" | "attention" | "urgent" | "critical";

export type TransportNotificationPresentation =
  | "notification"
  | "chime"
  | "alert";

const EVENT_SEVERITY: Partial<Record<TransportEventKind | string, TransportSeverity>> = {
  [TRANSPORT_EVENT.TRIP_STARTED]: "info",
  [TRANSPORT_EVENT.TRIP_PHASE_CHANGED]: "info",
  [TRANSPORT_EVENT.TRIP_COMPLETED]: "info",
  [TRANSPORT_EVENT.STUDENT_BOARDED]: "info",
  [TRANSPORT_EVENT.STUDENT_DROPPED]: "info",
  [TRANSPORT_EVENT.SCHOOL_ARRIVED]: "info",
  [TRANSPORT_EVENT.NOT_RIDING_CREATED]: "info",
  [TRANSPORT_EVENT.NOT_RIDING_CANCELLED]: "info",
  [TRANSPORT_EVENT.STOP_APPROACHING]: "attention",
  [TRANSPORT_EVENT.TRIP_DELAYED]: "attention",
  [TRANSPORT_EVENT.STUDENT_NOT_BOARDED]: "attention",
  [TRANSPORT_EVENT.EMERGENCY_CREATED]: "critical",
  [TRANSPORT_EVENT.EMERGENCY_RESOLVED]: "info",
  [TRANSPORT_EVENT.STOP_ARRIVED]: "info",
  [TRANSPORT_EVENT.GPS_STALE]: "attention",
  /** Amber/attention — not critical red (SOS remains critical). */
  [TRANSPORT_EVENT.GPS_OFFLINE]: "attention",
  [TRANSPORT_EVENT.GPS_RECOVERED]: "info",
  [TRANSPORT_EVENT.TRIP_NOT_STARTED]: "attention",
  [TRANSPORT_EVENT.STOP_MISSED]: "urgent",
  [TRANSPORT_EVENT.TRANSPORT_ISSUE]: "urgent",
  [TRANSPORT_EVENT.SERVICE_REMINDER]: "info",
  [TRANSPORT_EVENT.PICKUP_REMINDER]: "attention",
};

/** Map product severity to shared notification priority (DB enum). */
export function priorityForSeverity(
  severity: TransportSeverity,
  opts?: { positiveOutcome?: boolean },
): NotificationPriority {
  switch (severity) {
    case "critical":
      return "critical";
    case "urgent":
      return "important";
    case "attention":
      return "important";
    case "info":
    default:
      return opts?.positiveOutcome ? "success" : "normal";
  }
}

export function severityForTransportEvent(
  kind: string,
  opts?: { approachThresholdMin?: number },
): TransportSeverity {
  if (kind === TRANSPORT_EVENT.STOP_APPROACHING) {
    // 30-min band = INFO (blue); 15/5 = ATTENTION (amber); never CRITICAL.
    const threshold = opts?.approachThresholdMin;
    if (threshold != null && threshold > 15) return "info";
    return "attention";
  }
  return EVENT_SEVERITY[kind] ?? "info";
}

export function presentationForSeverity(
  severity: TransportSeverity,
  opts?: { softChime?: boolean },
): TransportNotificationPresentation {
  if (severity === "critical") return "alert";
  if (opts?.softChime) return "chime";
  return "notification";
}

/** Critical safety events bypass institute notifications_enabled off-switch. */
export function isCriticalTransportBypass(severity: TransportSeverity): boolean {
  return severity === "critical";
}

/** Deterministic deep links by event kind. */
export function deepLinkForTransportEvent(
  kind: string,
  audience: "parent" | "driver" | "admin",
): string {
  switch (kind) {
    case TRANSPORT_EVENT.STOP_ARRIVED:
      return audience === "parent"
        ? "/transport/live"
        : audience === "driver"
          ? "/attendance"
          : "/transport";
    case TRANSPORT_EVENT.STUDENT_BOARDED:
      return "/transport";
    case TRANSPORT_EVENT.STUDENT_DROPPED:
      return audience === "parent" ? "/transport/history" : "/transport";
    case TRANSPORT_EVENT.EMERGENCY_CREATED:
    case TRANSPORT_EVENT.EMERGENCY_RESOLVED:
      return audience === "driver"
        ? "/emergency"
        : audience === "parent"
          ? "/transport/live"
          : "/transport";
    case TRANSPORT_EVENT.STOP_APPROACHING:
      return audience === "parent" ? "/transport/live" : "/transport";
    case TRANSPORT_EVENT.SCHOOL_ARRIVED:
      return audience === "parent"
        ? "/transport/live"
        : audience === "driver"
          ? "/attendance"
          : "/transport";
    default:
      return audience === "driver" ? "/" : "/transport";
  }
}

/** Spec-aligned dedupe key builders. */
export const transportDedupe = {
  arrived: (tripId: string, stopId: string) =>
    `transport:${tripId}:stop:${stopId}:arrived`,
  boarded: (tripId: string, studentId: string) =>
    `transport:${tripId}:student:${studentId}:boarded`,
  notBoarded: (tripId: string, studentId: string) =>
    `transport:${tripId}:student:${studentId}:not_boarded`,
  dropped: (tripId: string, studentId: string) =>
    `transport:${tripId}:student:${studentId}:dropped`,
  approach: (tripId: string, studentId: string, thresholdMin: number) =>
    `transport:${tripId}:student:${studentId}:approach:${thresholdMin}`,
  reminder: (
    tripOrRouteKey: string,
    studentId: string,
    reminderType: string,
    serviceDate: string,
  ) =>
    `transport:${tripOrRouteKey}:reminder:${studentId}:${reminderType}:${serviceDate}`,
  tripStarted: (tripId: string, audience: string) =>
    `transport:${tripId}:started:${audience}`,
  schoolArrived: (tripId: string, audience: string) =>
    `transport:${tripId}:school_arrived:${audience}`,
  tripCompleted: (tripId: string) => `transport:${tripId}:completed`,
  emergency: (emergencyId: string, audience = "admin") =>
    `transport:sos:${emergencyId}:${audience}`,
  emergencyResolved: (emergencyId: string, audience = "admin") =>
    `transport:sos_resolved:${emergencyId}:${audience}`,
  notRiding: (studentId: string, serviceDate: string) =>
    `transport:not_riding:${studentId}:${serviceDate}`,
  notRidingCancelled: (studentId: string, serviceDate: string) =>
    `transport:not_riding_cancelled:${studentId}:${serviceDate}`,
  gpsStale: (tripId: string) => `transport:${tripId}:gps_stale`,
  /** One offline alert per trip episode (until GPS_RECOVERED). */
  gpsOffline: (tripId: string) => `transport:${tripId}:gps_offline`,
  tripNotStarted: (routeId: string, serviceDate: string) =>
    `transport:${routeId}:not_started:${serviceDate}`,
  tripDelayed: (tripId: string) => `transport:${tripId}:delayed`,
  stopMissed: (tripId: string, stopId: string) =>
    `transport:${tripId}:stop:${stopId}:missed`,
};
