import { getTodayDayName } from "@/lib/weekday";

export { getTodayDayName };

export type StudentPeriod = { time: string; subject: string; teacher: string };

/** Parse "08:30 – 09:15" → minutes since midnight */
export function parsePeriodMinutes(time: string, part: "start" | "end"): number {
  const chunk = part === "start" ? time.split("–")[0]?.trim() : time.split("–")[1]?.trim();
  if (!chunk) return 0;
  const m = chunk.match(/(\d+):(\d+)/);
  if (!m) return 0;
  let hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  // School clock uses 12-hour times without AM/PM markers. Post-lunch periods (1:00–7:59)
  // are afternoon, so map them to 24h; morning/noon (8–12) stay as-is. Without this,
  // "01:25" (1:25 PM) parses to 85 min and appears before the 8:30 morning periods.
  if (hour >= 1 && hour <= 7) hour += 12;
  return hour * 60 + minute;
}

export function splitPeriodTime(time: string): { start: string; end: string } {
  const parts = time.split("–").map((s) => s.trim());
  return { start: parts[0] ?? time, end: parts[1] ?? "" };
}

/** The current day if it is in the schedule, otherwise the first school day (for a default tab). */
export function getDefaultTimetableDay(weekdays: readonly string[]): string {
  const today = getTodayDayName();
  return weekdays.includes(today) ? today : (weekdays[0] ?? "Monday");
}

export function getCurrentAndNextPeriod(
  periods: StudentPeriod[],
  now = new Date(),
): { current: StudentPeriod | null; next: StudentPeriod | null } {
  if (!periods.length) return { current: null, next: null };

  const nowMins = now.getHours() * 60 + now.getMinutes();
  const sorted = [...periods].sort(
    (a, b) => parsePeriodMinutes(a.time, "start") - parsePeriodMinutes(b.time, "start"),
  );

  let currentIdx = -1;
  for (let i = 0; i < sorted.length; i++) {
    const start = parsePeriodMinutes(sorted[i].time, "start");
    const end = parsePeriodMinutes(sorted[i].time, "end") || start + 45;
    if (nowMins >= start && nowMins < end) currentIdx = i;
  }

  if (currentIdx >= 0) {
    return {
      current: sorted[currentIdx],
      next: sorted[currentIdx + 1] ?? null,
    };
  }

  const nextIdx = sorted.findIndex((p) => parsePeriodMinutes(p.time, "start") > nowMins);
  return {
    current: null,
    next: nextIdx >= 0 ? sorted[nextIdx] : null,
  };
}

export function isPeriodPast(period: StudentPeriod, now = new Date()): boolean {
  const end =
    parsePeriodMinutes(period.time, "end") || parsePeriodMinutes(period.time, "start") + 45;
  return now.getHours() * 60 + now.getMinutes() >= end;
}

/** Consistent LumenX blue styling for all timetable subjects. */
const LUMENX_SUBJECT_STYLE = {
  stripe: "bg-primary",
  chip: "bg-primary/10 text-primary border border-primary/20",
} as const;

export function subjectStyle(_subject: string) {
  return LUMENX_SUBJECT_STYLE;
}
