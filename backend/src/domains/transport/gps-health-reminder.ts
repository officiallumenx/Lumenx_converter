import { TRANSPORT_EVENT } from "./transport-events.js";

export type GpsHealthTimelineEvent = { kind?: string | null };

export type GpsHealthAction =
  | { action: "none" }
  | { action: "recover"; episode: number }
  | { action: "stale"; episode: number }
  | { action: "offline"; episode: number };

/**
 * Pure GPS reminder state machine used by transport-reminders.
 * ageMin is minutes since last vehicle_location.captured_at.
 */
export function nextGpsHealthAction(
  ageMin: number,
  timeline: GpsHealthTimelineEvent[],
): GpsHealthAction {
  const last = [...timeline]
    .reverse()
    .find(
      (e) =>
        e.kind === TRANSPORT_EVENT.GPS_STALE ||
        e.kind === TRANSPORT_EVENT.GPS_OFFLINE ||
        e.kind === TRANSPORT_EVENT.GPS_RECOVERED,
    );
  const episode = timeline.filter(
    (e) => e.kind === TRANSPORT_EVENT.GPS_RECOVERED,
  ).length;

  if (ageMin < 5) {
    if (
      last &&
      (last.kind === TRANSPORT_EVENT.GPS_STALE ||
        last.kind === TRANSPORT_EVENT.GPS_OFFLINE)
    ) {
      return { action: "recover", episode };
    }
    return { action: "none" };
  }

  if (ageMin >= 20) {
    if (last?.kind === TRANSPORT_EVENT.GPS_OFFLINE) return { action: "none" };
    return { action: "offline", episode };
  }

  if (
    last?.kind === TRANSPORT_EVENT.GPS_STALE ||
    last?.kind === TRANSPORT_EVENT.GPS_OFFLINE
  ) {
    return { action: "none" };
  }
  return { action: "stale", episode };
}
