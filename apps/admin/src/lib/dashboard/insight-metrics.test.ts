import { describe, expect, it } from "vitest";
import type { FeesSnapshot } from "@lumenx/module-fees";
import {
  ATTENDANCE_TODAY_UNAVAILABLE_REASON,
  buildAttendanceTodayMetrics,
  buildFeeCollectionMetrics,
  compactInrAmount,
  countAdmissionApplicationsRequiringAction,
  countPendingAdmissionApplications,
  FEE_OVERDUE_UNAVAILABLE_REASON,
  insightMetricFromHub,
  insightMetricFromWidgetCount,
  PENDING_ADMISSION_STATUSES,
} from "./insight-metrics";

function emptyFeesSnapshot(): FeesSnapshot {
  return {
    version: 1,
    categories: [],
    classDefaults: {},
    overrides: [],
    collections: {},
    payments: [],
    transportStopFees: {},
    publish: {
      status: "draft",
      scope: { type: "institute" },
      publishedAt: null,
    },
  };
}

describe("insight-metrics", () => {
  it("counts only in-progress admission application statuses", () => {
    expect(
      countPendingAdmissionApplications([
        { status: "draft" },
        { status: "submitted" },
        { status: "review" },
        { status: "approved" },
        { status: "rejected" },
        { status: "waitlisted" },
        { status: "withdrawn" },
      ]),
    ).toBe(3);
  });

  it("counts admissions requiring action including approved awaiting convert", () => {
    expect(
      countAdmissionApplicationsRequiringAction([
        { status: "submitted", convertedStudentId: null },
        { status: "approved", convertedStudentId: null },
        { status: "approved", convertedStudentId: "stu-1" },
        { status: "rejected", convertedStudentId: null },
      ]),
    ).toBe(2);
  });

  it("keeps the pending admissions status set stable", () => {
    expect([...PENDING_ADMISSION_STATUSES].sort()).toEqual([
      "parent_confirmation",
      "review",
      "submitted",
      "verification",
      "waitlisted",
    ]);
  });

  it("formats compact INR amounts", () => {
    expect(compactInrAmount(0)).toMatch(/₹/);
    expect(compactInrAmount(150_000)).toBe("₹1.5 L");
    expect(compactInrAmount(12_000_000)).toBe("₹1.20 Cr");
  });

  it("keeps attendance today unavailable without inventing totals", () => {
    const metrics = buildAttendanceTodayMetrics();
    expect(metrics.present.state).toBe("unavailable");
    expect(metrics.absent.state).toBe("unavailable");
    expect(metrics.notMarked.state).toBe("unavailable");
    expect(metrics.attendancePct.state).toBe("unavailable");
    expect(ATTENDANCE_TODAY_UNAVAILABLE_REASON.length).toBeGreaterThan(20);
    expect(FEE_OVERDUE_UNAVAILABLE_REASON.length).toBeGreaterThan(10);
  });

  it("treats placeholder hub data as loading to avoid institute bleed", () => {
    expect(
      insightMetricFromHub({
        loading: false,
        isPlaceholderData: true,
        hasData: true,
        isError: false,
        readyValue: 9,
        forbiddenReason: "forbidden",
        missingReason: "missing",
      }),
    ).toEqual({ state: "loading" });
  });

  it("never turns hub errors into zero", () => {
    expect(
      insightMetricFromHub({
        loading: false,
        isPlaceholderData: false,
        hasData: false,
        isError: true,
        errorMessage: "Authentication required",
        readyValue: 0,
        forbiddenReason: "forbidden",
        missingReason: "missing",
      }),
    ).toEqual({ state: "error", message: "Authentication required" });
  });

  it("returns ready zero only after widget data successfully loads", () => {
    expect(
      insightMetricFromWidgetCount({
        widgetsValid: true,
        widgetsLoading: false,
        slice: { status: "empty", errorMessage: null },
        count: 0,
      }),
    ).toEqual({ state: "ready", value: 0 });
    expect(
      insightMetricFromWidgetCount({
        widgetsValid: false,
        widgetsLoading: true,
        slice: { status: "empty", errorMessage: null },
        count: undefined,
      }),
    ).toEqual({ state: "loading" });
  });

  it("builds fee metrics from snapshot rollup and keeps overdue unavailable", () => {
    const metrics = buildFeeCollectionMetrics({
      academicYearId: "year-1",
      feesLoading: false,
      feesPlaceholder: false,
      feesError: false,
      feesStatus: "ready",
      snapshot: emptyFeesSnapshot(),
      studentsLoading: false,
      studentsPlaceholder: false,
      studentsError: false,
      studentsStatus: "ready",
      students: [],
    });
    expect(metrics.collected).toEqual({ state: "ready", value: expect.stringMatching(/₹/) });
    expect(metrics.outstanding.state).toBe("ready");
    expect(metrics.overdue).toEqual({
      state: "unavailable",
      reason: FEE_OVERDUE_UNAVAILABLE_REASON,
    });
  });

  it("does not show fee zeros while placeholder data from another institute is visible", () => {
    const metrics = buildFeeCollectionMetrics({
      academicYearId: "year-1",
      feesLoading: false,
      feesPlaceholder: true,
      feesError: false,
      feesStatus: "ready",
      snapshot: emptyFeesSnapshot(),
      studentsLoading: false,
      studentsPlaceholder: false,
      studentsError: false,
      studentsStatus: "ready",
      students: [],
    });
    expect(metrics.collected.state).toBe("loading");
    expect(metrics.outstanding.state).toBe("loading");
  });
});
