/**
 * GPS freshness bands for live trip UI (Admin + Connect + Driver).
 * Do not present STALE/OFFLINE coordinates as LIVE.
 */

export const GPS_LIVE_MAX_MS = 45_000;
export const GPS_RECENT_MAX_MS = 120_000;
export const GPS_STALE_MAX_MS = 10 * 60_000;

export type GpsFreshness = "live" | "recent" | "stale" | "offline";

export function classifyGpsFreshness(
  capturedAt: string | null | undefined,
  nowMs: number = Date.now(),
): GpsFreshness {
  if (!capturedAt) return "offline";
  const at = Date.parse(capturedAt);
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
  const at = Date.parse(capturedAt);
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
  const at = Date.parse(iso);
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
