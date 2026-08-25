/**
 * Attendance report / analytics section inputs from live directory + roster.
 * Metrics always come from Registers via buildAttendanceHistoryReport — never demo rates.
 */

import type { AttendanceReportSectionInput } from "@lumenx/module-attendance";
import {
  buildAttendanceHistoryReport,
  buildAttendanceTrends,
  canonicalAttendanceClassId,
} from "@lumenx/module-attendance";
import { loadClassDirectory } from "@/lib/class-directory-store";
import { listRosterStudentsForSection } from "@/components/student-attendance/roster-students";
import {
  attendanceClassIdForSection,
  sectionKeyForClassSection,
} from "@/lib/attendance-coordinator-access";

export function attendanceReportRangeDefaults(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const to = `${y}-${m}-${d}`;
  const monthStart = `${y}-${m}-01`;
  const ayStartYear = now.getMonth() < 3 ? y - 1 : y;
  const from = `${ayStartYear}-04-01`;
  return { from, to, monthStart };
}

/** Sections with roster student ids for Reports / Analytics / Admin dashboard. */
export function listAttendanceReportSections(): AttendanceReportSectionInput[] {
  return loadClassDirectory()
    .map((row) => {
      const classLabel = attendanceClassIdForSection(row);
      const section = row.section.trim().toUpperCase();
      const roster = listRosterStudentsForSection(classLabel, section);
      const studentNames: Record<string, string> = {};
      for (const s of roster) studentNames[s.id] = s.name;
      return {
        sectionKey: sectionKeyForClassSection(row),
        classLabel,
        section,
        displayLabel: `${canonicalAttendanceClassId(row.timetableGrade || row.name)}-${section}`,
        studentIds: roster.map((s) => s.id),
        studentNames,
      };
    })
    .filter((s) => s.studentIds.length > 0);
}

/** Institute Analytics — monthly attendance % from Registers. */
export function listInstituteAttendanceMonthlySeries(range: "term" | "year" = "year") {
  const defaults = attendanceReportRangeDefaults();
  const from = range === "term" ? defaults.monthStart : defaults.from;
  const trends = buildAttendanceTrends({
    sections: listAttendanceReportSections(),
    from,
    to: defaults.to,
  });
  return trends.map((t) => ({
    m: t.label,
    v: t.attendancePct,
  }));
}

/** Institute Analytics — attendance by class/section for current month. */
export function listGradeAttendanceFromRegisters() {
  const range = attendanceReportRangeDefaults();
  return listAttendanceReportSections().map((s) => {
    const report = buildAttendanceHistoryReport({
      from: range.monthStart,
      to: range.to,
      sectionKey: s.sectionKey,
      classLabel: s.classLabel,
      studentIds: s.studentIds,
    });
    return {
      grade: s.displayLabel ?? `${s.classLabel}-${s.section}`,
      attendance: report.attendancePct,
      students: s.studentIds.length,
    };
  });
}
