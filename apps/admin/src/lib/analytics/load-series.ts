import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { getAnalyticsSeries } from "./api";
import type { AnalyticsLoadStatus } from "./load";
import type { AnalyticsRange, AnalyticsSeriesDto } from "./types";

export type AnalyticsSeriesState = {
  status: AnalyticsLoadStatus;
  series: AnalyticsSeriesDto | null;
  errorMessage: string | null;
};

export async function loadAnalyticsSeries(
  activeInstituteId: string | null,
  range: AnalyticsRange = "year",
): Promise<AnalyticsSeriesState> {
  if (!isApiAuthMode()) {
    return { status: "demo", series: null, errorMessage: null };
  }
  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return { status: "needs_institute", series: null, errorMessage: null };
  }
  try {
    const series = await getAnalyticsSeries(activeInstituteId, range);
    return { status: "ready", series, errorMessage: null };
  } catch (err) {
    const status =
      err instanceof ApiClientError
        ? err.status
        : err &&
            typeof err === "object" &&
            "status" in err &&
            typeof (err as { status: unknown }).status === "number"
          ? (err as { status: number }).status
          : null;
    const message = err instanceof Error ? err.message : "Failed to load analytics series";
    if (status === 403) {
      return { status: "forbidden", series: null, errorMessage: message };
    }
    return { status: "error", series: null, errorMessage: message };
  }
}

export function chartHasEnrollmentData(
  series: AnalyticsSeriesDto | null,
): boolean {
  return Boolean(
    series?.enrollmentMonthly.some(
      (r) => r.newEnrollments > 0 || r.totalStudents > 0,
    ),
  );
}

export function chartHasAttendanceData(
  series: AnalyticsSeriesDto | null,
): boolean {
  return Boolean(series?.attendanceMonthly.some((r) => r.markCount > 0));
}

export function chartHasFeeData(series: AnalyticsSeriesDto | null): boolean {
  return Boolean(series?.feePaymentsMonthly.some((r) => r.paymentCount > 0));
}

export function chartHasStatusData(series: AnalyticsSeriesDto | null): boolean {
  return Boolean(series?.studentStatus.some((r) => r.count > 0));
}

export function chartHasSubjectData(series: AnalyticsSeriesDto | null): boolean {
  return Boolean(series?.subjectAverages.some((r) => r.scoreCount > 0));
}

export function chartHasLeaveData(series: AnalyticsSeriesDto | null): boolean {
  return Boolean(series?.leaveMonthly.some((r) => r.requested > 0));
}

export function chartHasLeaveStatusData(
  series: AnalyticsSeriesDto | null,
): boolean {
  return Boolean(series?.leaveByStatus.some((r) => r.count > 0));
}

export function chartHasComplaintStatusData(
  series: AnalyticsSeriesDto | null,
): boolean {
  return Boolean(series?.complaintsByStatus.some((r) => r.count > 0));
}

export function chartHasHomeworkData(series: AnalyticsSeriesDto | null): boolean {
  return Boolean(series?.homeworkMonthly.some((r) => r.created > 0));
}

export function chartHasAttendanceBreakdown(
  series: AnalyticsSeriesDto | null,
): boolean {
  return Boolean(series?.attendanceBreakdown.some((r) => r.count > 0));
}

export function chartHasEnrollmentByClass(
  series: AnalyticsSeriesDto | null,
): boolean {
  return Boolean(series?.enrollmentByClass.some((r) => r.count > 0));
}

/** Derived range insights from real series — null when no facts. */
export function deriveRangeInsights(series: AnalyticsSeriesDto | null): {
  avgPresentPct: number | null;
  feesCollected: number;
  feePayments: number;
  leaveRequested: number;
  homeworkCreated: number;
} | null {
  if (!series) return null;
  const attRows = series.attendanceMonthly.filter((r) => r.markCount > 0 && r.presentPct != null);
  const weighted = attRows.reduce(
    (acc, r) => {
      acc.sum += (r.presentPct ?? 0) * r.markCount;
      acc.marks += r.markCount;
      return acc;
    },
    { sum: 0, marks: 0 },
  );
  return {
    avgPresentPct:
      weighted.marks > 0
        ? Math.round((weighted.sum / weighted.marks) * 10) / 10
        : null,
    feesCollected: series.feePaymentsMonthly.reduce((s, r) => s + r.collected, 0),
    feePayments: series.feePaymentsMonthly.reduce((s, r) => s + r.paymentCount, 0),
    leaveRequested: series.leaveMonthly.reduce((s, r) => s + r.requested, 0),
    homeworkCreated: series.homeworkMonthly.reduce((s, r) => s + r.created, 0),
  };
}
