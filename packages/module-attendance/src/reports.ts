/**
 * Historical attendance reports — Attendance % and Working Days.
 * Always interpret each day with the method frozen on that day's registers
 * (or the config effective that day if unmarked).
 */

import {
  enumerateIsoDates,
  expectedSlotIdsForDay,
  isWorkingDay,
  resolveHistoricalDay,
} from "./history";
import type { AttendanceMethod, AttendanceSlotRegister } from "./types";

export type AttendanceReportRange = {
  from: string;
  to: string;
  sectionKey: string;
  classLabel?: string;
  /** Student ids in the section roster. */
  studentIds: string[];
  /** ISO holiday dates (non-working). Sundays excluded automatically. */
  holidayDates?: readonly string[];
  /** Optional period defs when resolving unmarked period-wise days. */
  periodsByDate?: Record<string, { index: number; subject: string; time: string }[]>;
};

export type StudentAttendanceReportRow = {
  studentId: string;
  expectedSlots: number;
  presentSlots: number;
  absentSlots: number;
  leaveSlots: number;
  /** present / (expected - leave) * 100, or 100 if denominator 0 */
  attendancePct: number;
};

export type AttendanceHistoryReport = {
  from: string;
  to: string;
  sectionKey: string;
  workingDays: number;
  /** Sum of expected slot marks across working days (roster × slots). */
  expectedSlots: number;
  presentSlots: number;
  absentSlots: number;
  leaveSlots: number;
  /** Aggregate attendance % for the section. */
  attendancePct: number;
  /** Method segments inside the range (from frozen/config history). */
  methodSegments: {
    from: string;
    to: string;
    method: AttendanceMethod;
  }[];
  byStudent: StudentAttendanceReportRow[];
  /** Working days that still have missing submitted slots. */
  incompleteDays: string[];
};

/**
 * Single Attendance % formula — all dashboards / reports / analytics must use this.
 * present / (expected − leave) × 100; 100 when denominator is 0.
 */
export function computeAttendancePct(
  present: number,
  expected: number,
  leave: number,
): number {
  const denom = expected - leave;
  if (denom <= 0) return 100;
  return Math.round((present / denom) * 1000) / 10;
}

function slotStatusForStudent(
  reg: AttendanceSlotRegister | undefined,
  studentId: string,
): "present" | "absent" | "leave" | "missing" {
  if (!reg || reg.status !== "submitted") return "missing";
  if (reg.leaveIds.includes(studentId)) return "leave";
  if (reg.absentIds.includes(studentId)) return "absent";
  return "present";
}

function buildMethodSegments(
  workingDates: string[],
  sectionKey: string,
  classLabel?: string,
): AttendanceHistoryReport["methodSegments"] {
  if (workingDates.length === 0) return [];
  const segments: AttendanceHistoryReport["methodSegments"] = [];
  let segStart = workingDates[0]!;
  let segMethod = resolveHistoricalDay(sectionKey, segStart, { classLabel }).method;

  for (let i = 1; i < workingDates.length; i++) {
    const d = workingDates[i]!;
    const m = resolveHistoricalDay(sectionKey, d, { classLabel }).method;
    if (m !== segMethod) {
      segments.push({
        from: segStart,
        to: workingDates[i - 1]!,
        method: segMethod,
      });
      segStart = d;
      segMethod = m;
    }
  }
  segments.push({
    from: segStart,
    to: workingDates[workingDates.length - 1]!,
    method: segMethod,
  });
  return segments;
}

/**
 * Build a historical report that stays accurate across mid-year method changes.
 */
export function buildAttendanceHistoryReport(
  input: AttendanceReportRange,
): AttendanceHistoryReport {
  const holidays = new Set(input.holidayDates ?? []);
  const dates = enumerateIsoDates(input.from, input.to);
  const workingDates = dates.filter((d) => isWorkingDay(d, holidays));

  const perStudent = new Map<
    string,
    {
      expectedSlots: number;
      presentSlots: number;
      absentSlots: number;
      leaveSlots: number;
    }
  >();
  for (const id of input.studentIds) {
    perStudent.set(id, {
      expectedSlots: 0,
      presentSlots: 0,
      absentSlots: 0,
      leaveSlots: 0,
    });
  }

  const incompleteDays: string[] = [];
  let expectedSlots = 0;
  let presentSlots = 0;
  let absentSlots = 0;
  let leaveSlots = 0;

  for (const date of workingDates) {
    const day = resolveHistoricalDay(input.sectionKey, date, {
      classLabel: input.classLabel,
    });
    const periods = input.periodsByDate?.[date] ?? [];
    const slotIds = expectedSlotIdsForDay(day, periods);
    const bySlot = new Map(day.registers.map((r) => [r.slotId, r]));

    let dayComplete = slotIds.length > 0;
    for (const slotId of slotIds) {
      const reg = bySlot.get(slotId);
      if (!reg || reg.status !== "submitted") dayComplete = false;

      for (const studentId of input.studentIds) {
        const row = perStudent.get(studentId)!;
        const status = slotStatusForStudent(reg, studentId);
        if (status === "missing") {
          // Unmarked expected slot: still counts toward expected for % integrity
          // once we treat incomplete days — count expected only when submitted exists
          // OR count all expected. Spec: historical reports accurate — use submitted
          // slots only for % numerator/denominator when present; incomplete tracked separately.
          continue;
        }
        row.expectedSlots += 1;
        expectedSlots += 1;
        if (status === "leave") {
          row.leaveSlots += 1;
          leaveSlots += 1;
        } else if (status === "absent") {
          row.absentSlots += 1;
          absentSlots += 1;
        } else {
          row.presentSlots += 1;
          presentSlots += 1;
        }
      }
    }
    if (!dayComplete) incompleteDays.push(date);
  }

  const byStudent: StudentAttendanceReportRow[] = input.studentIds.map((studentId) => {
    const row = perStudent.get(studentId)!;
    return {
      studentId,
      ...row,
      attendancePct: computeAttendancePct(
        row.presentSlots,
        row.expectedSlots,
        row.leaveSlots,
      ),
    };
  });

  return {
    from: input.from,
    to: input.to,
    sectionKey: input.sectionKey,
    workingDays: workingDates.length,
    expectedSlots,
    presentSlots,
    absentSlots,
    leaveSlots,
    attendancePct: computeAttendancePct(presentSlots, expectedSlots, leaveSlots),
    methodSegments: buildMethodSegments(
      workingDates,
      input.sectionKey,
      input.classLabel,
    ),
    byStudent,
    incompleteDays,
  };
}

/** Compact cards for teacher Reports tab (daily / weekly / monthly windows). */
export type AttendanceReportCard = {
  period: "daily" | "weekly" | "monthly";
  label: string;
  present: number;
  absent: number;
  rate: number;
  workingDays: number;
};

export function buildTeacherReportCards(input: {
  sectionKey: string;
  classLabel?: string;
  studentIds: string[];
  holidayDates?: readonly string[];
  asOf?: string;
}): AttendanceReportCard[] {
  const asOf = (input.asOf ?? new Date().toISOString().slice(0, 10)).slice(0, 10);

  const dayStart = asOf;
  const weekStart = shiftIso(asOf, -6);
  const monthStart = `${asOf.slice(0, 7)}-01`;

  const mk = (
    period: AttendanceReportCard["period"],
    label: string,
    from: string,
    to: string,
  ): AttendanceReportCard => {
    const report = buildAttendanceHistoryReport({
      from,
      to,
      sectionKey: input.sectionKey,
      classLabel: input.classLabel,
      studentIds: input.studentIds,
      holidayDates: input.holidayDates,
    });
    return {
      period,
      label,
      present: report.presentSlots,
      absent: report.absentSlots,
      rate: report.attendancePct,
      workingDays: report.workingDays,
    };
  };

  return [
    mk("daily", "Today", dayStart, asOf),
    mk("weekly", "This week", weekStart, asOf),
    mk("monthly", labelMonth(asOf), monthStart, asOf),
  ];
}

function shiftIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function labelMonth(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}
