/** Earth-surface distance helpers for transport approach alerts. */

const EARTH_RADIUS_M = 6_371_000;

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

/** Rough ETA assuming ~30 km/h urban bus speed (~500 m/min). */
export function etaMinutesFromDistance(distanceM: number): number {
  if (!Number.isFinite(distanceM) || distanceM <= 0) return 0;
  return Math.max(1, Math.ceil(distanceM / 500));
}
