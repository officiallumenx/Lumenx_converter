import { AppError } from "../../errors/app-error.js";

/** Product bounds for stop geofence radius (meters). Matches Admin settings UI. */
export const STOP_RADIUS_MIN_M = 20;
export const STOP_RADIUS_MAX_M = 5000;
export const STOP_RADIUS_DEFAULT_M = 150;

/**
 * Validate a stop notification radius in meters.
 * Rejects null/NaN/non-integer/out-of-range. Returns the integer meters.
 */
export function parseStopNotificationRadiusM(
  value: unknown,
  opts?: { required?: boolean; field?: string },
): number | undefined {
  const field = opts?.field ?? "notification_radius_m";
  if (value === undefined) {
    if (opts?.required) {
      throw AppError.validation(`${field} is required`);
    }
    return undefined;
  }
  if (value === null) {
    throw AppError.validation(`${field} cannot be null`);
  }
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || Number.isNaN(num)) {
    throw AppError.validation(`${field} must be a finite number of meters`);
  }
  if (!Number.isInteger(num)) {
    throw AppError.validation(`${field} must be an integer (meters)`);
  }
  if (num < STOP_RADIUS_MIN_M || num > STOP_RADIUS_MAX_M) {
    throw AppError.validation(
      `${field} must be between ${STOP_RADIUS_MIN_M} and ${STOP_RADIUS_MAX_M} meters`,
    );
  }
  return num;
}

/** Shared client/server-safe check without throwing (for UI). */
export function isValidStopNotificationRadiusM(value: unknown): value is number {
  try {
    return parseStopNotificationRadiusM(value, { required: true }) !== undefined;
  } catch {
    return false;
  }
}
