import type {
  AttendanceDay,
  AttendanceDayStatus,
  AttendanceMethod,
  AttendanceDaySlot,
  PortalLearnerAttendanceDto,
  PortalAttendanceDayStatus,
} from "./types";
import { isoFromParts } from "./calendar";

export type PortalDayDetail = {
  status: AttendanceDayStatus;
  method: AttendanceMethod | null;
  presentCount: number;
  absentCount: number;
  leaveCount: number;
  slots: AttendanceDaySlot[];
};

function portalStatusToDayStatus(
  status: PortalAttendanceDayStatus,
): AttendanceDayStatus {
  if (
    status === "present" ||
    status === "absent" ||
    status === "leave" ||
    status === "partial"
  ) {
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

/** Full portal day payload keyed by ISO date — for ratio fills + day detail. */
export function portalDaysToDetailMap(
  dto: PortalLearnerAttendanceDto,
): Map<string, PortalDayDetail> {
  const map = new Map<string, PortalDayDetail>();
  for (const day of dto.days) {
    map.set(day.date, {
      status: portalStatusToDayStatus(day.status),
      method: day.method ?? null,
      presentCount: day.presentCount ?? 0,
      absentCount: day.absentCount ?? 0,
      leaveCount: day.leaveCount ?? 0,
      slots: (day.slots ?? []).map((s) => ({
        slotCode: s.slotCode,
        slotKind: s.slotKind,
        slotLabel: s.slotLabel,
        status: s.status,
      })),
    });
  }
  return map;
}

export function overlayPortalAttendanceDays(
  days: AttendanceDay[],
  input: {
    year: number;
    month: number;
    statusByDate: Map<string, AttendanceDayStatus>;
    detailByDate?: Map<string, PortalDayDetail>;
  },
): AttendanceDay[] {
  return days.map((day) => {
    if (day.status === "holiday" || day.status === "future") return day;
    const iso = isoFromParts(input.year, input.month, day.day);
    const status = input.statusByDate.get(iso);
    if (!status || status === "unknown") {
      return { day: day.day, status: "unknown" as const };
    }
    const detail = input.detailByDate?.get(iso);
    if (!detail) {
      return { day: day.day, status };
    }
    return {
      day: day.day,
      status: detail.status,
      method: detail.method,
      presentCount: detail.presentCount,
      absentCount: detail.absentCount,
      leaveCount: detail.leaveCount,
      slots: detail.slots,
    };
  });
}

/** Present share of present+absent (leave excluded) for partial cell fills. */
export function presentAbsentRatio(day: {
  presentCount?: number;
  absentCount?: number;
}): number {
  const present = day.presentCount ?? 0;
  const absent = day.absentCount ?? 0;
  const total = present + absent;
  if (total <= 0) return 0.5;
  return present / total;
}

export function monthIsoRange(year: number, month: number): { from: string; to: string } {
  const from = isoFromParts(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = isoFromParts(year, month, lastDay);
  return { from, to };
}
