import type { AttendanceDay, AttendanceDayStatus } from "./types";
import type { PortalLearnerAttendanceDto, PortalAttendanceDayStatus } from "./types";
import { isoFromParts } from "./calendar";

function portalStatusToDayStatus(
  status: PortalAttendanceDayStatus,
): AttendanceDayStatus {
  if (status === "present" || status === "absent" || status === "leave") {
    return status;
  }
  return "unknown";
}

export function portalDaysToStatusMap(
  dto: PortalLearnerAttendanceDto,
): Map<string, AttendanceDayStatus> {
  const map = new Map<string, AttendanceDayStatus>();
  for (const day of dto.days) {
    map.set(day.date, portalStatusToDayStatus(day.status));
  }
  return map;
}

export function overlayPortalAttendanceDays(
  days: AttendanceDay[],
  input: { year: number; month: number; statusByDate: Map<string, AttendanceDayStatus> },
): AttendanceDay[] {
  return days.map((day) => {
    if (day.status === "holiday" || day.status === "future") return day;
    const iso = isoFromParts(input.year, input.month, day.day);
    const status = input.statusByDate.get(iso);
    if (!status || status === "unknown") {
      return { day: day.day, status: "unknown" };
    }
    return { day: day.day, status };
  });
}

export function monthIsoRange(year: number, month: number): { from: string; to: string } {
  const from = isoFromParts(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = isoFromParts(year, month, lastDay);
  return { from, to };
}
