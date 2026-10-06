/** Backend copy of GPS freshness bands (keep in sync with packages/utils gps-freshness). */

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
  if (age < 0) return age > -30_000 ? "live" : "offline";
  if (age <= GPS_LIVE_MAX_MS) return "live";
  if (age <= GPS_RECENT_MAX_MS) return "recent";
  if (age <= GPS_STALE_MAX_MS) return "stale";
  return "offline";
}
