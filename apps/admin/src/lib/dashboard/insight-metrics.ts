/**
 * Pure helpers for Admin Home insight cards.
 * Only derives from existing API-backed fields — never invents totals.
 */

import { summarizeFeesOverview, type FeesSnapshot } from "@lumenx/module-fees";
import type { AdmissionApplicationStatus } from "@/lib/admissions/types";

/** Application statuses still awaiting an admissions decision (client filter). */
export const PENDING_ADMISSION_STATUSES: ReadonlySet<AdmissionApplicationStatus> =
  new Set([
    "submitted",
    "review",
    "verification",
    "parent_confirmation",
    "waitlisted",
  ]);

export type InsightMetricState =
  | { state: "loading" }
  | { state: "unavailable"; reason: string }
  | { state: "error"; message: string }
  | { state: "ready"; value: number | string; detail?: string };

export type InsightLoadSlice = {
  status?: string;
  errorMessage?: string | null;
};

/** Shown in tooltips when today attendance totals cannot be loaded. */
export const ATTENDANCE_TODAY_UNAVAILABLE_REASON =
  "Today’s present, absent, not marked, and attendance percentage are not available for the whole institute yet. Open Student Attendance to review section registers.";

/** Shown in tooltips when overdue fees cannot be loaded. */
export const FEE_OVERDUE_UNAVAILABLE_REASON =
  "Overdue fee totals need due-date aging that is not in the fee snapshot yet. Outstanding (amount still due) is shown separately when available.";

export function countPendingAdmissionApplications(
  rows: Array<{ status: AdmissionApplicationStatus }>,
): number {
  return rows.filter((row) => PENDING_ADMISSION_STATUSES.has(row.status)).length;
}

/** Pipeline pending + approved applications still awaiting student convert. */
export function countAdmissionApplicationsRequiringAction(
  rows: Array<{
    status: AdmissionApplicationStatus;
    convertedStudentId: string | null;
  }>,
): number {
  return rows.filter(
    (row) =>
      PENDING_ADMISSION_STATUSES.has(row.status) ||
      (row.status === "approved" && !row.convertedStudentId),
  ).length;
}

export function compactInrAmount(amount: number): string {
  const safe = Math.max(0, Math.round(amount));
  if (safe >= 10_000_000) return `₹${(safe / 10_000_000).toFixed(2)} Cr`;
  if (safe >= 100_000) return `₹${(safe / 100_000).toFixed(1)} L`;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(safe);
}

export function insightMetricFromHub(input: {
  loading: boolean;
  /** True when TanStack is showing a previous institute's cached row. */
  isPlaceholderData: boolean;
  hasData: boolean;
  isError: boolean;
  errorMessage?: string | null;
  status?: string;
  readyValue: number;
  forbiddenReason: string;
  missingReason: string;
}): InsightMetricState {
  if (input.isPlaceholderData || (input.loading && !input.hasData)) {
    return { state: "loading" };
  }
  if (input.isError) {
    return {
      state: "error",
      message: input.errorMessage?.trim() || "Could not load this summary.",
    };
  }
  if (input.status === "forbidden") {
    return {
      state: "unavailable",
      reason: input.errorMessage?.trim() || input.forbiddenReason,
    };
  }
  if (input.status === "error") {
    return {
      state: "error",
      message: input.errorMessage?.trim() || "Could not load this summary.",
    };
  }
  if (!input.hasData) {
    return { state: "unavailable", reason: input.missingReason };
  }
  return { state: "ready", value: input.readyValue };
}

export function insightMetricFromWidgetCount(input: {
  widgetsValid: boolean;
  widgetsLoading: boolean;
  slice: InsightLoadSlice;
  count: number | undefined;
}): InsightMetricState {
  if (!input.widgetsValid) {
    return input.widgetsLoading
      ? { state: "loading" }
      : {
          state: "unavailable",
          reason: "This summary is still loading.",
        };
  }
  if (input.slice.status === "error") {
    return {
      state: "error",
      message: input.slice.errorMessage?.trim() || "Could not load this summary.",
    };
  }
  if (input.count == null) {
    return {
      state: "unavailable",
      reason: "This summary is not available yet.",
    };
  }
  return { state: "ready", value: input.count };
}

export function buildFeeCollectionMetrics(input: {
  academicYearId: string | null;
  feesLoading: boolean;
  feesPlaceholder: boolean;
  feesError: boolean;
  feesStatus?: string;
  feesErrorMessage?: string | null;
  snapshot: FeesSnapshot | null;
  studentsLoading: boolean;
  studentsPlaceholder: boolean;
  studentsError: boolean;
  studentsStatus?: string;
  studentsErrorMessage?: string | null;
  students: Array<{ studentId: string; classKey: string }>;
}): {
  collected: InsightMetricState;
  outstanding: InsightMetricState;
  overdue: InsightMetricState;
} {
  const overdue: InsightMetricState = {
    state: "unavailable",
    reason: FEE_OVERDUE_UNAVAILABLE_REASON,
  };

  const pair = (
    metric: InsightMetricState,
  ): {
    collected: InsightMetricState;
    outstanding: InsightMetricState;
    overdue: InsightMetricState;
  } => ({ collected: metric, outstanding: metric, overdue });

  if (!input.academicYearId) {
    return pair({
      state: "unavailable",
      reason: "Set an active academic year to see fee totals.",
    });
  }
  if (input.feesPlaceholder || (input.feesLoading && !input.snapshot && !input.feesError)) {
    return { ...pair({ state: "loading" }), overdue };
  }
  if (input.feesError || input.feesStatus === "error") {
    return {
      ...pair({
        state: "error",
        message: input.feesErrorMessage?.trim() || "Could not load fee totals.",
      }),
      overdue,
    };
  }
  if (input.feesStatus === "forbidden") {
    return {
      ...pair({
        state: "unavailable",
        reason:
          input.feesErrorMessage?.trim() ||
          "Fee totals are not available for your access level.",
      }),
      overdue,
    };
  }
  if (!input.snapshot) {
    return {
      ...pair({
        state: "unavailable",
        reason: "Fee totals are not available for this institute yet.",
      }),
      overdue,
    };
  }
  if (
    input.studentsPlaceholder ||
    (input.studentsLoading && input.studentsStatus == null && !input.studentsError)
  ) {
    return { ...pair({ state: "loading" }), overdue };
  }
  if (input.studentsError || input.studentsStatus === "error") {
    return {
      ...pair({
        state: "error",
        message:
          input.studentsErrorMessage?.trim() || "Could not load fee totals.",
      }),
      overdue,
    };
  }
  if (input.studentsStatus === "forbidden") {
    return {
      ...pair({
        state: "unavailable",
        reason:
          input.studentsErrorMessage?.trim() ||
          "Fee totals are not available for your access level.",
      }),
      overdue,
    };
  }

  const totals = summarizeFeesOverview(input.snapshot, input.students);
  return {
    collected: { state: "ready", value: compactInrAmount(totals.paid) },
    outstanding: {
      state: "ready",
      value: compactInrAmount(totals.due),
      detail: "Amount still due across student fee accounts.",
    },
    overdue,
  };
}

export function buildAttendanceTodayMetrics(): {
  present: InsightMetricState;
  absent: InsightMetricState;
  notMarked: InsightMetricState;
  attendancePct: InsightMetricState;
} {
  const unavailable: InsightMetricState = {
    state: "unavailable",
    reason: ATTENDANCE_TODAY_UNAVAILABLE_REASON,
  };
  return {
    present: unavailable,
    absent: unavailable,
    notMarked: unavailable,
    attendancePct: unavailable,
  };
}
