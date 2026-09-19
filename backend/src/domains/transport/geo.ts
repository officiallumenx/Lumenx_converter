/** Earth-surface distance helpers for transport approach alerts. */

const EARTH_RADIUS_M = 6_371_000;
/** Fallback urban bus speed when GPS speed is missing (~30 km/h ≈ 500 m/min). */
const DEFAULT_SPEED_M_PER_MIN = 500;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance in meters. */
export function haversineMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * ETA minutes from distance.
 * Uses optional GPS `speedKmh` when finite and ≥ 5 km/h; otherwise ~30 km/h urban default.
 */
export function etaMinutesFromDistance(
  distanceM: number,
  speedKmh?: number | null,
): number {
  if (!Number.isFinite(distanceM) || distanceM <= 0) return 0;
  const speedMPerMin =
    speedKmh != null && Number.isFinite(speedKmh) && speedKmh >= 5
      ? (speedKmh * 1000) / 60
      : DEFAULT_SPEED_M_PER_MIN;
  return Math.max(1, Math.ceil(distanceM / speedMPerMin));
}
