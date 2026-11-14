/**
 * GPS freshness bands for live trip UI (Admin + Connect + Driver).
 * Do not present STALE/OFFLINE coordinates as LIVE.
 */

export const GPS_LIVE_MAX_MS = 45_000;
export const GPS_RECENT_MAX_MS = 120_000;
export const GPS_STALE_MAX_MS = 10 * 60_000;

export type GpsFreshness = "live" | "recent" | "stale" | "offline";

/**
 * Normalizes an ISO-like or DB timestamp string into UTC epoch milliseconds.
 * - Handles strings already ending in 'Z'.
 * - Handles strings with explicit numeric offsets (e.g. +05:30).
 * - Handles ISO strings without timezone (e.g. 2026-11-14T04:30:00 or 2026-11-14 04:30:00)
 *   by appending 'Z' per the Postgres/API contract so JS doesn't parse it as local time.
 * - Never converts timestamps twice.
 */
export function parseTransportTimestampMs(
  timestamp: string | number | Date | null | undefined,
): number {
  if (timestamp === null || timestamp === undefined || timestamp === "") return NaN;
  if (typeof timestamp === "number") return Number.isFinite(timestamp) ? timestamp : NaN;
  if (timestamp instanceof Date) return timestamp.getTime();

  const trimmed = String(timestamp).trim();
  if (!trimmed) return NaN;

  // Space-separated date and time: "2026-11-14 04:30:00" -> "2026-11-14T04:30:00"
  let normalized = trimmed;
  if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}/.test(normalized)) {
    normalized = normalized.replace(" ", "T");
  }

  // If no timezone offset (Z or [+-]HH:mm or [+-]HHmm) is present, append Z
  // so Date.parse parses it in UTC rather than the client device's local timezone.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(normalized)) {
    normalized += "Z";
  }

  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function classifyGpsFreshness(
  capturedAt: string | null | undefined,
  nowMs: number = Date.now(),
): GpsFreshness {
  if (!capturedAt) return "offline";
  const at = parseTransportTimestampMs(capturedAt);
  if (!Number.isFinite(at)) return "offline";
  const age = nowMs - at;
  if (age < 0) {
    // Clock skew — treat near-future as live if within 30s.
    return age > -30_000 ? "live" : "offline";
  }
  if (age <= GPS_LIVE_MAX_MS) return "live";
  if (age <= GPS_RECENT_MAX_MS) return "recent";
  if (age <= GPS_STALE_MAX_MS) return "stale";
  return "offline";
}

/** Human label for last GPS age. Never says "live" when stale. */
export function formatGpsAgeLabel(
  capturedAt: string | null | undefined,
  nowMs: number = Date.now(),
): string {
  const freshness = classifyGpsFreshness(capturedAt, nowMs);
  if (!capturedAt || freshness === "offline") {
    return "Location unavailable";
  }
  const at = parseTransportTimestampMs(capturedAt);
  const sec = Math.max(0, Math.round((nowMs - at) / 1000));
  if (freshness === "live") {
    if (sec < 15) return "Live";
    return `Updated ${sec}s ago`;
  }
  const min = Math.max(1, Math.round(sec / 60));
  return `Location last updated ${min} min ago`;
}

export function isGpsShownAsLive(freshness: GpsFreshness): boolean {
  return freshness === "live" || freshness === "recent";
}

/** Human relative times for transport UI — never implies live when stale. */
export function formatRelativeTransportTime(
  iso: string | null | undefined,
  nowMs: number = Date.now(),
): string {
  if (!iso) return "Unknown";
  const at = parseTransportTimestampMs(iso);
  if (!Number.isFinite(at)) return "Unknown";
  const delta = at - nowMs;
  const absSec = Math.round(Math.abs(delta) / 1000);
  if (absSec < 15) return delta >= 0 ? "Arriving now" : "Just now";
  if (delta > 0) {
    if (absSec < 60) return `In ${absSec} sec`;
    const min = Math.round(absSec / 60);
    return `In ${min} min`;
  }
  if (absSec < 60) return `${absSec} sec ago`;
  const min = Math.round(absSec / 60);
  return `${min} min ago`;
}
