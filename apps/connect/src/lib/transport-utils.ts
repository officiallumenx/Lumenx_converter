import type { TransportAlert, TransportEventType, TransportTracking } from "@/lib/transport/types";
import { PARENT_TRANSPORT_STATUS_LABEL } from "@/lib/transport/parent-status";

export const TRANSPORT_EVENT_LABELS: Record<TransportEventType, string> = {
  eta_10min: "10 min to arrive",
  eta_5min: "5 min to arrive",
  arrived_stop: "Arrived at stop",
  picked_up: "Picked up",
  dropped_school: "Dropped at school",
  reached_school: "Reached school",
  departed_school: "Departed school",
  dropped_stop: "Dropped at stop",
  delay: "Route delay",
  trip_started: "Trip started",
  trip_completed: "Trip completed",
  sos: "Emergency",
  stop_pending: "Stop pending",
  stop_approved: "Stop approved",
};

export const TRANSPORT_EVENT_TONE: Record<
  TransportEventType,
  "default" | "warning" | "success" | "primary"
> = {
  eta_10min: "primary",
  eta_5min: "warning",
  arrived_stop: "primary",
  picked_up: "success",
  dropped_school: "success",
  reached_school: "success",
  departed_school: "default",
  dropped_stop: "success",
  delay: "warning",
  trip_started: "primary",
  trip_completed: "success",
  sos: "warning",
  stop_pending: "warning",
  stop_approved: "success",
};

/** Parent-facing arrival copy — avoid the technical label "ETA". */
export function formatEtaMinutes(minutes: number): string {
  if (minutes <= 0) return "Bus arriving now";
  if (minutes === 1) return "Bus arrives in 1 minute";
  return `Bus arrives in ${minutes} minutes`;
}

export type ApproachEtaDisplayInput = {
  minutes: number | null | undefined;
  displayMode?: "eta" | "stopped" | "stale" | "uncertain" | null;
  confidence?: "high" | "medium" | "low" | null;
  gpsFreshness?: "live" | "recent" | "stale" | "offline" | null;
  lastUpdated?: string | null;
};

/**
 * Confidence-aware arrival copy. Does not claim road-network accuracy.
 * Stale / uncertain GPS must not show a precise countdown as fact.
 */
export function formatApproachEta(input: ApproachEtaDisplayInput): string {
  const mode = input.displayMode;
  const freshness = input.gpsFreshness;
  const minutes =
    input.minutes != null && Number.isFinite(input.minutes)
      ? Math.max(0, Math.round(input.minutes))
      : null;

  if (mode === "stale" || freshness === "stale" || freshness === "offline") {
    if (input.lastUpdated) return `Location is stale · ${input.lastUpdated}`;
    return "Location is stale";
  }

  if (mode === "stopped") {
    if (minutes == null) return "Bus may be stopped · ETA unavailable";
    if (minutes <= 0) return "Arriving soon · bus may be stopped";
    return `About ${minutes} min · bus may be stopped`;
  }

  if (mode === "uncertain" || input.confidence === "low") {
    if (minutes == null) {
      return input.lastUpdated
        ? `Location updated · ${input.lastUpdated}`
        : "ETA unavailable";
    }
    if (minutes <= 0) return "Arriving soon";
    if (minutes === 1) return "About 1 min away";
    return `About ${minutes} min away`;
  }

  if (minutes == null) return "ETA unavailable";
  if (input.confidence === "medium") {
    if (minutes <= 0) return "Arriving soon";
    return `About ${minutes} min`;
  }
  return formatEtaMinutes(minutes);
}

export function trackingStatusLabel(tracking: TransportTracking): string {
  // Learner boarding/drop records are authoritative for picked-up / not-boarded / dropped.
  if (tracking.droppingStatus === "dropped" || tracking.learnerStatus === "reached_school") {
    return "Reached school";
  }
  if (tracking.boardingStatus === "not_boarded") {
    return "Not boarded";
  }
  if (tracking.boardingStatus === "boarded" || tracking.learnerStatus === "picked_up") {
    if (tracking.parentStatus === "at_school" || tracking.parentStatus === "dropping") {
      return PARENT_TRANSPORT_STATUS_LABEL[tracking.parentStatus];
    }
    return "Picked up";
  }
  // Unmarked: prefer live trip approach labels; never imply boarded.
  if (tracking.parentStatus) {
    return PARENT_TRANSPORT_STATUS_LABEL[tracking.parentStatus];
  }
  if (tracking.boardingStatus === "pending") {
    return "Not marked";
  }
  if (tracking.emergencyActive) return tracking.emergencyLabel || "Emergency on bus";
  if (tracking.runStatus === "delayed") return `Delayed · +${tracking.delayMinutes} min`;
  if (tracking.runStatus === "scheduled") return "Trip not started";
  if (tracking.etaMinutes <= 5 && tracking.runStatus === "en_route") return "Arriving soon";
  if (tracking.runStatus === "at_stop") return "At stop";
  if (tracking.runStatus === "completed") return "Trip completed";
  if (tracking.phase === "at_school") return "At school";
  return "On route";
}

export function sortTransportAlerts(alerts: TransportAlert[]): TransportAlert[] {
  return [...alerts].reverse();
}

export function unreadTransportAlertCount(alerts: TransportAlert[]): number {
  return alerts.filter((a) => !a.read).length;
}
