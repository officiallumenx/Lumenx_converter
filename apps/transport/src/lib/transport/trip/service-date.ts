import {
  DEFAULT_INSTITUTE_TIMEZONE,
  todayInTimeZone,
} from "@lumenx/utils";
import { getRouteSetupDriverScope } from "../route-setup/store";

/**
 * Institute-local transport service date (YYYY-MM-DD).
 * Authoritative TZ: institute_settings.timezone via drivers/me → route scope.
 * Fallback: Asia/Kolkata (same as backend identity default).
 */
export function resolveTransportServiceDate(
  now: Date = new Date(),
  timeZone?: string | null,
): string {
  const fromScope = getRouteSetupDriverScope()?.timezone?.trim();
  const zone =
    timeZone?.trim() || fromScope || DEFAULT_INSTITUTE_TIMEZONE;
  return todayInTimeZone(zone, now);
}
