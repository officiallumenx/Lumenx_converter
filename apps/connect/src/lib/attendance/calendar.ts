import type { AttendanceDay, AttendanceDayStatus, AttendancePeriodSummary, InstituteHoliday } from "./types";

/** Institute holidays — demo dataset spanning recent months */
export const INSTITUTE_HOLIDAYS: InstituteHoliday[] = [
  {
    id: "h-2026-05-01",
    date: "2026-05-01",
    title: "Labour Day",
    purpose: "National holiday — institute closed",
  },
  {
    id: "h-2026-05-12",
    date: "2026-05-12",
    title: "Buddha Purnima",
    purpose: "Gazetted holiday — no classes",
  },
  {
    id: "h-2026-06-07",
    date: "2026-06-07",
    title: "Weekly off",
    purpose: "Sunday — institute weekly holiday",
  },
  {
    id: "h-2026-06-14",
    date: "2026-06-14",
    title: "Weekly off",
    purpose: "Sunday — institute weekly holiday",
  },
  {
    id: "h-2026-06-21",
    date: "2026-06-21",
    title: "Weekly off",
    purpose: "Sunday — institute weekly holiday",
  },
  {
    id: "h-2026-06-28",
    date: "2026-06-28",
    title: "Weekly off",
    purpose: "Sunday — institute weekly holiday",
  },
  {
    id: "h-2026-06-15",
    date: "2026-06-15",
    title: "Staff development day",
    purpose: "Teacher training — students stay home",
  },
  {
    id: "h-2026-04-14",
    date: "2026-04-14",
    title: "Ambedkar Jayanti",
    purpose: "Gazetted holiday — institute closed",
  },
  {
    id: "h-2026-04-18",
    date: "2026-04-18",
    title: "Good Friday",
    purpose: "Religious holiday — no classes",
  },
  {
    id: "h-2026-03-25",
    date: "2026-03-25",
    title: "Holi",
    purpose: "Festival holiday — institute closed",
  },
];

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
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

/** Build attendance days for a month. Optional seed varies absent/leave pattern per child. */
export function buildAttendanceDays(year: number, month: number, seed = 0): AttendanceDay[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const today = now.getDate();

  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const iso = isoFromParts(year, month, day);

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

    const absent = (day + seed) % 13 === 0;
    const leave = !absent && (day + seed * 2) % 19 === 0;
    if (absent) return { day, status: "absent" };
    if (leave) return { day, status: "leave" };
    return { day, status: "present" };
  });
}

export function computeAttendanceSummary(
  days: AttendanceDay[],
  year: number,
  month: number,
  range?: { startIso: string; endIso: string },
): AttendancePeriodSummary {
  const scoped = range
    ? days.filter((d) => {
        const iso = isoFromParts(year, month, d.day);
        return iso >= range.startIso && iso <= range.endIso;
      })
    : days;

  const workingDays = scoped.filter((d) => d.status !== "holiday" && d.status !== "future").length;
  const present = scoped.filter((d) => d.status === "present").length;
  const absent = scoped.filter((d) => d.status === "absent").length;
  const leave = scoped.filter((d) => d.status === "leave").length;
  const holidays = scoped.filter((d) => d.status === "holiday").length;
  const attendancePct =
    workingDays > 0 ? Math.round((present / workingDays) * 100) : 0;

  let rangeLabel: string | undefined;
  if (range) {
    rangeLabel = `${formatDisplayDate(range.startIso)} – ${formatDisplayDate(range.endIso)}`;
  }

  return {
    monthLabel: monthLabel(year, month),
    year,
    month,
    workingDays,
    present,
    absent,
    leave,
    holidays,
    attendancePct,
    rangeLabel,
  };
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
    items.push({ year: d.getFullYear(), month: d.getMonth(), label: monthLabel(d.getFullYear(), d.getMonth()) });
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
