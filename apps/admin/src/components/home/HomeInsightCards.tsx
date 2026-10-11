import { useMemo, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import {
  BookMarked,
  ClipboardCheck,
  FileCheck2,
  IndianRupee,
  type LucideIcon,
} from "lucide-react";
import {
  useAdmissionsListQuery,
  useDocumentsHubQuery,
  useFeesSnapshotQuery,
  useStudentsListQuery,
} from "@/lib/admin-queries";
import { ADMIN_QUERY_VOLATILE_STALE_TIME_MS } from "@/lib/admin-queries/constants";
import type { DashboardWidgetsState } from "@/lib/dashboard";
import {
  ATTENDANCE_TODAY_UNAVAILABLE_REASON,
  buildAttendanceTodayMetrics,
  buildFeeCollectionMetrics,
  countAdmissionApplicationsRequiringAction,
  FEE_OVERDUE_UNAVAILABLE_REASON,
  insightMetricFromHub,
  insightMetricFromWidgetCount,
  type InsightMetricState,
} from "@/lib/dashboard/insight-metrics";
import { studentListItemsToFeesStudentOptions } from "@/lib/fees-students";

type InsightRoute =
  | "/student-attendance"
  | "/fees"
  | "/leave"
  | "/documents"
  | "/admissions"
  | "/marks"
  | "/diary";

type InsightMetric = {
  label: string;
  metric: InsightMetricState;
  hint?: string;
  to?: InsightRoute;
  search?: Record<string, string>;
};

type InsightAction = {
  label: string;
  to: InsightRoute;
  search?: Record<string, string>;
};

const HOME_INSIGHT_QUERY = {
  staleTime: ADMIN_QUERY_VOLATILE_STALE_TIME_MS,
  refetchOnWindowFocus: true,
} as const;

function formatReadyValue(value: number | string): string {
  if (typeof value === "number") return value.toLocaleString();
  return value;
}

function MetricValue({ metric }: { metric: InsightMetricState }) {
  if (metric.state === "loading") {
    return (
      <span className="lx-home-insight__value lx-home-insight__value--muted" aria-busy="true">
        …
      </span>
    );
  }
  if (metric.state === "unavailable") {
    return (
      <span
        className="lx-home-insight__value lx-home-insight__value--unavailable"
        title={metric.reason}
      >
        Not available
      </span>
    );
  }
  if (metric.state === "error") {
    return (
      <span
        className="lx-home-insight__value lx-home-insight__value--error"
        title={metric.message}
      >
        Can&apos;t load
      </span>
    );
  }
  return (
    <span className="lx-home-insight__value">{formatReadyValue(metric.value)}</span>
  );
}

function InsightCard({
  title,
  icon: Icon,
  accent,
  to,
  search,
  metrics,
  note,
  noteHint,
  actions,
  openLabel = "Open",
}: {
  title: string;
  icon: LucideIcon;
  accent: string;
  to: InsightRoute;
  search?: Record<string, string>;
  metrics: InsightMetric[];
  note?: string;
  noteHint?: string;
  actions?: InsightAction[];
  openLabel?: string;
}) {
  return (
    <section className={`lx-home-insight ${accent}`}>
      <div className="lx-home-insight__head">
        <div className="lx-home-insight__title-row">
          <span className="lx-home-insight__icon" aria-hidden>
            <Icon className="size-3.5" />
          </span>
          <h3 className="lx-home-insight__title">{title}</h3>
        </div>
        <Link
          to={to}
          search={search}
          className="lx-home-panel__link lx-home-insight__open"
        >
          {openLabel}
        </Link>
      </div>

      <ul className="lx-home-insight__metrics">
        {metrics.map((row) => (
          <li key={row.label} className="lx-home-insight__metric">
            {row.to ? (
              <Link
                to={row.to}
                search={row.search}
                className="lx-home-insight__label lx-home-insight__label--link"
                title={row.hint}
              >
                {row.label}
              </Link>
            ) : (
              <span className="lx-home-insight__label" title={row.hint}>
                {row.label}
              </span>
            )}
            <MetricValue metric={row.metric} />
          </li>
        ))}
      </ul>

      <div className="lx-home-insight__foot">
        {note ? (
          <p className="lx-home-insight__note" title={noteHint ?? note}>
            {note}
          </p>
        ) : (
          <p className="lx-home-insight__note lx-home-insight__note--spacer" aria-hidden>
            {"\u00a0"}
          </p>
        )}
        <div className="lx-home-insight__actions">
          {actions && actions.length > 0 ? (
            actions.map((action) => (
              <Link
                key={`${action.to}-${action.label}`}
                to={action.to}
                search={action.search}
                className="lx-home-insight__action"
              >
                {action.label}
              </Link>
            ))
          ) : (
            <span className="lx-home-insight__action-spacer" aria-hidden>
              {"\u00a0"}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

export function HomeInsightCards({
  instituteId,
  queriesEnabled,
  academicYearId,
  pendingLeave,
  summaryLoading,
  widgets,
  widgetsValid,
  widgetsLoading,
}: {
  instituteId: string | null;
  queriesEnabled: boolean;
  academicYearId: string | null;
  pendingLeave: number | null;
  summaryLoading: boolean;
  widgets: DashboardWidgetsState;
  widgetsValid: boolean;
  widgetsLoading: boolean;
}) {
  const feesEnabled =
    queriesEnabled && Boolean(instituteId) && Boolean(academicYearId);
  const feesQuery = useFeesSnapshotQuery(
    instituteId,
    academicYearId,
    feesEnabled,
    HOME_INSIGHT_QUERY,
  );
  const studentsQuery = useStudentsListQuery(
    instituteId,
    {},
    queriesEnabled && Boolean(instituteId),
    HOME_INSIGHT_QUERY,
  );
  const documentsQuery = useDocumentsHubQuery(
    instituteId,
    queriesEnabled && Boolean(instituteId),
    HOME_INSIGHT_QUERY,
  );
  const admissionsQuery = useAdmissionsListQuery(
    instituteId,
    queriesEnabled && Boolean(instituteId),
    HOME_INSIGHT_QUERY,
  );

  const feeMetrics = useMemo((): InsightMetric[] => {
    const built = buildFeeCollectionMetrics({
      academicYearId,
      feesLoading: feesQuery.isLoading,
      feesPlaceholder: feesQuery.isPlaceholderData,
      feesError: feesQuery.isError,
      feesStatus: feesQuery.data?.status,
      feesErrorMessage:
        feesQuery.data?.errorMessage ??
        (feesQuery.error instanceof Error ? feesQuery.error.message : null),
      snapshot: feesQuery.data?.snapshot ?? null,
      studentsLoading: studentsQuery.isLoading,
      studentsPlaceholder: studentsQuery.isPlaceholderData,
      studentsError: studentsQuery.isError,
      studentsStatus: studentsQuery.data?.status,
      studentsErrorMessage:
        studentsQuery.data?.errorMessage ??
        (studentsQuery.error instanceof Error ? studentsQuery.error.message : null),
      students: studentListItemsToFeesStudentOptions(
        studentsQuery.data?.items ?? [],
      ).map((s) => ({ studentId: s.id, classKey: s.classKey })),
    });
    return [
      { label: "Collected", metric: built.collected },
      {
        label: "Outstanding",
        metric: built.outstanding,
        hint: built.outstanding.state === "ready" ? built.outstanding.detail : undefined,
      },
      {
        label: "Overdue",
        metric: built.overdue,
        hint: FEE_OVERDUE_UNAVAILABLE_REASON,
      },
    ];
  }, [academicYearId, feesQuery, studentsQuery]);

  const approvalMetrics = useMemo((): InsightMetric[] => {
    const leaveFromWidgets =
      widgetsValid && widgets.leave.status !== "error"
        ? widgets.leave.pendingCount
        : null;
    const leaveValue =
      pendingLeave != null ? pendingLeave : leaveFromWidgets;
    const leaveMetric: InsightMetricState = summaryLoading
      ? { state: "loading" }
      : leaveValue == null
        ? {
            state: "unavailable",
            reason: "Pending leave is not available yet.",
          }
        : { state: "ready", value: leaveValue };

    const documentsMetric = insightMetricFromHub({
      loading: documentsQuery.isLoading,
      isPlaceholderData: documentsQuery.isPlaceholderData,
      hasData: Boolean(documentsQuery.data),
      isError: documentsQuery.isError,
      errorMessage:
        documentsQuery.data?.errorMessage ??
        (documentsQuery.error instanceof Error
          ? documentsQuery.error.message
          : null),
      status: documentsQuery.data?.status,
      readyValue: documentsQuery.data?.kpis.inReviewCount ?? 0,
      forbiddenReason:
        "Document review counts are not available for your access level.",
      missingReason: "Document review counts are not available yet.",
    });

    const admissionsMetric = insightMetricFromHub({
      loading: admissionsQuery.isLoading,
      isPlaceholderData: admissionsQuery.isPlaceholderData,
      hasData: Boolean(admissionsQuery.data),
      isError: admissionsQuery.isError,
      errorMessage:
        admissionsQuery.data?.errorMessage ??
        (admissionsQuery.error instanceof Error
          ? admissionsQuery.error.message
          : null),
      status: admissionsQuery.data?.status,
      readyValue: countAdmissionApplicationsRequiringAction(
        admissionsQuery.data?.items ?? [],
      ),
      forbiddenReason:
        "Admission application counts are not available for your access level.",
      missingReason: "Admission applications are not available yet.",
    });

    return [
      {
        label: "Pending leave",
        metric: leaveMetric,
        to: "/leave",
      },
      {
        label: "Documents in review",
        metric: documentsMetric,
        hint: "Generated documents waiting for teacher or admin review.",
        to: "/documents",
        search: { view: "generated" },
      },
      {
        label: "Admission applications",
        metric: admissionsMetric,
        hint: "Applications in progress or approved and waiting to convert.",
        to: "/admissions",
      },
    ];
  }, [
    summaryLoading,
    pendingLeave,
    widgetsValid,
    widgets.leave,
    documentsQuery.isLoading,
    documentsQuery.isPlaceholderData,
    documentsQuery.isError,
    documentsQuery.error,
    documentsQuery.data,
    admissionsQuery.isLoading,
    admissionsQuery.isPlaceholderData,
    admissionsQuery.isError,
    admissionsQuery.error,
    admissionsQuery.data,
  ]);

  const academicMetrics = useMemo((): InsightMetric[] => {
    return [
      {
        label: "Incomplete attendance",
        metric: insightMetricFromWidgetCount({
          widgetsValid,
          widgetsLoading,
          slice: widgets.attendanceDrafts,
          count: widgets.attendanceDrafts.rows.length,
        }),
        hint: "Attendance registers still need completion.",
        to: "/student-attendance",
      },
      {
        label: "Pending marks",
        metric: insightMetricFromWidgetCount({
          widgetsValid,
          widgetsLoading,
          slice: widgets.marksPending,
          count: widgets.marksPending.rows.length,
        }),
        hint: "Submitted marks waiting for review.",
        to: "/marks",
      },
      {
        label: "Pending diary",
        metric: insightMetricFromWidgetCount({
          widgetsValid,
          widgetsLoading,
          slice: widgets.diary,
          count: widgets.diary.missingYesterdayCount,
        }),
        hint: "Teachers who have not submitted yesterday’s diary.",
        to: "/diary",
      },
    ];
  }, [widgets, widgetsValid, widgetsLoading]);

  const attendanceToday = buildAttendanceTodayMetrics();

  return (
    <section
      className="lx-home-section lx-home-insight-band"
      style={{ "--lx-home-i": 2.5 } as CSSProperties}
      aria-label="Administrator overview"
    >
      <div className="lx-home-insight-grid">
        <InsightCard
          title="Student Attendance Today"
          icon={ClipboardCheck}
          accent="lx-home-insight--attendance"
          to="/student-attendance"
          metrics={[
            {
              label: "Present",
              metric: attendanceToday.present,
              hint: ATTENDANCE_TODAY_UNAVAILABLE_REASON,
            },
            {
              label: "Absent",
              metric: attendanceToday.absent,
              hint: ATTENDANCE_TODAY_UNAVAILABLE_REASON,
            },
            {
              label: "Not marked",
              metric: attendanceToday.notMarked,
              hint: ATTENDANCE_TODAY_UNAVAILABLE_REASON,
            },
            {
              label: "Attendance %",
              metric: attendanceToday.attendancePct,
              hint: ATTENDANCE_TODAY_UNAVAILABLE_REASON,
            },
          ]}
          note="Today’s institute totals are not available yet."
          noteHint={ATTENDANCE_TODAY_UNAVAILABLE_REASON}
        />
        <InsightCard
          title="Fee Collection Overview"
          icon={IndianRupee}
          accent="lx-home-insight--fees"
          to="/fees"
          search={{ view: "overview" }}
          metrics={feeMetrics}
          note="Overdue totals are not available yet."
          noteHint={FEE_OVERDUE_UNAVAILABLE_REASON}
        />
        <InsightCard
          title="Pending Approvals"
          icon={FileCheck2}
          accent="lx-home-insight--approvals"
          to="/leave"
          metrics={approvalMetrics}
          note="Items waiting for your review."
          actions={[
            { label: "Documents", to: "/documents", search: { view: "generated" } },
            { label: "Admissions", to: "/admissions" },
          ]}
        />
        <InsightCard
          title="Academic Progress Snapshot"
          icon={BookMarked}
          accent="lx-home-insight--academic"
          to="/diary"
          metrics={academicMetrics}
          note="Attendance registers still need completion."
          noteHint="Teachers who have not submitted yesterday’s diary appear under Pending diary."
          actions={[
            { label: "Attendance", to: "/student-attendance" },
            { label: "Marks", to: "/marks" },
          ]}
        />
      </div>
    </section>
  );
}
