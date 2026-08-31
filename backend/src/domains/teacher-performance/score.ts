/**
 * Operational Performance Index (OPI) — composite 0–5 score from institute activity signals.
 * Student/parent feedback can replace or augment this later.
 */

export type TeacherOperationalCounts = {
  staffPresent: number;
  staffTotal: number;
  publishedMarks: number;
  publishedHomework: number;
  submittedDiaryDays: number;
  submittedAttendanceRegisters: number;
};

export type TeacherPerformanceWindowCounts = {
  ratingWindow: TeacherOperationalCounts;
  recentWindow: TeacherOperationalCounts;
  priorWindow: TeacherOperationalCounts;
};

const MARKS_TARGET = 5;
const HOMEWORK_TARGET = 10;
const DIARY_TARGET = 15;
const REGISTER_TARGET = 20;

function componentScore(value: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(value / target, 1) * 5;
}

/** Counts with zero activity still contribute a 0 component when the signal type exists in scope. */
export function computeOperationalScore(counts: TeacherOperationalCounts): number | null {
  const components: number[] = [];

  if (counts.staffTotal > 0) {
    components.push((counts.staffPresent / counts.staffTotal) * 5);
  }
  if (
    counts.publishedMarks > 0 ||
    counts.publishedHomework > 0 ||
    counts.submittedDiaryDays > 0 ||
    counts.submittedAttendanceRegisters > 0
  ) {
    components.push(componentScore(counts.publishedMarks, MARKS_TARGET));
    components.push(componentScore(counts.publishedHomework, HOMEWORK_TARGET));
    components.push(componentScore(counts.submittedDiaryDays, DIARY_TARGET));
    components.push(
      componentScore(counts.submittedAttendanceRegisters, REGISTER_TARGET),
    );
  } else if (counts.staffTotal === 0) {
    return null;
  }

  if (components.length === 0) return null;

  const avg = components.reduce((sum, v) => sum + v, 0) / components.length;
  return Math.round(Math.min(5, Math.max(0, avg)) * 100) / 100;
}

export function formatPerformanceTrend(
  recentRating: number | null,
  priorRating: number | null,
): string {
  if (recentRating == null || priorRating == null) return "0.00";
  const delta = Math.round((recentRating - priorRating) * 100) / 100;
  const formatted = Math.abs(delta).toFixed(2);
  if (delta > 0) return `+${formatted}`;
  if (delta < 0) return `-${formatted}`;
  return "0.00";
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function subtractDays(from: Date, days: number): Date {
  const next = new Date(from);
  next.setUTCDate(next.getUTCDate() - days);
  return next;
}

export function monthLabel(date: Date): string {
  return date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
}
