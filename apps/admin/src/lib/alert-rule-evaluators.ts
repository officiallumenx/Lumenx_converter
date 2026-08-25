/**
 * Pure alert-rule condition checks against local/demo data.
 * No side effects — persistence and notifications live in alert-rules-store.
 */

import type { MarkEntry } from "@/lib/marks-entry-store";
import type { StudentDirectoryRecord } from "@/lib/student-directory-store";
import type { DemoComplaint } from "@lumenx/utils";

export const ATTENDANCE_DROP_THRESHOLD_PCT = 75;
export const WEAK_PERFORMANCE_THRESHOLD_PCT = 40;
export const WEAK_PERFORMANCE_CONSECUTIVE_EXAMS = 2;

export type StudentExamScore = {
  studentId: string;
  studentName: string;
  examId: string;
  examName: string;
  pct: number;
};

export type WeakPerformanceMatch = {
  studentId: string;
  studentName: string;
  examIds: string[];
  pcts: number[];
};

/** Active students whose monthly attendance % is below the threshold. */
export function findStudentsBelowAttendanceThreshold(
  students: StudentDirectoryRecord[],
  thresholdPct = ATTENDANCE_DROP_THRESHOLD_PCT,
): StudentDirectoryRecord[] {
  return students.filter(
    (student) => student.status !== "inactive" && student.attendance < thresholdPct,
  );
}

/** Aggregate per-student exam averages from mark entry rows (subjects combined). */
export function buildStudentExamScores(entries: MarkEntry[]): StudentExamScore[] {
  const byKey = new Map<
    string,
    { studentId: string; studentName: string; examId: string; examName: string; total: number; max: number }
  >();

  for (const entry of entries) {
    if (!entry.maxMarks) continue;
    for (const student of entry.students) {
      if (student.marks == null) continue;
      const key = `${student.studentId}|${entry.examId}`;
      const row = byKey.get(key) ?? {
        studentId: student.studentId,
        studentName: student.name,
        examId: entry.examId,
        examName: entry.examName,
        total: 0,
        max: 0,
      };
      row.total += student.marks;
      row.max += entry.maxMarks;
      byKey.set(key, row);
    }
  }

  return [...byKey.values()].map((row) => ({
    studentId: row.studentId,
    studentName: row.studentName,
    examId: row.examId,
    examName: row.examName,
    pct: row.max > 0 ? Math.round((row.total / row.max) * 100) : 0,
  }));
}

/** Students with N consecutive exam averages below the threshold (exam order from caller). */
export function findConsecutiveLowExamPerformance(
  scores: StudentExamScore[],
  examOrder: readonly string[],
  thresholdPct = WEAK_PERFORMANCE_THRESHOLD_PCT,
  consecutive = WEAK_PERFORMANCE_CONSECUTIVE_EXAMS,
): WeakPerformanceMatch[] {
  const orderIndex = new Map(examOrder.map((id, index) => [id, index]));
  const byStudent = new Map<string, StudentExamScore[]>();

  for (const score of scores) {
    if (!orderIndex.has(score.examId)) continue;
    const list = byStudent.get(score.studentId) ?? [];
    list.push(score);
    byStudent.set(score.studentId, list);
  }

  const matches: WeakPerformanceMatch[] = [];

  for (const [studentId, rows] of byStudent) {
    const ordered = rows
      .slice()
      .sort((a, b) => (orderIndex.get(a.examId) ?? 0) - (orderIndex.get(b.examId) ?? 0));

    for (let i = 0; i <= ordered.length - consecutive; i += 1) {
      const window = ordered.slice(i, i + consecutive);
      if (window.every((row) => row.pct < thresholdPct)) {
        matches.push({
          studentId,
          studentName: window[0]!.studentName,
          examIds: window.map((row) => row.examId),
          pcts: window.map((row) => row.pct),
        });
        break;
      }
    }
  }

  return matches;
}

/**
 * High-priority principal/admin complaints still open.
 * SLA timing is not available in demo data — only priority + routing + status are checked.
 */
export function findUnresolvedHighPriorityAdminComplaints(
  complaints: DemoComplaint[],
): DemoComplaint[] {
  return complaints.filter(
    (complaint) =>
      complaint.destination === "principal_admin" &&
      complaint.priority === "High" &&
      (complaint.status === "pending" || complaint.status === "review"),
  );
}
