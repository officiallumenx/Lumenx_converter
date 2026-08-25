import type { TransportAlert, TransportEventType, TransportTracking } from "@/lib/transport/types";

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

export function formatEtaMinutes(minutes: number): string {
  if (minutes <= 0) return "Arriving now";
  if (minutes === 1) return "1 min";
  return `${minutes} mins`;
}

export function trackingStatusLabel(tracking: TransportTracking): string {
  if (tracking.emergencyActive) return tracking.emergencyLabel || "Emergency on bus";
  if (tracking.runStatus === "delayed") return `Delayed · +${tracking.delayMinutes} min`;
  if (tracking.learnerStatus === "reached_school") return "Reached school";
  if (tracking.learnerStatus === "picked_up") return "Picked up";
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
