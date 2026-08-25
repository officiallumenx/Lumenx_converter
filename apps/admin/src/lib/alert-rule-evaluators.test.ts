import { describe, expect, it } from "vitest";
import { DEMO_COMPLAINTS_SEED } from "./complaints-data";
import type { MarkEntry } from "./marks-entry-store";
import {
  ATTENDANCE_DROP_THRESHOLD_PCT,
  buildStudentExamScores,
  findConsecutiveLowExamPerformance,
  findStudentsBelowAttendanceThreshold,
  findUnresolvedHighPriorityAdminComplaints,
} from "./alert-rule-evaluators";
import type { StudentDirectoryRecord } from "./student-directory-store";

function student(
  partial: Pick<StudentDirectoryRecord, "id" | "name" | "attendance"> &
    Partial<StudentDirectoryRecord>,
): StudentDirectoryRecord {
  return {
    firstName: partial.name.split(" ")[0] ?? partial.name,
    surname: partial.name.split(" ").slice(1).join(" ") || "Student",
    gender: "Other",
    address: "",
    parentName: "Parent",
    parentPhone: "9999999999",
    accessStatus: "active",
    grade: "10-A",
    gpa: 3,
    status: "active",
    parent: "Parent",
    ...partial,
  };
}

function markEntry(
  examId: string,
  examName: string,
  maxMarks: number,
  rows: Array<{ studentId: string; name: string; marks: number | null }>,
): MarkEntry {
  return {
    id: `entry-${examId}`,
    teacherId: "t-1",
    teacherName: "A. Mehta",
    subject: "Mathematics",
    classGrade: "Grade 10",
    section: "A",
    examId,
    examName,
    maxMarks,
    status: "submitted",
    students: rows.map((row) => ({
      studentId: row.studentId,
      rollNo: row.studentId,
      name: row.name,
      marks: row.marks,
    })),
  };
}

describe("alert rule evaluators", () => {
  it("finds students below the attendance threshold", () => {
    const hits = findStudentsBelowAttendanceThreshold([
      student({ id: "s-1", name: "Low Attendance", attendance: 68 }),
      student({ id: "s-2", name: "Healthy", attendance: 92 }),
    ]);
    expect(hits.map((row) => row.id)).toEqual(["s-1"]);
    expect(ATTENDANCE_DROP_THRESHOLD_PCT).toBe(75);
  });

  it("detects two consecutive exam averages below 40%", () => {
    const entries = [
      markEntry("EX-UT1", "Unit Test 1", 50, [
        { studentId: "ST-1", name: "Riya", marks: 18 },
      ]),
      markEntry("EX-UT2", "Unit Test 2", 50, [
        { studentId: "ST-1", name: "Riya", marks: 16 },
      ]),
    ];
    const scores = buildStudentExamScores(entries);
    const matches = findConsecutiveLowExamPerformance(scores, ["EX-UT1", "EX-UT2"], 40, 2);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.studentId).toBe("ST-1");
    expect(matches[0]?.pcts).toEqual([36, 32]);
  });

  it("ignores non-consecutive low exams", () => {
    const entries = [
      markEntry("EX-UT1", "Unit Test 1", 50, [
        { studentId: "ST-2", name: "Arjun", marks: 18 },
      ]),
      markEntry("EX-UT2", "Unit Test 2", 50, [
        { studentId: "ST-2", name: "Arjun", marks: 30 },
      ]),
      markEntry("EX-MID", "Mid-term", 80, [
        { studentId: "ST-2", name: "Arjun", marks: 20 },
      ]),
    ];
    const scores = buildStudentExamScores(entries);
    const matches = findConsecutiveLowExamPerformance(
      scores,
      ["EX-UT1", "EX-UT2", "EX-MID"],
      40,
      2,
    );
    expect(matches).toHaveLength(0);
  });

  it("finds unresolved high-priority admin complaints", () => {
    const hits = findUnresolvedHighPriorityAdminComplaints(DEMO_COMPLAINTS_SEED);
    expect(hits.map((row) => row.id)).toEqual(["CMP-201"]);
  });
});
