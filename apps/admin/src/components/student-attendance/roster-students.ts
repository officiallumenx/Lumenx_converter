/**
 * Roster helpers for Student Attendance — directory only, no engine logic.
 * Student ids are canonical Attendance ids (`stu:10:B:14`).
 */

import {
  canonicalAttendanceClassId,
  toAttendanceStudentId,
} from "@lumenx/module-attendance";
import {
  loadStudentDirectory,
  type StudentDirectoryRecord,
} from "@/lib/student-directory-store";

export type AttendanceRosterStudent = {
  id: string;
  name: string;
  roll: string;
};

/** Parse directory `grade` like `10-A` or `Grade 10-A`. */
export function parseStudentGrade(
  grade: string,
): { classPart: string; section: string } | null {
  const trimmed = grade.trim();
  const match = trimmed.match(/^(?:Grade\s+)?(.+)-([A-Za-z0-9]+)$/i);
  if (!match) return null;
  return {
    classPart: canonicalAttendanceClassId(match[1]!.trim()),
    section: match[2]!.trim().toUpperCase(),
  };
}

export function studentMatchesClassSection(
  student: StudentDirectoryRecord,
  classLabel: string,
  section: string,
): boolean {
  const parsed = parseStudentGrade(student.grade);
  if (!parsed) return false;
  if (parsed.section.toUpperCase() !== section.trim().toUpperCase()) return false;
  const a = canonicalAttendanceClassId(classLabel);
  const b = parsed.classPart;
  return a === b;
}

export function listRosterStudentsForSection(
  classLabel: string,
  section: string,
): AttendanceRosterStudent[] {
  const classId = canonicalAttendanceClassId(classLabel);
  const sec = section.trim().toUpperCase();
  return loadStudentDirectory()
    .filter((student) => studentMatchesClassSection(student, classId, sec))
    .map((student) => {
      const roll =
        student.rollNo?.trim() ||
        student.id.replace(/\D/g, "").slice(-2) ||
        "00";
      return {
        id: toAttendanceStudentId({
          id: student.id,
          classLabel: classId,
          section: sec,
          rollNo: roll,
        }),
        name: student.name,
        roll,
      };
    })
    .sort((a, b) => a.roll.localeCompare(b.roll, undefined, { numeric: true }));
}
