import {
  buildAttendanceHistoryReport,
  computeAttendancePct,
} from "@lumenx/module-attendance";

export type AttendanceMonitorStatus = "good" | "watch" | "critical";

export type AttendanceMonitorSection = {
  sectionKey: string;
  classLabel: string;
  section: string;
  displayLabel?: string;
  studentIds: string[];
};

export type AcademicMonth = {
  key: string;
  label: string;
  shortLabel: string;
  year: number;
  monthIndex: number;
};

const MONTH_SHORT = [
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
];

export function statusForRate(rate: number): AttendanceMonitorStatus {
  if (rate >= 90) return "good";
  if (rate >= 80) return "watch";
  return "critical";
}

export function statusLabel(status: AttendanceMonitorStatus): string {
  if (status === "good") return "On track";
  if (status === "watch") return "Watch";
  return "Critical";
}

export function statusTone(
  status: AttendanceMonitorStatus,
): "success" | "warning" | "danger" {
  if (status === "good") return "success";
  if (status === "watch") return "warning";
  return "danger";
}

export function statusColor(status: AttendanceMonitorStatus): string {
  if (status === "good") return "var(--success)";
  if (status === "watch") return "var(--warning)";
  return "var(--destructive)";
}

export function shortClassName(name: string): string {
  return name.replace("Grade ", "G");
}

/** Present academic year starts in April. */
export function presentAcademicYearStart(now = new Date()) {
  const startMonth = 3; // April
  let startYear = now.getFullYear();
  if (now.getMonth() < startMonth) startYear -= 1;
  return { startYear, startMonth, label: `${startYear} — ${startYear + 1}` };
}

/** Months from present academic-year start through the present month. */
export function academicYearMonthsToPresent(now = new Date()): AcademicMonth[] {
  const { startYear, startMonth } = presentAcademicYearStart(now);
  const cursor = new Date(startYear, startMonth, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  const months: AcademicMonth[] = [];

  while (cursor <= end) {
    months.push({
      key: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`,
      label: `${MONTH_SHORT[cursor.getMonth()]} ${cursor.getFullYear()}`,
      shortLabel: MONTH_SHORT[cursor.getMonth()]!,
      year: cursor.getFullYear(),
      monthIndex: cursor.getMonth(),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

export function monthBoundsIso(monthKey: string, now = new Date()) {
  const [y, m] = monthKey.split("-").map(Number);
  const start = `${monthKey}-01`;
  const lastDay = new Date(y!, m!, 0).getDate();
  const endCandidate = `${monthKey}-${String(lastDay).padStart(2, "0")}`;
  const today = now.toISOString().slice(0, 10);
  return { from: start, to: endCandidate > today ? today : endCandidate };
}

export function rateForSectionMonth(
  section: AttendanceMonitorSection,
  monthKey: string,
  now = new Date(),
): { rate: number; students: number } {
  const { from, to } = monthBoundsIso(monthKey, now);
  const report = buildAttendanceHistoryReport({
    from,
    to,
    sectionKey: section.sectionKey,
    classLabel: section.classLabel,
    studentIds: section.studentIds,
  });
  return { rate: report.attendancePct, students: section.studentIds.length };
}

export type ClassAttendanceBar = {
  key: string;
  name: string;
  fullName: string;
  rate: number;
  status: AttendanceMonitorStatus;
  fill: string;
  students: number;
  trend: string;
};

export function buildClassAttendanceBars(
  sections: AttendanceMonitorSection[],
  selectedMonthKey: string,
  academicMonths: AcademicMonth[],
): ClassAttendanceBar[] {
  const prevIdx = academicMonths.findIndex((m) => m.key === selectedMonthKey) - 1;
  const prevMonth = prevIdx >= 0 ? academicMonths[prevIdx] : null;
  const rows = sections.map((section) => {
    const label = section.displayLabel ?? `${section.classLabel}-${section.section}`;
    const current = rateForSectionMonth(section, selectedMonthKey);
    const prev = prevMonth ? rateForSectionMonth(section, prevMonth.key) : null;
    const rate = current.rate;
    const status = statusForRate(rate);
    const delta = prev == null ? null : Math.round((rate - prev.rate) * 10) / 10;
    const trend =
      delta == null ? "—" : delta === 0 ? "0%" : `${delta > 0 ? "+" : ""}${delta}%`;
    return {
      key: label,
      name: shortClassName(label),
      fullName: label,
      rate,
      status,
      fill: statusColor(status),
      students: current.students,
      trend,
    };
  });
  return rows.sort((a, b) => b.rate - a.rate);
}

export function buildMonthlyBarsForSection(
  section: AttendanceMonitorSection,
  months: AcademicMonth[],
) {
  return months.map((month) => {
    const { rate } = rateForSectionMonth(section, month.key);
    const status = statusForRate(rate);
    return {
      key: month.key,
      label: month.shortLabel,
      rate,
      status,
      fill: statusColor(status),
    };
  });
}

export function countStatusBuckets(bars: { status: AttendanceMonitorStatus }[]) {
  const counts = { good: 0, watch: 0, critical: 0 };
  for (const row of bars) counts[row.status] += 1;
  return counts;
}

export function computeInstituteMonthRate(
  sections: AttendanceMonitorSection[],
  monthKey: string,
  now = new Date(),
): number {
  if (sections.length === 0) return 0;
  const { from, to } = monthBoundsIso(monthKey, now);
  let present = 0;
  let expected = 0;
  let leave = 0;
  for (const s of sections) {
    const report = buildAttendanceHistoryReport({
      from,
      to,
      sectionKey: s.sectionKey,
      classLabel: s.classLabel,
      studentIds: s.studentIds,
    });
    present += report.presentSlots;
    expected += report.expectedSlots;
    leave += report.leaveSlots;
  }
  return computeAttendancePct(present, expected, leave);
}
