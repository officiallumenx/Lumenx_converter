import { useEffect, useRef, useState } from "react";
import {
  Card,
  Pill,
  SegmentedControl,
  EmptyState,
} from "@lumenx/ui-admin";
import { ApiClientError } from "@/lib/api";
import { useInstituteContext } from "@/lib/institutes";
import {
  useAnalyticsSeriesQuery,
  useAnalyticsSummaryQuery,
} from "@/lib/admin-queries";
import {
  resolveAnalyticsSummaryView,
  chartHasAttendanceBreakdown,
  chartHasAttendanceData,
  chartHasComplaintStatusData,
  chartHasEnrollmentByClass,
  chartHasEnrollmentData,
  chartHasFeeData,
  chartHasHomeworkData,
  chartHasLeaveData,
  chartHasLeaveStatusData,
  chartHasStatusData,
  chartHasSubjectData,
  deriveRangeInsights,
  type AnalyticsLoadStatus,
  type AnalyticsRange,
  type AnalyticsSeriesDto,
  type AnalyticsSummaryDto,
} from "@/lib/analytics";
import {
  ChartCard,
  AdminChartTooltip,
  CHART_HEIGHT,
  axisTick,
  gridStroke,
} from "@/components/analytics/chart-utils";
import {
  Users,
  GraduationCap,
  Heart,
  MessageSquareWarning,
  CalendarOff,
  BookOpen,
  Percent,
  Wallet,
  ClipboardList,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const STATUS_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function statusHint(status: AnalyticsLoadStatus, error: string | null): string {
  if (status === "loading") return "Loading analytics summary…";
  if (status === "needs_institute") return "Select an institute to load analytics.";
  if (status === "forbidden") return error ?? "Access denied for this institute.";
  if (status === "error") return error ?? "Failed to load analytics summary.";
  return "";
}

function ChartEmpty({ hint }: { hint: string }) {
  return <p className="lx-analytics-empty">{hint}</p>;
}

function AnalyticsCharts({
  series,
  range,
  onRangeChange,
}: {
  series: AnalyticsSeriesDto;
  range: AnalyticsRange;
  onRangeChange: (r: AnalyticsRange) => void;
}) {
  const enrollment = series.enrollmentMonthly.map((r) => ({
    m: r.label,
    new: r.newEnrollments,
    v: r.totalStudents,
  }));
  const attendance = series.attendanceMonthly.map((r) => ({
    m: r.label,
    v: r.presentPct,
    marks: r.markCount,
  }));
  const statusPie = series.studentStatus.map((r, i) => ({
    name: r.label,
    value: r.count,
    fill: STATUS_COLORS[i % STATUS_COLORS.length],
  }));
  const byClass = series.attendanceByClass.map((r) => ({
    name: r.className,
    attendance: r.presentPct ?? 0,
    marks: r.markCount,
  }));
  const subjects = series.subjectAverages.map((r) => ({
    subject: r.subjectName,
    avg: r.avgPct,
  }));
  const leave = (series.leaveMonthly ?? []).map((r) => ({
    m: r.label,
    requested: r.requested,
    pending: r.pending,
    approved: r.approved,
    rejected: r.rejected,
  }));
  const leaveStatus = (series.leaveByStatus ?? []).map((r, i) => ({
    name: r.label,
    value: r.count,
    fill: STATUS_COLORS[i % STATUS_COLORS.length],
  }));
  const complaints = (series.complaintsByStatus ?? []).map((r, i) => ({
    name: r.label,
    value: r.count,
    fill: STATUS_COLORS[i % STATUS_COLORS.length],
  }));
  const homework = (series.homeworkMonthly ?? []).map((r) => ({
    m: r.label,
    created: r.created,
    published: r.published,
  }));
  const attBreakdown = (series.attendanceBreakdown ?? []).map((r, i) => ({
    name: r.label,
    value: r.count,
    fill: STATUS_COLORS[i % STATUS_COLORS.length],
  }));
  const enrollByClass = (series.enrollmentByClass ?? []).map((r) => ({
    name: r.className,
    students: r.count,
  }));
  const insights = deriveRangeInsights(series);
  const feesWithCount = series.feePaymentsMonthly.map((r) => ({
    m: r.label,
    collected: r.collected,
    payments: r.paymentCount,
  }));

  return (
    <div className="lx-analytics-charts space-y-4">
      <div className="lx-analytics-charts__toolbar">
        <div>
          <h2 className="lx-analytics-charts__title">Charts & trends</h2>
          <p className="lx-analytics-charts__hint">
            Live institute facts · {series.fromMonth} → {series.toMonth}
          </p>
        </div>
        <SegmentedControl
          value={range}
          onChange={onRangeChange}
          options={[
            { value: "term", label: "Last 4 months" },
            { value: "year", label: "Last 12 months" },
          ]}
        />
      </div>

      {insights ? (
        <div className="lx-analytics-kpi-grid">
          <div className="lx-analytics-kpi lx-analytics-kpi--students">
            <div className="lx-analytics-kpi__top">
              <span className="lx-analytics-kpi__icon" aria-hidden>
                <Percent className="size-3.5" />
              </span>
              <span className="lx-analytics-kpi__label">Avg present %</span>
            </div>
            <p className="lx-analytics-kpi__value">
              {insights.avgPresentPct != null ? `${insights.avgPresentPct}%` : "—"}
            </p>
          </div>
          <div className="lx-analytics-kpi lx-analytics-kpi--homework">
            <div className="lx-analytics-kpi__top">
              <span className="lx-analytics-kpi__icon" aria-hidden>
                <Wallet className="size-3.5" />
              </span>
              <span className="lx-analytics-kpi__label">Fees collected</span>
            </div>
            <p className="lx-analytics-kpi__value">
              ₹{Math.round(insights.feesCollected).toLocaleString()}
            </p>
          </div>
          <div className="lx-analytics-kpi lx-analytics-kpi--leave">
            <div className="lx-analytics-kpi__top">
              <span className="lx-analytics-kpi__icon" aria-hidden>
                <CalendarOff className="size-3.5" />
              </span>
              <span className="lx-analytics-kpi__label">Leave requests</span>
            </div>
            <p className="lx-analytics-kpi__value">
              {insights.leaveRequested.toLocaleString()}
            </p>
          </div>
          <div className="lx-analytics-kpi lx-analytics-kpi--complaints">
            <div className="lx-analytics-kpi__top">
              <span className="lx-analytics-kpi__icon" aria-hidden>
                <ClipboardList className="size-3.5" />
              </span>
              <span className="lx-analytics-kpi__label">Homework created</span>
            </div>
            <p className="lx-analytics-kpi__value">
              {insights.homeworkCreated.toLocaleString()}
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-12 gap-4">
        <ChartCard
          className="col-span-12 lg:col-span-8"
          title="Enrollment trend"
          hint="New enrollments by enrolled_on · cumulative students by created_at"
        >
          {chartHasEnrollmentData(series) ? (
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <ComposedChart data={enrollment} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="m" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={axisTick} axisLine={false} tickLine={false} width={36} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip content={<AdminChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar
                  yAxisId="right"
                  dataKey="new"
                  name="New enrollments"
                  fill="var(--chart-3)"
                  radius={[4, 4, 0, 0]}
                  barSize={14}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="v"
                  name="Students (cumulative)"
                  stroke="var(--chart-1)"
                  fill="var(--chart-1)"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty hint="No enrollment or student created_at data in this range." />
          )}
        </ChartCard>

        <ChartCard
          className="col-span-12 lg:col-span-4"
          title="Student status"
          hint="Current student.status distribution"
        >
          {chartHasStatusData(series) ? (
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <PieChart>
                <Pie
                  data={statusPie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={2}
                >
                  {statusPie.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  content={
                    <AdminChartTooltip formatter={(_, v) => `${v.toLocaleString()} students`} />
                  }
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty hint="No students to chart." />
          )}
        </ChartCard>

        <ChartCard
          className="col-span-12 lg:col-span-6"
          title="Attendance trend"
          hint="Present % of submitted register marks by month"
        >
          {chartHasAttendanceData(series) ? (
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <AreaChart data={attendance} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="m" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                  domain={[0, 100]}
                />
                <Tooltip
                  content={
                    <AdminChartTooltip
                      formatter={(n, v) => (n.includes("mark") ? String(v) : `${v}%`)}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="v"
                  name="Present %"
                  stroke="var(--chart-2)"
                  fill="var(--chart-2)"
                  fillOpacity={0.2}
                  strokeWidth={2}
                  connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty hint="No submitted attendance marks in this range." />
          )}
        </ChartCard>

        <ChartCard
          className="col-span-12 lg:col-span-6"
          title="Attendance mix"
          hint="Present / absent / leave marks in selected range"
        >
          {chartHasAttendanceBreakdown(series) ? (
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <PieChart>
                <Pie
                  data={attBreakdown}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={78}
                  paddingAngle={2}
                >
                  {attBreakdown.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  content={
                    <AdminChartTooltip formatter={(_, v) => `${v.toLocaleString()} marks`} />
                  }
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty hint="No attendance marks in this range." />
          )}
        </ChartCard>

        <ChartCard
          className="col-span-12 lg:col-span-6"
          title="Fee payments collected"
          hint="Sum of fee payments by paid_on (₹) and payment count"
        >
          {chartHasFeeData(series) ? (
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <ComposedChart data={feesWithCount} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="m" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={axisTick} axisLine={false} tickLine={false} width={44} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip content={<AdminChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar
                  yAxisId="left"
                  dataKey="collected"
                  name="Collected (₹)"
                  fill="var(--chart-4)"
                  radius={[4, 4, 0, 0]}
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="payments"
                  name="Payments"
                  stroke="var(--chart-1)"
                  fill="var(--chart-1)"
                  fillOpacity={0.12}
                  strokeWidth={2}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty hint="No fee payments recorded in this range." />
          )}
        </ChartCard>

        <ChartCard
          className="col-span-12 lg:col-span-6"
          title="Students by class"
          hint="Active enrollments per class (current)"
        >
          {chartHasEnrollmentByClass(series) ? (
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <BarChart data={enrollByClass} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
                <Tooltip
                  content={
                    <AdminChartTooltip formatter={(_, v) => `${v.toLocaleString()} students`} />
                  }
                />
                <Bar
                  dataKey="students"
                  name="Active students"
                  fill="var(--chart-3)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty hint="No active enrollments to chart." />
          )}
        </ChartCard>

        <ChartCard
          className="col-span-12 lg:col-span-6"
          title="Attendance by class"
          hint="Present % across submitted marks in range"
        >
          {series.attendanceByClass.length > 0 ? (
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <BarChart data={byClass} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                  domain={[0, 100]}
                />
                <Tooltip
                  content={
                    <AdminChartTooltip formatter={(n, v) => (n === "Marks" ? String(v) : `${v}%`)} />
                  }
                />
                <Bar
                  dataKey="attendance"
                  name="Present %"
                  fill="var(--chart-2)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty hint="No class attendance marks in this range." />
          )}
        </ChartCard>

        <ChartCard
          className="col-span-12 lg:col-span-6"
          title="Subject averages"
          hint="Published mark scores as % of max_marks · published_at in selected range"
        >
          {chartHasSubjectData(series) ? (
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <BarChart
                data={subjects}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="subject"
                  width={88}
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<AdminChartTooltip formatter={(_, v) => `${v}%`} />} />
                <Bar dataKey="avg" name="Avg %" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty hint="No published mark scores yet." />
          )}
        </ChartCard>

        <ChartCard
          className="col-span-12 lg:col-span-8"
          title="Leave requests"
          hint="Leave starting in each month · status breakdown"
        >
          {chartHasLeaveData(series) ? (
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <BarChart data={leave} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="m" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
                <Tooltip content={<AdminChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="approved" name="Approved" stackId="leave" fill="var(--chart-2)" />
                <Bar dataKey="pending" name="Pending" stackId="leave" fill="var(--chart-4)" />
                <Bar
                  dataKey="rejected"
                  name="Rejected"
                  stackId="leave"
                  fill="var(--chart-5)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty hint="No leave requests with start dates in this range." />
          )}
        </ChartCard>

        <ChartCard
          className="col-span-12 lg:col-span-4"
          title="Leave status"
          hint="All leave requests (current statuses)"
        >
          {chartHasLeaveStatusData(series) ? (
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <PieChart>
                <Pie
                  data={leaveStatus}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={78}
                  paddingAngle={2}
                >
                  {leaveStatus.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  content={
                    <AdminChartTooltip formatter={(_, v) => `${v.toLocaleString()} requests`} />
                  }
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty hint="No leave requests yet." />
          )}
        </ChartCard>

        <ChartCard
          className="col-span-12 lg:col-span-6"
          title="Homework activity"
          hint="Homework created each month · published count"
        >
          {chartHasHomeworkData(series) ? (
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <ComposedChart data={homework} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="m" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
                <Tooltip content={<AdminChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar
                  dataKey="created"
                  name="Created"
                  fill="var(--chart-3)"
                  radius={[4, 4, 0, 0]}
                  barSize={16}
                />
                <Area
                  type="monotone"
                  dataKey="published"
                  name="Published"
                  stroke="var(--chart-1)"
                  fill="var(--chart-1)"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty hint="No homework created in this range." />
          )}
        </ChartCard>

        <ChartCard
          className="col-span-12 lg:col-span-6"
          title="Complaints by status"
          hint="Current complaint statuses (not invented SLA)"
        >
          {chartHasComplaintStatusData(series) ? (
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <BarChart data={complaints} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
                <Tooltip
                  content={
                    <AdminChartTooltip formatter={(_, v) => `${v.toLocaleString()} complaints`} />
                  }
                />
                <Bar dataKey="value" name="Complaints" radius={[4, 4, 0, 0]}>
                  {complaints.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty hint="No complaints recorded yet." />
          )}
        </ChartCard>
      </div>
    </div>
  );
}

export function AnalyticsApiSummaryPanel() {
  const instituteCtx = useInstituteContext();
  const [summary, setSummary] = useState<AnalyticsSummaryDto | null>(null);
  const [series, setSeries] = useState<AnalyticsSeriesDto | null>(null);
  const [loadStatus, setLoadStatus] = useState<AnalyticsLoadStatus>("loading");
  const [seriesStatus, setSeriesStatus] = useState<AnalyticsLoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [seriesError, setSeriesError] = useState<string | null>(null);
  const [range, setRange] = useState<AnalyticsRange>("year");
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<string | null>(null);
  const [seriesResolvedForInstituteId, setSeriesResolvedForInstituteId] = useState<
    string | null
  >(null);
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const listEnabled =
    instituteCtx.status === "ready" && Boolean(instituteCtx.activeInstituteId);
  const summaryQuery = useAnalyticsSummaryQuery(
    instituteCtx.activeInstituteId,
    listEnabled,
  );
  const seriesQuery = useAnalyticsSeriesQuery(
    instituteCtx.activeInstituteId,
    range,
    listEnabled,
  );

  useEffect(() => {
    if (instituteCtx.status === "loading") {
      setSummary(null);
      setSeries(null);
      setLoadStatus("loading");
      setSeriesStatus("loading");
      setLoadError(null);
      setSeriesError(null);
      setResolvedForInstituteId(null);
      setSeriesResolvedForInstituteId(null);
      return;
    }
    if (instituteCtx.status === "error" || instituteCtx.status === "forbidden") {
      setSummary(null);
      setSeries(null);
      setLoadStatus(instituteCtx.status === "forbidden" ? "forbidden" : "error");
      setSeriesStatus(instituteCtx.status === "forbidden" ? "forbidden" : "error");
      setLoadError(instituteCtx.errorMessage);
      setSeriesError(instituteCtx.errorMessage);
      setResolvedForInstituteId(null);
      setSeriesResolvedForInstituteId(null);
      return;
    }
    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setSummary(null);
      setSeries(null);
      setLoadStatus("needs_institute");
      setSeriesStatus("needs_institute");
      setLoadError(null);
      setSeriesError(null);
      setResolvedForInstituteId(null);
      setSeriesResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;

    if (summaryQuery.isLoading && !summaryQuery.data) {
      setLoadStatus("loading");
      setLoadError(null);
      return;
    }
    if (summaryQuery.isError && !summaryQuery.data) {
      const err = summaryQuery.error;
      const forbidden = err instanceof ApiClientError && err.status === 403;
      setSummary(null);
      setLoadStatus(forbidden ? "forbidden" : "error");
      setLoadError(
        err instanceof Error ? err.message : "Failed to load analytics summary.",
      );
      setResolvedForInstituteId(requestInstituteId);
      return;
    }
    if (!summaryQuery.data) return;

    const summaryNext = summaryQuery.data;
    setSummary(summaryNext.summary);
    setLoadStatus(summaryNext.status);
    setLoadError(summaryNext.errorMessage);
    setResolvedForInstituteId(requestInstituteId);
  }, [
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    summaryQuery.data,
    summaryQuery.isLoading,
    summaryQuery.isError,
    summaryQuery.error,
  ]);

  useEffect(() => {
    if (
      instituteCtx.status !== "ready" ||
      !instituteCtx.activeInstituteId
    ) {
      return;
    }
    const requestInstituteId = instituteCtx.activeInstituteId;
    if (seriesQuery.isLoading && !seriesQuery.data) {
      // Keep prior series visible while soft-refresh / range prefetch settles.
      if (!series) {
        setSeriesStatus("loading");
        setSeriesError(null);
      }
      return;
    }
    if (seriesQuery.isError && !seriesQuery.data) {
      setSeries(null);
      setSeriesStatus("error");
      setSeriesError(
        seriesQuery.error instanceof Error
          ? seriesQuery.error.message
          : "Failed to load analytics series.",
      );
      setSeriesResolvedForInstituteId(requestInstituteId);
      return;
    }
    if (!seriesQuery.data) return;
    const seriesNext = seriesQuery.data;
    setSeries(seriesNext.series);
    setSeriesStatus(seriesNext.status);
    setSeriesError(seriesNext.errorMessage);
    setSeriesResolvedForInstituteId(requestInstituteId);
  }, [
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    seriesQuery.data,
    seriesQuery.isLoading,
    seriesQuery.isError,
    seriesQuery.error,
    series,
  ]);

  const view = resolveAnalyticsSummaryView({
    apiMode: true,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedSummary: summary,
    storedStatus:
      summaryQuery.isLoading && !summaryQuery.data ? "loading" : loadStatus,
    storedErrorMessage: loadError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const seriesSettledForActive =
    seriesResolvedForInstituteId === instituteCtx.activeInstituteId;
  const seriesValid =
    seriesSettledForActive && seriesStatus === "ready" && series != null;

  const hint = statusHint(view.status, view.errorMessage);

  const kpiItems = view.summary
    ? [
        {
          key: "students",
          label: "Students",
          value: view.summary.students,
          accent: "lx-analytics-kpi--students",
          icon: Users,
        },
        {
          key: "teachers",
          label: "Teachers",
          value: view.summary.teachers,
          accent: "lx-analytics-kpi--teachers",
          icon: GraduationCap,
        },
        {
          key: "parents",
          label: "Parents",
          value: view.summary.parents,
          accent: "lx-analytics-kpi--parents",
          icon: Heart,
        },
        {
          key: "complaints",
          label: "Open complaints",
          value: view.summary.openComplaints,
          accent: "lx-analytics-kpi--complaints",
          icon: MessageSquareWarning,
        },
        {
          key: "leave",
          label: "Pending leave",
          value: view.summary.pendingLeave,
          accent: "lx-analytics-kpi--leave",
          icon: CalendarOff,
        },
        {
          key: "homework",
          label: "Homework",
          value: view.summary.homeworkItems,
          accent: "lx-analytics-kpi--homework",
          icon: BookOpen,
        },
      ]
    : [];

  return (
    <div className="lx-analytics space-y-4">
      <section className="lx-analytics-hero">
        <div className="lx-analytics-hero__content">
          <p className="lx-analytics-hero__eyebrow">Insights</p>
          <h2 className="lx-analytics-hero__title">Institute analytics</h2>
          <p className="lx-analytics-hero__sub">
            Live institute counts and durable chart series — view only.
          </p>
        </div>
        <div className="lx-analytics-hero__art" aria-hidden>
          <span className="lx-analytics-hero__orb lx-analytics-hero__orb--a" />
          <span className="lx-analytics-hero__orb lx-analytics-hero__orb--b" />
          <span className="lx-analytics-hero__orb lx-analytics-hero__orb--c" />
        </div>
      </section>

      <section className="lx-analytics-summary">
        <div className="lx-analytics-summary__head">
          <div>
            <h3 className="lx-analytics-summary__title">Live overview</h3>
            <p className="lx-analytics-summary__hint">Current institute totals</p>
          </div>
          <Pill tone="neutral">View only</Pill>
        </div>
        {hint ? (
          <p className="text-sm text-muted-foreground px-0.5">{hint}</p>
        ) : view.summary ? (
          <div className="lx-analytics-kpi-grid">
            {kpiItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.key} className={`lx-analytics-kpi ${item.accent}`}>
                  <div className="lx-analytics-kpi__top">
                    <span className="lx-analytics-kpi__icon" aria-hidden>
                      <Icon className="size-3.5" />
                    </span>
                    <span className="lx-analytics-kpi__label">{item.label}</span>
                  </div>
                  <p className="lx-analytics-kpi__value">{item.value.toLocaleString()}</p>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>

      {seriesValid && series ? (
        <AnalyticsCharts series={series} range={range} onRangeChange={setRange} />
      ) : seriesStatus === "loading" ||
        (!seriesSettledForActive && instituteCtx.activeInstituteId) ? (
        <p className="text-sm text-muted-foreground px-1">Loading chart series…</p>
      ) : seriesSettledForActive &&
        (seriesStatus === "error" || seriesStatus === "forbidden") ? (
        <Card className="lx-analytics-gated">
          <EmptyState
            title="Charts unavailable"
            hint={seriesError ?? "Failed to load analytics series. Demo charts are not shown."}
          />
        </Card>
      ) : null}
    </div>
  );
}
