export type StudentPeriod = { time: string; subject: string; teacher: string };

/** Parse "08:30 – 09:15" → minutes since midnight */
export function parsePeriodMinutes(time: string, part: "start" | "end"): number {
  const chunk = part === "start" ? time.split("–")[0]?.trim() : time.split("–")[1]?.trim();
  if (!chunk) return 0;
  const m = chunk.match(/(\d+):(\d+)/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export function splitPeriodTime(time: string): { start: string; end: string } {
  const parts = time.split("–").map((s) => s.trim());
  return { start: parts[0] ?? time, end: parts[1] ?? "" };
}

export function getTodayDayName(weekdays: readonly string[]): string {
  const dow = new Date().getDay();
  if (dow === 0) return weekdays[0] ?? "Monday";
  const idx = Math.min(weekdays.length - 1, Math.max(0, dow - 1));
  return weekdays[idx] ?? weekdays[0];
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
  const end = parsePeriodMinutes(period.time, "end") || parsePeriodMinutes(period.time, "start") + 45;
  return now.getHours() * 60 + now.getMinutes() >= end;
}

const SUBJECT_STYLES: Record<string, { stripe: string; chip: string; ring: string }> = {
  Mathematics: { stripe: "bg-blue-500", chip: "bg-blue-500/12 text-blue-700 dark:text-blue-300", ring: "ring-blue-500/25" },
  Physics: { stripe: "bg-violet-500", chip: "bg-violet-500/12 text-violet-700 dark:text-violet-300", ring: "ring-violet-500/25" },
  Chemistry: { stripe: "bg-emerald-500", chip: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300", ring: "ring-emerald-500/25" },
  English: { stripe: "bg-amber-500", chip: "bg-amber-500/12 text-amber-800 dark:text-amber-300", ring: "ring-amber-500/25" },
  "Computer Science": { stripe: "bg-cyan-500", chip: "bg-cyan-500/12 text-cyan-800 dark:text-cyan-300", ring: "ring-cyan-500/25" },
  History: { stripe: "bg-orange-500", chip: "bg-orange-500/12 text-orange-800 dark:text-orange-300", ring: "ring-orange-500/25" },
  Sports: { stripe: "bg-rose-500", chip: "bg-rose-500/12 text-rose-700 dark:text-rose-300", ring: "ring-rose-500/25" },
};

const FALLBACK_STRIPES = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-cyan-500",
  "bg-orange-500",
];

export function subjectStyle(subject: string) {
  if (SUBJECT_STYLES[subject]) return SUBJECT_STYLES[subject];
  let hash = 0;
  for (let i = 0; i < subject.length; i++) hash += subject.charCodeAt(i);
  const stripe = FALLBACK_STRIPES[hash % FALLBACK_STRIPES.length];
  return {
    stripe,
    chip: "bg-muted text-foreground",
    ring: "ring-border",
  };
}
