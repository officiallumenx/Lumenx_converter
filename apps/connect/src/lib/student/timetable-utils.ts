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

/** Per-subject palette for timetable cards (theme-aware surfaces). */
export type SubjectColorStyle = {
  primary: string;
  /** Light card wash */
  surface: string;
  /** Icon / index chip background */
  chipBg: string;
  border: string;
};

const SUBJECT_COLORS: Record<string, string> = {
  mathematics: "#4F46E5", // indigo
  maths: "#4F46E5",
  math: "#4F46E5",
  physics: "#2563EB", // blue
  chemistry: "#10B981", // emerald
  english: "#8B5CF6", // purple
  "computer science": "#06B6D4", // cyan
  cs: "#06B6D4",
  history: "#F97316", // orange
  geography: "#14B8A6", // teal
  biology: "#22C55E", // green
  sports: "#D97706", // amber
  pe: "#D97706",
  "physical education": "#D97706",
  hindi: "#E11D48", // crimson
  art: "#EC4899", // pink
  music: "#A855F7", // fuchsia
};

const FALLBACK_PALETTE = [
  "#2563EB",
  "#8B5CF6",
  "#10B981",
  "#F97316",
  "#06B6D4",
  "#E11D48",
  "#4F46E5",
  "#D97706",
];

function normalizeSubjectKey(subject: string) {
  return subject.trim().toLowerCase();
}

function hashSubject(subject: string) {
  let h = 0;
  for (let i = 0; i < subject.length; i++) h = (h * 31 + subject.charCodeAt(i)) >>> 0;
  return h;
}

/** Parse teacher slot times like "9:00 AM" / "09:30" → minutes since midnight. */
export function parseTeacherSlotStartMinutes(time: string): number {
  const m = time.match(/(\d+):(\d+)/);
  if (!m) return 0;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (time.toLowerCase().includes("pm") && h < 12) h += 12;
  if (time.toLowerCase().includes("am") && h === 12) h = 0;
  return h * 60 + min;
}

export type HighlightedTimetableSlot<T extends { time: string }> = {
  slot: T;
  current: boolean;
  next: boolean;
  past: boolean;
};

/** Mark current / next / past periods for a teacher day view. */
export function highlightTimetableSlots<T extends { time: string }>(
  list: T[],
  options: {
    day: string;
    today: string;
    nowMins: number;
    periodMinutes?: number;
  },
): HighlightedTimetableSlot<T>[] {
  const periodMinutes = options.periodMinutes ?? 45;
  if (options.day !== options.today) {
    return list.map((slot) => ({ slot, current: false, next: false, past: false }));
  }
  const sorted = [...list].sort(
    (a, b) => parseTeacherSlotStartMinutes(a.time) - parseTeacherSlotStartMinutes(b.time),
  );
  let currentIdx = -1;
  for (let i = 0; i < sorted.length; i++) {
    const start = parseTeacherSlotStartMinutes(sorted[i]!.time);
    const end = start + periodMinutes;
    if (options.nowMins >= start && options.nowMins < end) currentIdx = i;
  }
  const nextIdx =
    currentIdx >= 0
      ? currentIdx + 1
      : sorted.findIndex((s) => parseTeacherSlotStartMinutes(s.time) > options.nowMins);
  return sorted.map((slot, i) => ({
    slot,
    current: i === currentIdx,
    next: i === nextIdx && (currentIdx >= 0 || nextIdx === i),
    past:
      i < currentIdx ||
      (currentIdx < 0 &&
        parseTeacherSlotStartMinutes(slot.time) + periodMinutes <= options.nowMins),
  }));
}

export function subjectPrimaryColor(subject: string): string {
  const key = normalizeSubjectKey(subject);
  return SUBJECT_COLORS[key] ?? FALLBACK_PALETTE[hashSubject(key) % FALLBACK_PALETTE.length];
}

export function subjectStyle(subject: string): SubjectColorStyle {
  const primary = subjectPrimaryColor(subject);
  return {
    primary,
    surface: `color-mix(in srgb, ${primary} 10%, var(--card))`,
    chipBg: `color-mix(in srgb, ${primary} 18%, var(--card))`,
    border: `color-mix(in srgb, ${primary} 32%, var(--border))`,
  };
}
