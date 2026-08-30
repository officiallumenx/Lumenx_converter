/**
 * Pure analytics aggregations — no DB, no demo series.
 * Callers supply institute-scoped fact rows already filtered by auth.
 */

export type AnalyticsRange = "term" | "year";

export type MonthBucket = {
  month: string; // YYYY-MM
  label: string;
};

const MONTH_LABELS = [
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

export function monthKeyFromDate(isoOrYmd: string): string | null {
  const m = /^(\d{4})-(\d{2})/.exec(isoOrYmd.trim());
  if (!m) return null;
  return `${m[1]}-${m[2]}`;
}

export function monthLabel(month: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return month;
  const idx = Number(m[2]) - 1;
  if (idx < 0 || idx > 11) return month;
  return `${MONTH_LABELS[idx]} ${m[1].slice(2)}`;
}

/** Inclusive month list ending at `asOf` (local calendar). term=4 months, year=12. */
export function monthsForRange(range: AnalyticsRange, asOf: Date = new Date()): MonthBucket[] {
  const count = range === "term" ? 4 : 12;
  const y = asOf.getFullYear();
  const m = asOf.getMonth(); // 0-based
  const out: MonthBucket[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(y, m - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({ month: key, label: monthLabel(key) });
  }
  return out;
}

export function firstDayOfMonth(month: string): string {
  return `${month}-01`;
}

export function lastDayOfMonth(month: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return `${month}-28`;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const last = new Date(y, mo, 0).getDate();
  return `${month}-${String(last).padStart(2, "0")}`;
}

/** Inclusive YYYY-MM-DD compare (string order). */
export function ymdInInclusiveRange(
  isoOrYmd: string,
  fromYmd: string,
  toYmd: string,
): boolean {
  const d = isoOrYmd.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  return d >= fromYmd && d <= toYmd;
}

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  "at-risk": "At risk",
  watch: "Watch",
  inactive: "Inactive",
  graduated: "Graduated",
};

export function aggregateStudentStatus(
  students: Array<{ status: string }>,
): Array<{ status: string; label: string; count: number }> {
  const counts = new Map<string, number>();
  for (const s of students) {
    const key = s.status || "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([status, count]) => ({
      status,
      label: STATUS_LABELS[status] ?? status,
      count,
    }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count || a.status.localeCompare(b.status));
}

export function aggregateEnrollmentMonthly(
  months: MonthBucket[],
  input: {
    enrollments: Array<{ enrolledOn: string }>;
    students: Array<{ createdAt: string }>;
  },
): Array<{
  month: string;
  label: string;
  newEnrollments: number;
  totalStudents: number;
}> {
  return months.map((bucket) => {
    const end = lastDayOfMonth(bucket.month);
    const newEnrollments = input.enrollments.filter((e) => {
      const key = monthKeyFromDate(e.enrolledOn);
      return key === bucket.month;
    }).length;
    const totalStudents = input.students.filter((s) => {
      const ymd = s.createdAt.slice(0, 10);
      return ymd <= end;
    }).length;
    return {
      month: bucket.month,
      label: bucket.label,
      newEnrollments,
      totalStudents,
    };
  });
}

export type AttendanceFact = {
  attendanceDate: string;
  classId: string;
  status: "present" | "absent" | "leave" | string;
};

function presentPct(facts: AttendanceFact[]): number | null {
  if (facts.length === 0) return null;
  const present = facts.filter((f) => f.status === "present").length;
  return Math.round((present / facts.length) * 1000) / 10;
}

export function aggregateAttendanceMonthly(
  months: MonthBucket[],
  facts: AttendanceFact[],
): Array<{
  month: string;
  label: string;
  presentPct: number | null;
  markCount: number;
}> {
  return months.map((bucket) => {
    const inMonth = facts.filter((f) => monthKeyFromDate(f.attendanceDate) === bucket.month);
    return {
      month: bucket.month,
      label: bucket.label,
      presentPct: presentPct(inMonth),
      markCount: inMonth.length,
    };
  });
}

export function aggregateAttendanceByClass(
  facts: AttendanceFact[],
  classNames: Map<string, string>,
): Array<{
  classId: string;
  className: string;
  presentPct: number | null;
  markCount: number;
}> {
  const byClass = new Map<string, AttendanceFact[]>();
  for (const f of facts) {
    const list = byClass.get(f.classId) ?? [];
    list.push(f);
    byClass.set(f.classId, list);
  }
  return [...byClass.entries()]
    .map(([classId, rows]) => ({
      classId,
      className: classNames.get(classId) ?? classId.slice(0, 8),
      presentPct: presentPct(rows),
      markCount: rows.length,
    }))
    .filter((r) => r.markCount > 0)
    .sort((a, b) => (b.presentPct ?? -1) - (a.presentPct ?? -1) || a.className.localeCompare(b.className));
}

export function aggregateFeePaymentsMonthly(
  months: MonthBucket[],
  payments: Array<{ paidOn: string; amount: number }>,
): Array<{
  month: string;
  label: string;
  collected: number;
  paymentCount: number;
}> {
  return months.map((bucket) => {
    const inMonth = payments.filter((p) => monthKeyFromDate(p.paidOn) === bucket.month);
    const collected =
      Math.round(inMonth.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) * 100) / 100;
    return {
      month: bucket.month,
      label: bucket.label,
      collected,
      paymentCount: inMonth.length,
    };
  });
}

export function aggregateSubjectAverages(
  entries: Array<{
    id: string;
    subjectId: string;
    maxMarks: number;
  }>,
  scores: Array<{ markEntryId: string; marks: number | null }>,
  subjectNames: Map<string, string>,
): Array<{
  subjectId: string;
  subjectName: string;
  avgPct: number;
  scoreCount: number;
}> {
  const entryById = new Map(entries.map((e) => [e.id, e]));
  const bySubject = new Map<string, number[]>();

  for (const score of scores) {
    if (score.marks == null || Number.isNaN(Number(score.marks))) continue;
    const entry = entryById.get(score.markEntryId);
    if (!entry || entry.maxMarks <= 0) continue;
    const pct = (Number(score.marks) / entry.maxMarks) * 100;
    const list = bySubject.get(entry.subjectId) ?? [];
    list.push(pct);
    bySubject.set(entry.subjectId, list);
  }

  return [...bySubject.entries()]
    .map(([subjectId, pcts]) => {
      const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
      return {
        subjectId,
        subjectName: subjectNames.get(subjectId) ?? subjectId.slice(0, 8),
        avgPct: Math.round(avg * 10) / 10,
        scoreCount: pcts.length,
      };
    })
    .sort((a, b) => b.avgPct - a.avgPct || a.subjectName.localeCompare(b.subjectName));
}

/** True when the chart has nothing meaningful to plot. */
export function seriesHasEnrollmentSignal(
  rows: Array<{ newEnrollments: number; totalStudents: number }>,
): boolean {
  return rows.some((r) => r.newEnrollments > 0 || r.totalStudents > 0);
}

export function seriesHasAttendanceSignal(
  rows: Array<{ markCount: number }>,
): boolean {
  return rows.some((r) => r.markCount > 0);
}

export function seriesHasFeeSignal(
  rows: Array<{ paymentCount: number }>,
): boolean {
  return rows.some((r) => r.paymentCount > 0);
}
