import { classifyGpsFreshness } from "@lumenx/utils";
import type { TransportEmergencyDto, TransportTripDto } from "./types";

export type TransportMonitorFilter =
  | "all"
  | "active"
  | "delayed"
  | "completed"
  | "gps_stale"
  | "emergency";

export function isTripActive(trip: TransportTripDto): boolean {
  return !trip.finalized && trip.phase !== "completed";
}

export function isTripCompleted(trip: TransportTripDto): boolean {
  return trip.finalized || trip.phase === "completed";
}

export function isTripDelayed(trip: TransportTripDto): boolean {
  if (trip.isDelayed) return true;
  return (trip.timeline ?? []).some((e) => e.kind === "TRIP_DELAYED");
}

export function isTripGpsStale(trip: TransportTripDto): boolean {
  if (!isTripActive(trip)) return false;
  const freshness =
    trip.gpsFreshness ??
    classifyGpsFreshness(trip.latestLocation?.capturedAt ?? null);
  return freshness === "stale" || freshness === "offline";
}

export function tripHasOpenEmergency(
  trip: TransportTripDto,
  emergencies: TransportEmergencyDto[],
): boolean {
  return emergencies.some(
    (e) =>
      (e.status === "active" || e.status === "acknowledged") &&
      (e.tripId === trip.id || e.vehicleId === trip.vehicleId),
  );
}

export function filterMonitorTrips(
  trips: TransportTripDto[],
  filter: TransportMonitorFilter,
  emergencies: TransportEmergencyDto[] = [],
): TransportTripDto[] {
  switch (filter) {
    case "active":
      return trips.filter(isTripActive);
    case "delayed":
      return trips.filter((t) => isTripActive(t) && isTripDelayed(t));
    case "completed":
      return trips.filter(isTripCompleted);
    case "gps_stale":
      return trips.filter(isTripGpsStale);
    case "emergency":
      return trips.filter((t) => tripHasOpenEmergency(t, emergencies));
    case "all":
    default:
      return trips;
  }
}

export function searchMonitorTrips(
  trips: TransportTripDto[],
  query: string,
): TransportTripDto[] {
  const q = query.trim().toLowerCase();
  if (!q) return trips;
  return trips.filter((t) => {
    const hay = [
      t.vehicleNumber,
      t.driverName,
      t.routeName,
      t.phase,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

/** Chronological timeline — oldest first. Never invent events. */
export function sortTimelineChronological<T extends { at: string }>(
  events: T[] | null | undefined,
): T[] {
  if (!events?.length) return [];
  return [...events].sort((a, b) => {
    const ta = Date.parse(a.at);
    const tb = Date.parse(b.at);
    if (!Number.isFinite(ta) && !Number.isFinite(tb)) return 0;
    if (!Number.isFinite(ta)) return 1;
    if (!Number.isFinite(tb)) return -1;
    return ta - tb;
  });
}

export function formatTimelineClock(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "—";
  }
}
