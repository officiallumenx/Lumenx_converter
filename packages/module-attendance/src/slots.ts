import type { AttendanceMethod, AttendanceSlot, PeriodInput } from "./types";

/**
 * Build capture slots from Attendance Method (configuration).
 * Single path for Daily · Morning First · Morning + Afternoon · Period Wise.
 * Callers must not invent alternate slot lists.
 *
 * Period Wise: requires timetable `periods`. Never invents a placeholder "Period 1".
 * Morning First: one slot; binds first timetable period subject when periods are supplied
 * (so Current Period Teacher can match the first-period teacher).
 */
export function buildAttendanceSlots(
  method: AttendanceMethod,
  periods: PeriodInput[] = [],
): AttendanceSlot[] {
  switch (method) {
    case "daily":
      return [{ id: "slot:day", kind: "day", label: "Full day" }];
    case "morning_first_period": {
      const first = periods[0];
      if (first?.subject?.trim()) {
        return [
          {
            id: "slot:morning-first",
            kind: "morning",
            label: `Morning · First Period · ${first.subject.trim()}`,
            periodIndex: first.index,
            subject: first.subject.trim(),
            time: first.time,
          },
        ];
      }
      return [
        {
          id: "slot:morning-first",
          kind: "morning",
          label: "Morning · First Period",
        },
      ];
    }
    case "morning_afternoon":
      return [
        { id: "slot:morning", kind: "morning", label: "Morning" },
        { id: "slot:afternoon", kind: "afternoon", label: "Afternoon" },
      ];
    case "period_wise": {
      if (periods.length === 0) {
        // No placeholder — Admin/Teacher must supply timetable periods.
        return [];
      }
      return periods.map((p) => ({
        id: `slot:period:${p.index}`,
        kind: "period" as const,
        label: `P${p.index + 1} · ${p.subject}`,
        periodIndex: p.index,
        subject: p.subject,
        time: p.time,
      }));
    }
    default:
      return [{ id: "slot:day", kind: "day", label: "Full day" }];
  }
}

/**
 * Map timetable day rows → PeriodInput for the one Attendance Engine.
 * Teacher Connect and Admin Coordinator both use this — do not fork converters.
 * Indexes are dense 0..n-1 in encounter order (filled teaching periods only).
 */
export function periodsFromTimetableSlots(
  slots: readonly { subject: string; time: string; index?: number }[],
): PeriodInput[] {
  return slots.map((s, i) => ({
    index: s.index ?? i,
    subject: s.subject.trim(),
    time: s.time.trim(),
  }));
}
