/** Stable dedupe keys for alert rule fires — rule + record + event/date. */

import type { DemoComplaint } from "@lumenx/utils";
import type { WeakPerformanceMatch } from "@/lib/alert-rule-evaluators";

export type AlertFireRecord = {
  id: string;
  dedupeKey: string;
  ruleId: string;
  title: string;
  at: string;
  studentId?: string;
  complaintId?: string;
  resolvedAt?: string;
};

export function attendanceDedupeKey(ruleId: string, studentId: string, day: string): string {
  return `${ruleId}|student:${studentId}|day:${day}`;
}

export function weakPerformanceDedupeKey(
  ruleId: string,
  studentId: string,
  examIds: readonly string[],
): string {
  return `${ruleId}|student:${studentId}|exams:${examIds.join("+")}`;
}

export function complaintDedupeKey(ruleId: string, complaintId: string): string {
  return `${ruleId}|complaint:${complaintId}`;
}

/** Active = same dedupe key exists and has not been marked resolved. */
export function isActiveDedupe(fired: AlertFireRecord[], dedupeKey: string): boolean {
  return fired.some((row) => row.dedupeKey === dedupeKey && !row.resolvedAt);
}

export function inferDedupeKey(row: AlertFireRecord): string {
  if (row.dedupeKey) return row.dedupeKey;
  if (row.complaintId) return complaintDedupeKey(row.ruleId, row.complaintId);
  if (row.studentId && row.ruleId === "1") {
    return attendanceDedupeKey(row.ruleId, row.studentId, row.at.slice(0, 10));
  }
  if (row.studentId && row.ruleId === "2") {
    return `${row.ruleId}|student:${row.studentId}|legacy:${row.id}`;
  }
  return `${row.ruleId}|legacy:${row.id}`;
}

export function normalizeFireRecord(row: AlertFireRecord): AlertFireRecord {
  return row.dedupeKey ? row : { ...row, dedupeKey: inferDedupeKey(row) };
}

export function reconcileAttendanceFires(
  fired: AlertFireRecord[],
  belowThresholdStudentIds: ReadonlySet<string>,
  today: string,
  now: string,
): AlertFireRecord[] {
  return fired.map((row) => {
    if (row.ruleId !== "1" || row.resolvedAt) return row;
    const key = normalizeFireRecord(row).dedupeKey;
    const day = key.split("|day:")[1];
    if (day !== today) return row;
    if (row.studentId && !belowThresholdStudentIds.has(row.studentId)) {
      return { ...row, dedupeKey: key, resolvedAt: now };
    }
    return row.dedupeKey ? row : { ...row, dedupeKey: key };
  });
}

export function reconcileWeakPerformanceFires(
  fired: AlertFireRecord[],
  matches: WeakPerformanceMatch[],
  ruleId: string,
  now: string,
): AlertFireRecord[] {
  const activeKeys = new Set(
    matches.map((match) => weakPerformanceDedupeKey(ruleId, match.studentId, match.examIds)),
  );
  return fired.map((row) => {
    if (row.ruleId !== ruleId || row.resolvedAt) return row;
    const key = normalizeFireRecord(row).dedupeKey;
    if (!activeKeys.has(key)) {
      return { ...row, dedupeKey: key, resolvedAt: now };
    }
    return row.dedupeKey ? row : { ...row, dedupeKey: key };
  });
}

export function reconcileComplaintFires(
  fired: AlertFireRecord[],
  activeComplaints: DemoComplaint[],
  ruleId: string,
  now: string,
): AlertFireRecord[] {
  const activeIds = new Set(activeComplaints.map((complaint) => complaint.id));
  return fired.map((row) => {
    if (row.ruleId !== ruleId || row.resolvedAt) return row;
    const key = normalizeFireRecord(row).dedupeKey;
    if (row.complaintId && !activeIds.has(row.complaintId)) {
      return { ...row, dedupeKey: key, resolvedAt: now };
    }
    return row.dedupeKey ? row : { ...row, dedupeKey: key };
  });
}
