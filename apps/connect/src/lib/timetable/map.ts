import { portalTimetableToWeeklySchedule } from "@/lib/events/map";
import type { PortalTimetableDto, WeeklyTimetable } from "./types";

export function timetableDtoToWeeklySchedule(dto: PortalTimetableDto): WeeklyTimetable {
  return portalTimetableToWeeklySchedule({
    periods: dto.periods,
    weekdays: dto.weekdays,
  });
}

export function pickTodayPeriods(
  schedule: WeeklyTimetable,
  dayName: string,
): Array<{ time: string; subject: string; teacher: string }> {
  return schedule[dayName] ?? [];
}

export { portalTimetableToWeeklySchedule };
