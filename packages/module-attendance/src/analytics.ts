/**
 * Attendance Analytics — trends & insights (no exports).
 */

import { buildAttendanceHistoryReport, computeAttendancePct } from "./reports";
import type { AttendanceReportSectionInput } from "./admin-reports";

function monthKeysBetween(from: string, to: string): string[] {
  const keys: string[] = [];
  const cursor = new Date(`${from.slice(0, 7)}-01T12:00:00`);
  const end = new Date(`${to.slice(0, 7)}-01T12:00:00`);
  while (cursor <= end) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    keys.push(`${y}-${m}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return keys;
}

function monthBounds(monthKey: string, clampFrom: string, clampTo: string) {
  const [y, m] = monthKey.split("-").map(Number);
  const start = `${monthKey}-01`;
  const lastDay = new Date(y!, m!, 0).getDate();
  const end = `${monthKey}-${String(lastDay).padStart(2, "0")}`;
  return {
    from: start < clampFrom ? clampFrom : start,
    to: end > clampTo ? clampTo : end,
  };
}

export type AttendanceTrendPoint = {
  month: string;
  label: string;
  attendancePct: number;
  presentSlots: number;
  absentSlots: number;
  workingDays: number;
};

export function buildAttendanceTrends(input: {
  sections: AttendanceReportSectionInput[];
  from: string;
  to: string;
  holidayDates?: readonly string[];
}): AttendanceTrendPoint[] {
  const months = monthKeysBetween(input.from, input.to);
  return months.map((month) => {
    const { from, to } = monthBounds(month, input.from, input.to);
    let present = 0;
    let absent = 0;
    let leave = 0;
    let expected = 0;
    let workingDays = 0;

    for (const s of input.sections) {
      const report = buildAttendanceHistoryReport({
        from,
        to,
        sectionKey: s.sectionKey,
        classLabel: s.classLabel,
        studentIds: s.studentIds,
        holidayDates: input.holidayDates,
      });
      present += report.presentSlots;
      absent += report.absentSlots;
      leave += report.leaveSlots;
      expected += report.expectedSlots;
      workingDays = Math.max(workingDays, report.workingDays);
    }

    const attendancePct = computeAttendancePct(present, expected, leave);
    const [y, m] = month.split("-");
    const label = new Date(`${month}-01T12:00:00`).toLocaleDateString("en-IN", {
      month: "short",
      year: "2-digit",
    });

    return {
      month,
      label: label || `${m}/${y}`,
      attendancePct,
      presentSlots: present,
      absentSlots: absent,
      workingDays,
    };
  });
}

export type LowAttendanceSection = {
  sectionKey: string;
  label: string;
  classLabel: string;
  section: string;
  attendancePct: number;
  absentSlots: number;
  presentSlots: number;
  workingDays: number;
  status: "watch" | "critical";
};

export function buildLowAttendanceSections(input: {
  sections: AttendanceReportSectionInput[];
  from: string;
  to: string;
  holidayDates?: readonly string[];
  /** Default 85 — below this is "low". */
  thresholdPct?: number;
  /** Below this is critical (default 75). */
  criticalPct?: number;
}): LowAttendanceSection[] {
  const threshold = input.thresholdPct ?? 85;
  const critical = input.criticalPct ?? 75;
  const rows: LowAttendanceSection[] = [];

  for (const s of input.sections) {
    const report = buildAttendanceHistoryReport({
      from: input.from,
      to: input.to,
      sectionKey: s.sectionKey,
      classLabel: s.classLabel,
      studentIds: s.studentIds,
      holidayDates: input.holidayDates,
    });
    if (report.expectedSlots === 0) continue;
    if (report.attendancePct >= threshold) continue;
    rows.push({
      sectionKey: s.sectionKey,
      label: s.displayLabel ?? `Grade ${s.classLabel}-${s.section}`,
      classLabel: s.classLabel,
      section: s.section,
      attendancePct: report.attendancePct,
      absentSlots: report.absentSlots,
      presentSlots: report.presentSlots,
      workingDays: report.workingDays,
      status: report.attendancePct < critical ? "critical" : "watch",
    });
  }

  return rows.sort((a, b) => a.attendancePct - b.attendancePct);
}

export type FrequentlyAbsentStudent = {
  studentId: string;
  studentName: string;
  sectionKey: string;
  label: string;
  absentSlots: number;
  leaveSlots: number;
  presentSlots: number;
  attendancePct: number;
};

export function buildFrequentlyAbsentStudents(input: {
  sections: AttendanceReportSectionInput[];
  from: string;
  to: string;
  holidayDates?: readonly string[];
  /** Minimum absent slot marks to include (default 1). */
  minAbsentSlots?: number;
  limit?: number;
}): FrequentlyAbsentStudent[] {
  const minAbsent = input.minAbsentSlots ?? 1;
  const rows: FrequentlyAbsentStudent[] = [];

  for (const s of input.sections) {
    const report = buildAttendanceHistoryReport({
      from: input.from,
      to: input.to,
      sectionKey: s.sectionKey,
      classLabel: s.classLabel,
      studentIds: s.studentIds,
      holidayDates: input.holidayDates,
    });
    for (const st of report.byStudent) {
      if (st.absentSlots < minAbsent) continue;
      rows.push({
        studentId: st.studentId,
        studentName: s.studentNames?.[st.studentId] ?? st.studentId,
        sectionKey: s.sectionKey,
        label: s.displayLabel ?? `Grade ${s.classLabel}-${s.section}`,
        absentSlots: st.absentSlots,
        leaveSlots: st.leaveSlots,
        presentSlots: st.presentSlots,
        attendancePct: st.attendancePct,
      });
    }
  }

  return rows
    .sort((a, b) => b.absentSlots - a.absentSlots || a.attendancePct - b.attendancePct)
    .slice(0, input.limit ?? 25);
}
