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
