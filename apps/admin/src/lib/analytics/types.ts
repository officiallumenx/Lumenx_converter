/** Mirrors backend analytics DTOs. */

export type AnalyticsSummaryDto = {
  instituteId: string;
  students: number;
  teachers: number;
  parents: number;
  openComplaints: number;
  pendingLeave: number;
  homeworkItems: number;
};

export type AnalyticsRange = "term" | "year";

export type AnalyticsSeriesDto = {
  instituteId: string;
  range: AnalyticsRange;
  fromMonth: string;
  toMonth: string;
  studentStatus: Array<{ status: string; label: string; count: number }>;
  enrollmentMonthly: Array<{
    month: string;
    label: string;
    newEnrollments: number;
    totalStudents: number;
  }>;
  attendanceMonthly: Array<{
    month: string;
    label: string;
    presentPct: number | null;
    markCount: number;
  }>;
  attendanceByClass: Array<{
    classId: string;
    className: string;
    presentPct: number | null;
    markCount: number;
  }>;
  feePaymentsMonthly: Array<{
    month: string;
    label: string;
    collected: number;
    paymentCount: number;
  }>;
  subjectAverages: Array<{
    subjectId: string;
    subjectName: string;
    avgPct: number;
    scoreCount: number;
  }>;
};
