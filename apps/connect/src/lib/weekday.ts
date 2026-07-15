/** Weekday names indexed to match `Date.getDay()` (0 = Sunday … 6 = Saturday). */
export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export type WeekdayName = (typeof WEEKDAY_NAMES)[number];

/**
 * The actual current weekday name (e.g. "Sunday"). Returns the real day even when it is not
 * a school/teaching day, so callers can detect "no school today" instead of silently
 * defaulting to another day.
 */
export function getTodayDayName(): WeekdayName {
  return WEEKDAY_NAMES[new Date().getDay()];
}
