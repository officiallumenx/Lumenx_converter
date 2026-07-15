import type { CalendarActivityMark, CalendarMonthCell } from "./types";

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export function formatDisplayDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function buildMonthGrid(reference = new Date()): {
  year: number;
  month: number;
  monthLabel: string;
  todayIso: string;
  cells: (CalendarMonthCell | null)[];
} {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const todayIso = isoDate(reference);
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay.getDay();

  const cells: (CalendarMonthCell | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, iso: isoDate(new Date(year, month, day)) });
  }

  const monthLabel = reference.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return { year, month, monthLabel, todayIso, cells };
}

export function calendarMarkMap(marks: CalendarActivityMark[]): Map<string, CalendarActivityMark> {
  return new Map(marks.map((m) => [m.date, m]));
}
