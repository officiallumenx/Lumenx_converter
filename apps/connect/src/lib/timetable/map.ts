import { portalTimetableToWeeklySchedule } from "@/lib/events/map";
import type { PortalTimetableDto, WeeklyTimetable } from "./types";

export function timetableDtoToWeeklySchedule(dto: PortalTimetableDto): WeeklyTimetable {
  return portalTimetableToWeeklySchedule({
    periods: dto.periods,
    weekdays: dto.weekdays,
  });
}

export { portalTimetableToWeeklySchedule };
