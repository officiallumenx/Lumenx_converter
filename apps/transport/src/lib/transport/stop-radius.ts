/** Product bounds for stop geofence radius (meters). Keep in sync with backend stop-radius. */
export const STOP_RADIUS_MIN_M = 20;
export const STOP_RADIUS_MAX_M = 5000;
export const STOP_RADIUS_DEFAULT_M = 150;

/** Parse/validate stop radius for UI forms. Returns meters or a validation error message. */
export function parseStopRadiusInput(
  value: unknown,
): { ok: true; meters: number } | { ok: false; error: string } {
  if (value === null || value === undefined || value === "") {
    return { ok: false, error: `Radius is required (${STOP_RADIUS_MIN_M}–${STOP_RADIUS_MAX_M} m)` };
  }
  const num = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(num) || Number.isNaN(num)) {
    return { ok: false, error: "Radius must be a number of meters" };
  }
  if (!Number.isInteger(num)) {
    return { ok: false, error: "Radius must be a whole number of meters" };
  }
  if (num < STOP_RADIUS_MIN_M || num > STOP_RADIUS_MAX_M) {
    return {
      ok: false,
      error: `Radius must be between ${STOP_RADIUS_MIN_M} and ${STOP_RADIUS_MAX_M} meters`,
    };
  }
  return { ok: true, meters: num };
}
