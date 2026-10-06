/** Shared helpers for Admin Calendar year / month grids. */

export const CALENDAR_MONTH_LABELS = [
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
] as const;

export const CALENDAR_MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export type CalendarViewItem = {
  id: string;
  title: string;
  date: string;
  time?: string;
  endTime?: string;
  kind: string;
  description?: string;
  /** Recurring holidays from the admin checklist are not editable entries. */
  source?: "entry" | "rule";
};

export function todayIso(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function monthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export function eventsInMonth(
  items: CalendarViewItem[],
  year: number,
  monthIndex: number,
): CalendarViewItem[] {
  const prefix = monthKey(year, monthIndex);
  return items
    .filter((item) => item.date.startsWith(prefix))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""));
}

/**
 * Next event for a month tile:
 * - current/future months → soonest on/after today in that month, else first in month
 * - past months → first event in that month
 */
export function nextEventForMonth(
  items: CalendarViewItem[],
  year: number,
  monthIndex: number,
  today = todayIso(),
): CalendarViewItem | null {
  const inMonth = eventsInMonth(items, year, monthIndex);
  if (inMonth.length === 0) return null;
  const named = inMonth.filter((item) => item.source !== "rule");
  const pool = named.length > 0 ? named : inMonth;
  const key = monthKey(year, monthIndex);
  const todayMonth = today.slice(0, 7);
  if (key >= todayMonth) {
    // Only surface entries still ahead (or today) for current/future months.
    return pool.find((item) => item.date >= today) ?? null;
  }
  return pool[0] ?? null;
}

export function formatDayLabel(iso: string): string {
  const day = Number(iso.slice(8, 10));
  return Number.isFinite(day) ? String(day) : iso;
}

export function formatCalTime(time24?: string): string {
  if (!time24) return "";
  const m = /^(\d{1,2}):(\d{2})/.exec(time24);
  if (!m) return time24;
  let h = Number(m[1]);
  const min = m[2];
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${min} ${period}`;
}

export function formatTimeRange(start?: string, end?: string): string {
  const a = formatCalTime(start);
  const b = formatCalTime(end);
  if (a && b) return `${a} – ${b}`;
  if (a) return a;
  return "";
}

/** UI category → API/store kind. */
export type CalendarUiCategory = "holiday" | "event";

export function kindToUiCategory(kind: string): CalendarUiCategory {
  return kind === "holiday" ? "holiday" : "event";
}

export function uiCategoryToKind(category: CalendarUiCategory): "holiday" | "function" {
  return category === "holiday" ? "holiday" : "function";
}
