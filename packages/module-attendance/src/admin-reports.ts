/**
 * Admin Attendance Reports — tabular dimensions (no charts).
 * Daily · Weekly · Monthly · Student · Teacher · Class · Section
 */

import { listAllSlotRegisters } from "./register-store";
import { buildAttendanceHistoryReport, computeAttendancePct } from "./reports";
import type { AttendanceHistoryReport } from "./reports";

export type AttendanceReportKind =
  | "daily"
  | "weekly"
  | "monthly"
  | "student"
  | "teacher"
  | "class"
  | "section";

export const ATTENDANCE_REPORT_KIND_OPTIONS: {
  value: AttendanceReportKind;
  label: string;
  description: string;
}[] = [
  { value: "daily", label: "Daily", description: "Per-section snapshot for one day" },
  { value: "weekly", label: "Weekly", description: "Week-to-date aggregates by section" },
  { value: "monthly", label: "Monthly", description: "Month-to-date aggregates by section" },
  { value: "student", label: "Student", description: "Per-student attendance % in range" },
  { value: "teacher", label: "Teacher", description: "Who marked / submitted slots" },
  { value: "class", label: "Class", description: "Rolled up by class (all sections)" },
  { value: "section", label: "Section", description: "Full section history for the range" },
];

export type AttendanceReportSectionInput = {
  sectionKey: string;
  classLabel: string;
  section: string;
  studentIds: string[];
  studentNames?: Record<string, string>;
  /** Optional display name e.g. "Grade 10-B" */
  displayLabel?: string;
};

export type AttendanceReportCommonInput = {
  sections: AttendanceReportSectionInput[];
  from: string;
  to: string;
  holidayDates?: readonly string[];
};

export type DailyAttendanceRow = {
  date: string;
  sectionKey: string;
  label: string;
  classLabel: string;
  section: string;
  workingDay: boolean;
  present: number;
  absent: number;
  leave: number;
  rate: number;
  incomplete: boolean;
};

export type WeeklyAttendanceRow = {
  week: string;
  weekStart: string;
  weekEnd: string;
  sectionKey: string;
  label: string;
  classLabel: string;
  section: string;
  workingDays: number;
  present: number;
  absent: number;
  leave: number;
  rate: number;
  incompleteDays: number;
};

export type MonthlyAttendanceRow = {
  month: string;
  sectionKey: string;
  label: string;
  classLabel: string;
  section: string;
  workingDays: number;
  present: number;
  absent: number;
  leave: number;
  rate: number;
  incompleteDays: number;
};

export type StudentAttendanceRow = {
  studentId: string;
  studentName: string;
  sectionKey: string;
  label: string;
  classLabel: string;
  section: string;
  present: number;
  absent: number;
  leave: number;
  expected: number;
  rate: number;
};

export type TeacherAttendanceRow = {
  teacherId: string;
  teacherName: string;
  submissions: number;
  sections: number;
  absentMarks: number;
  leaveMarks: number;
  lastSubmittedAt: string;
};

export type ClassAttendanceRow = {
  classLabel: string;
  sections: number;
  workingDays: number;
  present: number;
  absent: number;
  leave: number;
  rate: number;
};

export type SectionAttendanceRow = {
  sectionKey: string;
  label: string;
  classLabel: string;
  section: string;
  workingDays: number;
  present: number;
  absent: number;
  leave: number;
  rate: number;
  incompleteDays: number;
  methodSegments: string;
};

function displayOf(s: AttendanceReportSectionInput): string {
  return s.displayLabel ?? `Grade ${s.classLabel}-${s.section}`;
}

function historyFor(
  s: AttendanceReportSectionInput,
  from: string,
  to: string,
  holidayDates?: readonly string[],
): AttendanceHistoryReport {
  return buildAttendanceHistoryReport({
    from,
    to,
    sectionKey: s.sectionKey,
    classLabel: s.classLabel,
    studentIds: s.studentIds,
    holidayDates,
  });
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday-start week containing the given ISO date. */
export function attendanceWeekBounds(isoDate: string): { from: string; to: string } {
  const d = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: toIso(monday), to: toIso(sunday) };
}

export function buildDailyAttendanceRows(
  input: AttendanceReportCommonInput & { date?: string },
): DailyAttendanceRow[] {
  const date = (input.date ?? input.to).slice(0, 10);
  return input.sections.map((s) => {
    const report = historyFor(s, date, date, input.holidayDates);
    return {
      date,
      sectionKey: s.sectionKey,
      label: displayOf(s),
      classLabel: s.classLabel,
      section: s.section,
      workingDay: report.workingDays > 0,
      present: report.presentSlots,
      absent: report.absentSlots,
      leave: report.leaveSlots,
      rate: report.attendancePct,
      incomplete: report.incompleteDays.includes(date),
    };
  });
}

export function buildWeeklyAttendanceRows(
  input: AttendanceReportCommonInput,
): WeeklyAttendanceRow[] {
  const weekStart = input.from.slice(0, 10);
  const weekEnd = input.to.slice(0, 10);
  const week = `${weekStart} → ${weekEnd}`;
  return input.sections.map((s) => {
    const report = historyFor(s, weekStart, weekEnd, input.holidayDates);
    return {
      week,
      weekStart,
      weekEnd,
      sectionKey: s.sectionKey,
      label: displayOf(s),
      classLabel: s.classLabel,
      section: s.section,
      workingDays: report.workingDays,
      present: report.presentSlots,
      absent: report.absentSlots,
      leave: report.leaveSlots,
      rate: report.attendancePct,
      incompleteDays: report.incompleteDays.length,
    };
  });
}

export function buildMonthlyAttendanceRows(
  input: AttendanceReportCommonInput,
): MonthlyAttendanceRow[] {
  const month = input.from.slice(0, 7);
  return input.sections.map((s) => {
    const report = historyFor(s, input.from, input.to, input.holidayDates);
    return {
      month,
      sectionKey: s.sectionKey,
      label: displayOf(s),
      classLabel: s.classLabel,
      section: s.section,
      workingDays: report.workingDays,
      present: report.presentSlots,
      absent: report.absentSlots,
      leave: report.leaveSlots,
      rate: report.attendancePct,
      incompleteDays: report.incompleteDays.length,
    };
  });
}

export function buildStudentAttendanceRows(
  input: AttendanceReportCommonInput,
): StudentAttendanceRow[] {
  const rows: StudentAttendanceRow[] = [];
  for (const s of input.sections) {
    const report = historyFor(s, input.from, input.to, input.holidayDates);
    for (const st of report.byStudent) {
      rows.push({
        studentId: st.studentId,
        studentName: s.studentNames?.[st.studentId] ?? st.studentId,
        sectionKey: s.sectionKey,
        label: displayOf(s),
        classLabel: s.classLabel,
        section: s.section,
        present: st.presentSlots,
        absent: st.absentSlots,
        leave: st.leaveSlots,
        expected: st.expectedSlots,
        rate: st.attendancePct,
      });
    }
  }
  return rows.sort((a, b) => a.rate - b.rate || a.studentName.localeCompare(b.studentName));
}

/** Teacher = attendance marker (who submitted registers), not staff self-attendance. */
export function buildTeacherAttendanceRows(input: {
  from: string;
  to: string;
  sectionKeys?: readonly string[];
}): TeacherAttendanceRow[] {
  const registers = listAllSlotRegisters().filter(
    (r) =>
      r.status === "submitted" &&
      r.date >= input.from &&
      r.date <= input.to &&
      (!input.sectionKeys?.length || input.sectionKeys.includes(r.sectionKey)),
  );

  const byTeacher = new Map<
    string,
    {
      teacherId: string;
      teacherName: string;
      submissions: number;
      sections: Set<string>;
      absentMarks: number;
      leaveMarks: number;
      lastSubmittedAt: string;
    }
  >();

  for (const r of registers) {
    const id = r.markedById || "unknown";
    let row = byTeacher.get(id);
    if (!row) {
      row = {
        teacherId: id,
        teacherName: r.markedByName || id,
        submissions: 0,
        sections: new Set(),
        absentMarks: 0,
        leaveMarks: 0,
        lastSubmittedAt: r.submittedAt ?? r.updatedAt,
      };
      byTeacher.set(id, row);
    }
    row.submissions += 1;
    row.sections.add(r.sectionKey);
    row.absentMarks += r.absentIds.length;
    row.leaveMarks += r.leaveIds.length;
    const submittedAt = r.submittedAt ?? r.updatedAt;
    if (submittedAt > row.lastSubmittedAt) row.lastSubmittedAt = submittedAt;
  }

  return [...byTeacher.values()]
    .map((t) => ({
      teacherId: t.teacherId,
      teacherName: t.teacherName,
      submissions: t.submissions,
      sections: t.sections.size,
      absentMarks: t.absentMarks,
      leaveMarks: t.leaveMarks,
      lastSubmittedAt: t.lastSubmittedAt,
    }))
    .sort((a, b) => b.submissions - a.submissions);
}

export function buildClassAttendanceRows(
  input: AttendanceReportCommonInput,
): ClassAttendanceRow[] {
  const byClass = new Map<
    string,
    {
      classLabel: string;
      sections: number;
      workingDays: number;
      present: number;
      absent: number;
      leave: number;
      expected: number;
    }
  >();

  for (const s of input.sections) {
    const report = historyFor(s, input.from, input.to, input.holidayDates);
    const existing = byClass.get(s.classLabel);
    if (!existing) {
      byClass.set(s.classLabel, {
        classLabel: s.classLabel,
        sections: 1,
        workingDays: report.workingDays,
        present: report.presentSlots,
        absent: report.absentSlots,
        leave: report.leaveSlots,
        expected: report.expectedSlots,
      });
    } else {
      existing.sections += 1;
      existing.workingDays = Math.max(existing.workingDays, report.workingDays);
      existing.present += report.presentSlots;
      existing.absent += report.absentSlots;
      existing.leave += report.leaveSlots;
      existing.expected += report.expectedSlots;
    }
  }

  return [...byClass.values()]
    .map((c) => ({
      classLabel: c.classLabel,
      sections: c.sections,
      workingDays: c.workingDays,
      present: c.present,
      absent: c.absent,
      leave: c.leave,
      rate: computeAttendancePct(c.present, c.expected, c.leave),
    }))
    .sort((a, b) => a.classLabel.localeCompare(b.classLabel, undefined, { numeric: true }));
}

export function buildSectionAttendanceRows(
  input: AttendanceReportCommonInput,
): SectionAttendanceRow[] {
  return input.sections.map((s) => {
    const report = historyFor(s, input.from, input.to, input.holidayDates);
    return {
      sectionKey: s.sectionKey,
      label: displayOf(s),
      classLabel: s.classLabel,
      section: s.section,
      workingDays: report.workingDays,
      present: report.presentSlots,
      absent: report.absentSlots,
      leave: report.leaveSlots,
      rate: report.attendancePct,
      incompleteDays: report.incompleteDays.length,
      methodSegments: report.methodSegments
        .map((m) => `${m.method} (${m.from}→${m.to})`)
        .join("; "),
    };
  });
}

export type AttendanceReportBundle =
  | { kind: "daily"; rows: DailyAttendanceRow[] }
  | { kind: "weekly"; rows: WeeklyAttendanceRow[] }
  | { kind: "monthly"; rows: MonthlyAttendanceRow[] }
  | { kind: "student"; rows: StudentAttendanceRow[] }
  | { kind: "teacher"; rows: TeacherAttendanceRow[] }
  | { kind: "class"; rows: ClassAttendanceRow[] }
  | { kind: "section"; rows: SectionAttendanceRow[] };

export function buildAttendanceReportByKind(
  kind: AttendanceReportKind,
  input: AttendanceReportCommonInput & { date?: string },
): AttendanceReportBundle {
  switch (kind) {
    case "daily":
      return { kind, rows: buildDailyAttendanceRows(input) };
    case "weekly":
      return { kind, rows: buildWeeklyAttendanceRows(input) };
    case "monthly":
      return { kind, rows: buildMonthlyAttendanceRows(input) };
    case "student":
      return { kind, rows: buildStudentAttendanceRows(input) };
    case "teacher":
      return {
        kind,
        rows: buildTeacherAttendanceRows({
          from: input.from,
          to: input.to,
          sectionKeys: input.sections.map((s) => s.sectionKey),
        }),
      };
    case "class":
      return { kind, rows: buildClassAttendanceRows(input) };
    case "section":
      return { kind, rows: buildSectionAttendanceRows(input) };
  }
}
