import {
  DEFAULT_INSTITUTE_TIMEZONE,
  todayInTimeZone,
} from "@lumenx/utils";

/**
 * Transport "today" for Admin ops queries (trips, boarding, analytics, exceptions).
 * Must match backend `resolveInstituteServiceDate` (institute TZ, default Asia/Kolkata).
 * Do not use `toISOString().slice(0, 10)` — that is UTC and flips the wrong day near IST midnight.
 */
export function transportServiceDateToday(
  timeZone: string = DEFAULT_INSTITUTE_TIMEZONE,
  now: Date = new Date(),
): string {
  const zone = timeZone.trim() || DEFAULT_INSTITUTE_TIMEZONE;
  return todayInTimeZone(zone, now);
}
