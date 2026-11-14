/** Earth-surface distance helpers for transport approach alerts. */

const EARTH_RADIUS_M = 6_371_000;
/**
 * Fallback urban bus speed when GPS speed is missing (~28 km/h).
 * Keep aligned with ETA_ENGINE.defaultSpeedKmh (do not import — circular).
 */
const DEFAULT_SPEED_M_PER_MIN = (28 * 1000) / 60;

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

/**
 * Minimum distance in meters from a reference point (e.g. stop) to the
 * line segment connecting two consecutive GPS points a and b.
 * Uses local equirectangular tangent projection centered at the reference point,
 * which provides millimeter-level accuracy across urban radii (< 20 km).
 */
export function pointToSegmentDistanceM(
  point: { latitude: number; longitude: number },
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const lat0 = toRad(point.latitude);
  const lon0 = toRad(point.longitude);
  const cosLat0 = Math.cos(lat0);

  // Convert A and B to local Euclidean meters (East, North) relative to point (0, 0)
  const ax = (toRad(a.longitude) - lon0) * cosLat0 * EARTH_RADIUS_M;
  const ay = (toRad(a.latitude) - lat0) * EARTH_RADIUS_M;

  const bx = (toRad(b.longitude) - lon0) * cosLat0 * EARTH_RADIUS_M;
  const by = (toRad(b.latitude) - lat0) * EARTH_RADIUS_M;

  const vx = bx - ax;
  const vy = by - ay;
  const lenSq = vx * vx + vy * vy;

  if (lenSq < 1e-4) {
    // A and B are identical point locations
    return Math.sqrt(ax * ax + ay * ay);
  }

  // Projection parameter of point (0, 0) onto segment AB:
  // Vector from A to point is (-ax, -ay).
  const t = -(ax * vx + ay * vy) / lenSq;
  const tClamped = Math.max(0, Math.min(1, t));

  const cx = ax + tClamped * vx;
  const cy = ay + tClamped * vy;

  return Math.sqrt(cx * cx + cy * cy);
}

/**
 * Validates whether two consecutive GPS samples form a plausible trajectory segment.
 * Guards against interpolating straight lines across huge time gaps (tunnels, paused apps)
 * or teleports caused by sudden satellite lock.
 */
export function isTrajectoryValidForInterpolation(
  previous: {
    latitude: number;
    longitude: number;
    capturedAtMs?: number | null;
    accuracyM?: number | null;
  },
  current: {
    latitude: number;
    longitude: number;
    capturedAtMs?: number | null;
    accuracyM?: number | null;
  },
  options?: {
    maxGapMs?: number;
    maxSpeedKmh?: number;
    maxAccuracyM?: number;
  },
): boolean {
  if (
    !Number.isFinite(previous.latitude) ||
    !Number.isFinite(previous.longitude) ||
    !Number.isFinite(current.latitude) ||
    !Number.isFinite(current.longitude)
  ) {
    return false;
  }

  const maxGapMs = options?.maxGapMs ?? 90_000; // 90 seconds
  const maxSpeedKmh = options?.maxSpeedKmh ?? 120; // 120 km/h
  const maxAccuracyM = options?.maxAccuracyM ?? 80; // 80 meters

  // Reject interpolation if either point has poor accuracy
  if (
    previous.accuracyM != null &&
    Number.isFinite(previous.accuracyM) &&
    previous.accuracyM > maxAccuracyM
  ) {
    return false;
  }
  if (
    current.accuracyM != null &&
    Number.isFinite(current.accuracyM) &&
    current.accuracyM > maxAccuracyM
  ) {
    return false;
  }

  const prevMs = previous.capturedAtMs;
  const currMs = current.capturedAtMs;
  if (
    prevMs != null &&
    currMs != null &&
    Number.isFinite(prevMs) &&
    Number.isFinite(currMs)
  ) {
    const deltaMs = currMs - prevMs;
    // Clock skew or exceeds time gap threshold
    if (deltaMs <= 0 || deltaMs > maxGapMs) {
      return false;
    }
    const distM = haversineMeters(previous, current);
    const speedKmh = (distM / (deltaMs / 1000)) * 3.6;
    if (speedKmh > maxSpeedKmh) {
      return false;
    }
  } else {
    // Spatial boundary when timestamps are unavailable
    const distM = haversineMeters(previous, current);
    if (distM > 600) return false;
  }

  return true;
}

/**
 * Evaluates whether a bus has entered a stop's geofence radius.
 * Product rule: bus is within geofence when distance <= stopRadiusM.
 * Rejects non-finite/negative distance, invalid stop radius, or absurd GPS accuracy (> 500m).
 */
export function isArrivalGeofenceEntered(input: {
  stopRadiusM: number;
  distanceM: number;
  accuracyM?: number | null;
}): boolean {
  if (!Number.isFinite(input.distanceM) || input.distanceM < 0) return false;
  if (!Number.isFinite(input.stopRadiusM) || input.stopRadiusM <= 0) return false;

  // Unusable / absurd GPS accuracy safeguard (> 500m max threshold)
  if (
    input.accuracyM != null &&
    (!Number.isFinite(input.accuracyM) ||
      input.accuracyM < 0 ||
      input.accuracyM > 500)
  ) {
    return false;
  }

  return input.distanceM <= input.stopRadiusM;
}
