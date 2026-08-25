import type {
  AttendanceDay,
  AttendanceDayStatus,
  AttendancePeriodSummary,
} from "./types";
import { computeAttendancePct, resolveStudentStatusFromRegisters } from "@lumenx/module-attendance";
import { formatDisplayDate as formatDisplayDateShared } from "@lumenx/utils";
import { INSTITUTE_HOLIDAYS } from "./holidays-demo";

/** Institute holidays — demo dataset spanning recent months */
export { INSTITUTE_HOLIDAYS };

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function monthLabel(year: number, month: number) {
  return `${MONTH_NAMES[month]} ${year}`;
}

export function formatDisplayDate(iso: string) {
  return formatDisplayDateShared(iso);
}

export function isoFromParts(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function holidaysInMonth(year: number, month: number) {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
  return INSTITUTE_HOLIDAYS.filter((h) => h.date.startsWith(prefix)).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

export function holidaysInRange(startIso: string, endIso: string) {
  return INSTITUTE_HOLIDAYS.filter((h) => h.date >= startIso && h.date <= endIso).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

function holidayOnDate(iso: string) {
  return INSTITUTE_HOLIDAYS.find((h) => h.date === iso);
}

function isSunday(year: number, month: number, day: number) {
  return new Date(year, month, day).getDay() === 0;
}

function getAttendanceDayStatus(
  year: number,
  month: number,
  day: number,
): AttendanceDay {
  const iso = isoFromParts(year, month, day);
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const today = now.getDate();

  if (isCurrentMonth && day > today) {
    return { day, status: "future" as AttendanceDayStatus };
  }

  const listed = holidayOnDate(iso);
  if (listed) {
    return { day, status: "holiday", holidayTitle: listed.title };
  }

  if (isSunday(year, month, day)) {
    return { day, status: "holiday", holidayTitle: "Weekly off" };
  }

  // No calendar seed — unmarked working days stay unknown until registers exist.
  return { day, status: "unknown" };
}

/**
 * Build calendar skeleton for a month (holidays / future / unknown).
 * Does not invent present/absent/leave — use `overlayRegisterAttendanceDays`.
 */
export function buildAttendanceDays(year: number, month: number): AttendanceDay[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    return getAttendanceDayStatus(year, month, day);
  });
}

/** Selectable attendance history window — last N months through today. */
export function attendanceHistoryBounds(monthsBack = 12) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
  return {
    start: isoFromParts(start.getFullYear(), start.getMonth(), 1),
    end: isoFromParts(now.getFullYear(), now.getMonth(), now.getDate()),
  };
}

function summarizeAttendanceDays(
  scoped: AttendanceDay[],
  rangeLabel?: string,
  monthMeta?: { year: number; month: number },
): AttendancePeriodSummary {
  const workingDays = scoped.filter(
    (d) =>
      d.status !== "holiday" &&
      d.status !== "future" &&
      d.status !== "unknown",
  ).length;
  const present = scoped.filter((d) => d.status === "present").length;
  const absent = scoped.filter((d) => d.status === "absent").length;
  const leave = scoped.filter((d) => d.status === "leave").length;
  const holidays = scoped.filter((d) => d.status === "holiday").length;
  const expected = present + absent + leave;
  const attendancePct = computeAttendancePct(present, expected, leave);

  return {
    monthLabel: monthMeta ? monthLabel(monthMeta.year, monthMeta.month) : "",
    year: monthMeta?.year ?? 0,
    month: monthMeta?.month ?? 0,
    workingDays,
    present,
    absent,
    leave,
    holidays,
    attendancePct,
    rangeLabel,
  };
}

/** Summary for a custom ISO date range (may span multiple months). */
export function computeAttendanceSummaryForRange(
  startIso: string,
  endIso: string,
): AttendancePeriodSummary {
  const start = new Date(`${startIso}T12:00:00`);
  const end = new Date(`${endIso}T12:00:00`);
  const scoped: AttendanceDay[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    scoped.push(
      getAttendanceDayStatus(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()),
    );
    cursor.setDate(cursor.getDate() + 1);
  }

  return summarizeAttendanceDays(
    scoped,
    `${formatDisplayDate(startIso)} – ${formatDisplayDate(endIso)}`,
  );
}

export function computeAttendanceSummary(
  days: AttendanceDay[],
  year: number,
  month: number,
  range?: { startIso: string; endIso: string },
): AttendancePeriodSummary {
  if (range && !isoRangeIntersectsMonth(range, year, month)) {
    return summarizeAttendanceDays([], undefined, { year, month });
  }

  const scoped = range
    ? days.filter((d) => {
        const iso = isoFromParts(year, month, d.day);
        return iso >= range.startIso && iso <= range.endIso;
      })
    : days;

  let rangeLabel: string | undefined;
  if (range) {
    rangeLabel = `${formatDisplayDate(range.startIso)} – ${formatDisplayDate(range.endIso)}`;
  }

  return summarizeAttendanceDays(scoped, rangeLabel, { year, month });
}

export function calendarLeadingBlanks(year: number, month: number) {
  const firstDow = new Date(year, month, 1).getDay();
  return (firstDow + 6) % 7;
}

export function monthBounds(year: number, month: number) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return {
    start: isoFromParts(year, month, 1),
    end: isoFromParts(year, month, daysInMonth),
  };
}

export function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function listSelectableMonths(count = 12) {
  const now = new Date();
  const items: { year: number; month: number; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    items.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: monthLabel(d.getFullYear(), d.getMonth()),
    });
  }
  return items;
}

export function parseDayFromIso(iso: string, year: number, month: number) {
  const d = new Date(`${iso}T12:00:00`);
  if (d.getFullYear() !== year || d.getMonth() !== month) return null;
  return d.getDate();
}

export function parseIsoParts(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
}

export function normalizeIsoRange(
  startIso?: string,
  endIso?: string,
): { startIso: string; endIso: string } | undefined {
  if (!startIso && !endIso) return undefined;
  const start = startIso || endIso!;
  const end = endIso || startIso!;
  return start <= end ? { startIso: start, endIso: end } : { startIso: end, endIso: start };
}

export function isoRangeIntersectsMonth(
  range: { startIso: string; endIso: string },
  year: number,
  month: number,
) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthStart = isoFromParts(year, month, 1);
  const monthEnd = isoFromParts(year, month, daysInMonth);
  return range.startIso <= monthEnd && range.endIso >= monthStart;
}

export function seedFromString(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 97;
}

/**
 * Overlay Attendance Registers onto a month skeleton.
 * Sole learner history SoT — no calendar seed absences.
 */
export function overlayRegisterAttendanceDays(
  days: AttendanceDay[],
  input: {
    year: number;
    month: number;
    studentId: string;
    sectionKey: string;
  },
): AttendanceDay[] {
  return days.map((d) => {
    if (d.status === "holiday" || d.status === "future") return d;
    const iso = isoFromParts(input.year, input.month, d.day);
    const status = resolveStudentStatusFromRegisters({
      studentId: input.studentId,
      sectionKey: input.sectionKey,
      date: iso,
    });
    return { day: d.day, status };
  });
}

/** Month days for a learner from Registers only. */
export function buildLearnerAttendanceDays(input: {
  year: number;
  month: number;
  studentId: string;
  sectionKey: string;
}): AttendanceDay[] {
  return overlayRegisterAttendanceDays(buildAttendanceDays(input.year, input.month), input);
}

export type LearnerAttendanceTrendPoint = { week: string; pct: number };

export type LearnerAttendanceLogEntry = {
  date: string;
  status: "present" | "absent" | "leave";
  note: string;
};

function noteForDayStatus(status: "present" | "absent" | "leave"): string {
  if (status === "leave") return "Marked leave on register";
  if (status === "absent") return "Marked absent on register";
  return "Marked present on register";
}

/** Weekly attendance % points for a month — Registers only. */
export function buildLearnerAttendanceTrend(input: {
  year: number;
  month: number;
  studentId: string;
  sectionKey: string;
}): LearnerAttendanceTrendPoint[] {
  const days = buildLearnerAttendanceDays(input);
  const today = new Date();
  const isCurrent =
    input.year === today.getFullYear() && input.month === today.getMonth();
  const maxDay = isCurrent ? today.getDate() : days.length;

  const buckets = new Map<number, AttendanceDay[]>();
  for (const d of days) {
    if (d.day > maxDay) continue;
    if (d.status === "holiday" || d.status === "future" || d.status === "unknown") continue;
    const weekIndex = Math.floor((d.day - 1) / 7);
    const list = buckets.get(weekIndex) ?? [];
    list.push(d);
    buckets.set(weekIndex, list);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([weekIndex, scoped]) => {
      const summary = summarizeAttendanceDays(scoped);
      return {
        week: `Week ${weekIndex + 1}`,
        pct: summary.attendancePct,
      };
    });
}

/** Recent marked days from Registers (present / absent / leave). */
export function buildLearnerAttendanceLog(input: {
  year: number;
  month: number;
  studentId: string;
  sectionKey: string;
  limit?: number;
}): LearnerAttendanceLogEntry[] {
  const days = buildLearnerAttendanceDays(input);
  const limit = input.limit ?? 8;
  return days
    .filter(
      (d): d is AttendanceDay & { status: "present" | "absent" | "leave" } =>
        d.status === "present" || d.status === "absent" || d.status === "leave",
    )
    .sort((a, b) => b.day - a.day)
    .slice(0, limit)
    .map((d) => ({
      date: formatDisplayDate(isoFromParts(input.year, input.month, d.day)),
      status: d.status,
      note: noteForDayStatus(d.status),
    }));
}

/** Current month % minus previous month % — Registers only. */
export function computeLearnerMonthAttendanceDelta(input: {
  year: number;
  month: number;
  studentId: string;
  sectionKey: string;
}): number {
  const currentDays = buildLearnerAttendanceDays(input);
  const current = computeAttendanceSummary(currentDays, input.year, input.month);
  const prev = shiftMonth(input.year, input.month, -1);
  const prevDays = buildLearnerAttendanceDays({
    ...input,
    year: prev.year,
    month: prev.month,
  });
  const previous = computeAttendanceSummary(prevDays, prev.year, prev.month);
  return Math.round((current.attendancePct - previous.attendancePct) * 10) / 10;
}

/** Month summary for a learner from Registers (current calendar month by default). */
export function buildLearnerMonthAttendanceSummary(input: {
  studentId: string;
  sectionKey: string;
  year?: number;
  month?: number;
}): AttendancePeriodSummary {
  const now = new Date();
  const year = input.year ?? now.getFullYear();
  const month = input.month ?? now.getMonth();
  const days = buildLearnerAttendanceDays({
    year,
    month,
    studentId: input.studentId,
    sectionKey: input.sectionKey,
  });
  return computeAttendanceSummary(days, year, month);
}
