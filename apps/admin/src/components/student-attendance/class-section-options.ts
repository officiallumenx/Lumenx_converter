/**
 * Class / section options for Student Attendance selectors.
 * Directory lookup only — not attendance logic.
 * Option `id` values use canonical Attendance class ids (`10`), labels keep display text.
 */

import { canonicalAttendanceClassId } from "@lumenx/module-attendance";
import { loadClassDirectory } from "@/lib/class-directory-store";
import {
  filterClassSectionsForAccess,
  type AttendanceModuleAccess,
} from "@/lib/attendance-coordinator-access";
import type {
  StudentAttendanceClassOption,
  StudentAttendanceSectionOption,
} from "./types";

export function listStudentAttendanceClassOptions(
  access?: AttendanceModuleAccess,
): StudentAttendanceClassOption[] {
  const sections = access
    ? filterClassSectionsForAccess(loadClassDirectory(), access)
    : loadClassDirectory();
  const byClass = new Map<string, string>();
  for (const row of sections) {
    const display = row.timetableGrade || row.name;
    const classId = canonicalAttendanceClassId(display || row.levelId);
    if (!byClass.has(classId)) {
      byClass.set(classId, display || classId);
    }
  }
  return [...byClass.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
}

export function listStudentAttendanceSectionOptions(
  classId: string,
  access?: AttendanceModuleAccess,
): StudentAttendanceSectionOption[] {
  if (!classId) return [];
  const want = canonicalAttendanceClassId(classId);
  const sections = access
    ? filterClassSectionsForAccess(loadClassDirectory(), access)
    : loadClassDirectory();
  return sections
    .filter((row) => {
      const rowClass = canonicalAttendanceClassId(
        row.timetableGrade || row.levelId || row.name,
      );
      return rowClass === want;
    })
    .map((row) => ({
      id: row.id,
      label: row.section,
      classId: want,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
