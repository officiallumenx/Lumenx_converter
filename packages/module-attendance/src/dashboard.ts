/**
 * Attendance dashboard aggregates — Registers only (no demo seed / heatmap).
 */

import { isWorkingDay } from "./history";
import {
  listAttendanceNotificationInbox,
  listAttendanceNotificationOutbox,
  listAttendanceNotificationQueue,
} from "./notification-flow";
import {
  buildAttendanceHistoryReport,
  computeAttendancePct,
} from "./reports";
import { listAllSlotRegisters } from "./register-store";
import { normalizeAttendanceSectionKey } from "./identity";
import type { AttendanceReportSectionInput } from "./admin-reports";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Late if submitted after 10:00 local on the attendance date. */
export function isLateAttendanceSubmission(
  date: string,
  submittedAt?: string,
): boolean {
  if (!submittedAt) return false;
  const submitted = new Date(submittedAt);
  const cutoff = new Date(`${date}T10:00:00`);
  return submitted.getTime() > cutoff.getTime();
}

export type CoordinatorAttendanceSummary = {
  pendingToday: number;
  completedToday: number;
  lateSubmissions: number;
  monthAttendancePct: number;
  alertsQueued: number;
};

export type AdminAttendanceDashboard = {
  notSubmittedCount: number;
  lateSubmissionCount: number;
  dailySummaryQueued: number;
  dailySummaryDeliveredToday: number;
  attendancePct: number;
  workingDaysThisMonth: number;
  presentSlots: number;
  absentSlots: number;
  coordinatorSummary: CoordinatorAttendanceSummary;
};

/**
 * Aggregate section reports with the single Attendance % formula.
 */
export function aggregateSectionAttendanceReports(
  sections: AttendanceReportSectionInput[],
  from: string,
  to: string,
  holidayDates: readonly string[] = [],
): {
  attendancePct: number;
  workingDays: number;
  presentSlots: number;
  absentSlots: number;
  leaveSlots: number;
  expectedSlots: number;
} {
  let present = 0;
  let absent = 0;
  let leave = 0;
  let expected = 0;
  let workingDays = 0;
  for (const s of sections) {
    if (!s.studentIds.length) continue;
    const report = buildAttendanceHistoryReport({
      from,
      to,
      sectionKey: s.sectionKey,
      classLabel: s.classLabel,
      studentIds: s.studentIds,
      holidayDates,
    });
    present += report.presentSlots;
    absent += report.absentSlots;
    leave += report.leaveSlots;
    expected += report.expectedSlots;
    workingDays = Math.max(workingDays, report.workingDays);
  }
  return {
    attendancePct: computeAttendancePct(present, expected, leave),
    workingDays,
    presentSlots: present,
    absentSlots: absent,
    leaveSlots: leave,
    expectedSlots: expected,
  };
}

export function buildAdminAttendanceDashboard(input: {
  notSubmittedCount: number;
  holidayDates?: readonly string[];
  /** Institute sections + rosters — from directory, not demo seed. */
  sections?: AttendanceReportSectionInput[];
}): AdminAttendanceDashboard {
  const today = todayIso();
  const monthStart = `${today.slice(0, 7)}-01`;
  const registers = listAllSlotRegisters().filter((r) => r.status === "submitted");
  const lateSubmissionCount = registers.filter((r) =>
    isLateAttendanceSubmission(r.date, r.submittedAt),
  ).length;
  const completedToday = registers.filter((r) => r.date === today).length;

  const queue = listAttendanceNotificationQueue();
  const outbox = listAttendanceNotificationOutbox().filter(
    (m) => m.timing === "daily_summary" && m.status === "delivered" && m.date === today,
  );

  const sections = input.sections ?? [];
  const agg = aggregateSectionAttendanceReports(
    sections,
    monthStart,
    today,
    input.holidayDates ?? [],
  );

  return {
    notSubmittedCount: input.notSubmittedCount,
    lateSubmissionCount,
    dailySummaryQueued: queue.length,
    dailySummaryDeliveredToday: outbox.length,
    attendancePct: agg.attendancePct,
    workingDaysThisMonth: agg.workingDays,
    presentSlots: agg.presentSlots,
    absentSlots: agg.absentSlots,
    coordinatorSummary: {
      pendingToday: input.notSubmittedCount,
      completedToday,
      lateSubmissions: lateSubmissionCount,
      monthAttendancePct: agg.attendancePct,
      alertsQueued: queue.length,
    },
  };
}

export type LearnerTodayAttendance = {
  status: "present" | "absent" | "leave" | "holiday" | "future" | "unknown";
  label: string;
  date: string;
  /** True when status came from a submitted register. */
  fromRegister: boolean;
};

export function labelForAttendanceStatus(
  status: LearnerTodayAttendance["status"],
): string {
  switch (status) {
    case "present":
      return "Present";
    case "absent":
      return "Absent";
    case "leave":
      return "On leave";
    case "holiday":
      return "Holiday";
    case "future":
      return "Not yet marked";
    default:
      return "—";
  }
}

/**
 * Today's attendance for Student / Parent dashboards.
 * Uses submitted Registers only; unmarked working days are `unknown`.
 */
export function resolveLearnerTodayAttendance(input: {
  studentId: string;
  sectionKey?: string;
  date?: string;
  holidayDates?: readonly string[];
}): LearnerTodayAttendance {
  const date = input.date ?? todayIso();
  const holidays = new Set(input.holidayDates ?? []);
  if (holidays.has(date)) {
    return {
      status: "holiday",
      label: labelForAttendanceStatus("holiday"),
      date,
      fromRegister: false,
    };
  }
  if (date > todayIso()) {
    return {
      status: "future",
      label: labelForAttendanceStatus("future"),
      date,
      fromRegister: false,
    };
  }

  const wantSection = input.sectionKey
    ? normalizeAttendanceSectionKey(input.sectionKey)
    : undefined;

  const registers = listAllSlotRegisters().filter(
    (r) =>
      r.status === "submitted" &&
      r.date === date &&
      (!wantSection ||
        normalizeAttendanceSectionKey(r.sectionKey) === wantSection),
  );

  if (registers.length === 0) {
    return {
      status: "unknown",
      label: labelForAttendanceStatus("unknown"),
      date,
      fromRegister: false,
    };
  }

  if (registers.some((r) => r.leaveIds.includes(input.studentId))) {
    return {
      status: "leave",
      label: labelForAttendanceStatus("leave"),
      date,
      fromRegister: true,
    };
  }
  if (registers.some((r) => r.absentIds.includes(input.studentId))) {
    return {
      status: "absent",
      label: labelForAttendanceStatus("absent"),
      date,
      fromRegister: true,
    };
  }
  if (wantSection) {
    return {
      status: "present",
      label: labelForAttendanceStatus("present"),
      date,
      fromRegister: true,
    };
  }
  return {
    status: "unknown",
    label: labelForAttendanceStatus("unknown"),
    date,
    fromRegister: false,
  };
}

export function buildLearnerAttendanceNotifications(input: {
  recipient: "parent" | "student";
  /** Canonical attendance student id (`stu:…`). */
  studentId?: string;
  limit?: number;
}) {
  return listAttendanceNotificationInbox(input.recipient)
    .filter((n) => !input.studentId || n.studentId === input.studentId)
    .slice(0, input.limit ?? 5);
}

export function countWorkingDaysInMonth(
  year: number,
  monthIndex: number,
  holidayDates: readonly string[] = [],
): number {
  const holidays = new Set(holidayDates);
  let count = 0;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const m = String(monthIndex + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    const iso = `${year}-${m}-${d}`;
    if (isWorkingDay(iso, holidays)) count += 1;
  }
  return count;
}
