/** Non-exam days: Sundays, second Saturdays, and fixed / movable holidays. */

export type ExamDayKind = "working" | "blocked" | "paper";

export type ExamDayInfo = {
  iso: string;
  kind: ExamDayKind;
  reasons: string[];
  subject?: string;
  paperNumber?: number;
};

/** Easter Sunday (Gregorian) — used for Good Friday. */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day, 12, 0, 0);
}

function isoFromDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  return isoFromDate(d);
}

/** Good Friday = Easter Sunday − 2 days. */
export function goodFridayIso(year: number): string {
  const easter = easterSunday(year);
  easter.setDate(easter.getDate() - 2);
  return isoFromDate(easter);
}

const FIXED_HOLIDAYS: Record<string, string> = {
  "01-26": "Republic Day",
  "08-15": "Independence Day",
  "10-02": "Gandhi Jayanti",
};

export function isSecondSaturday(iso: string): boolean {
  const d = new Date(iso + "T12:00:00");
  return d.getDay() === 6 && d.getDate() >= 8 && d.getDate() <= 14;
}

export function isSunday(iso: string): boolean {
  return new Date(iso + "T12:00:00").getDay() === 0;
}

export function getHolidayLabel(iso: string): string | null {
  const d = new Date(iso + "T12:00:00");
  const mmdd = iso.slice(5);
  if (FIXED_HOLIDAYS[mmdd]) return FIXED_HOLIDAYS[mmdd]!;
  if (iso === goodFridayIso(d.getFullYear())) return "Good Friday";
  return null;
}

export function getBlockedReasons(iso: string): string[] {
  const reasons: string[] = [];
  if (isSunday(iso)) reasons.push("Sunday");
  if (isSecondSaturday(iso)) reasons.push("Second Saturday");
  const holiday = getHolidayLabel(iso);
  if (holiday) reasons.push(holiday);
  return reasons;
}

export function isBlockedExamDay(iso: string): boolean {
  return getBlockedReasons(iso).length > 0;
}

export function datesInRange(start: string, end: string): string[] {
  if (!start || !end || start > end) return [];
  const out: string[] = [];
  let cur = start;
  while (cur <= end) {
    out.push(cur);
    cur = addDaysIso(cur, 1);
  }
  return out;
}

/** Assign one subject per working day, skipping blocked days. */
export function assignSubjectsToDates(
  startDate: string,
  endDate: string,
  subjects: string[],
): { date: string; subject: string; paperNumber: number }[] {
  const assignments: { date: string; subject: string; paperNumber: number }[] = [];
  if (!startDate || subjects.length === 0) return assignments;

  let cur = startDate;
  let paper = 0;
  const limit = endDate || startDate;
  const maxDays = 120;
  let guard = 0;

  while (paper < subjects.length && cur <= limit && guard < maxDays) {
    if (!isBlockedExamDay(cur)) {
      paper += 1;
      assignments.push({ date: cur, subject: subjects[paper - 1]!, paperNumber: paper });
    }
    cur = addDaysIso(cur, 1);
    guard += 1;
  }

  return assignments;
}

export function buildExamCalendarDays(
  startDate: string,
  endDate: string,
  subjects: string[],
): ExamDayInfo[] {
  const assignments = assignSubjectsToDates(startDate, endDate, subjects);
  const byDate = new Map(assignments.map((a) => [a.date, a]));

  return datesInRange(startDate, endDate).map((iso) => {
    const paper = byDate.get(iso);
    if (paper) {
      return {
        iso,
        kind: "paper" as const,
        reasons: [],
        subject: paper.subject,
        paperNumber: paper.paperNumber,
      };
    }
    const blocked = getBlockedReasons(iso);
    if (blocked.length > 0) {
      return { iso, kind: "blocked" as const, reasons: blocked };
    }
    return { iso, kind: "working" as const, reasons: [] };
  });
}

export function calendarMonthsInRange(startDate: string, endDate: string): { year: number; month: number }[] {
  if (!startDate || !endDate) return [];
  const months: { year: number; month: number }[] = [];
  const start = new Date(startDate + "T12:00:00");
  const end = new Date(endDate + "T12:00:00");
  const cur = new Date(start.getFullYear(), start.getMonth(), 1, 12);
  while (cur <= end) {
    months.push({ year: cur.getFullYear(), month: cur.getMonth() });
    cur.setMonth(cur.getMonth() + 1);
  }
  return months;
}

export function monthGridCells(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1, 12);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const startPad = (first.getDay() + 6) % 7; // Mon=0
  const cells: (string | null)[] = Array(startPad).fill(null);
  for (let d = 1; d <= lastDay; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push(iso);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function weekdayShort(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-IN", { weekday: "short" });
}

export function dayNum(iso: string): number {
  return new Date(iso + "T12:00:00").getDate();
}
