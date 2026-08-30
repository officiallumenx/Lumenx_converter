import { useEffect, useRef, useState } from "react";
import {
  Card,
  CardHeader,
  Kpi,
  Pill,
  SegmentedControl,
  EmptyState,
} from "@lumenx/ui-admin";
import { useInstituteContext } from "@/lib/institutes";
import {
  loadAnalyticsSummary,
  loadAnalyticsSeries,
  resolveAnalyticsSummaryView,
  shouldCommitAnalyticsLoad,
  chartHasAttendanceData,
  chartHasEnrollmentData,
  chartHasFeeData,
  chartHasStatusData,
  chartHasSubjectData,
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

const GATED_CHARTS: Array<{ title: string; reason: string }> = [
  {
    title: "GPA vs attendance",
    reason: "No GPA column or grade scheme in schema — marks % is not converted to GPA.",
  },
  {
    title: "Exam outcomes (pass rate)",
    reason: "No durable pass threshold / grade boundary on exams — only raw published scores (shown as subject averages).",
  },
  {
    title: "Parent Connect engagement",
    reason: "No engagement / MAU event store — device tokens are presence only, not monthly history.",
  },
  {
    title: "Connect app adoption",
    reason: "No portal usage time series for parent / teacher / student adoption %.",
  },
  {
    title: "Complaint resolution SLA",
    reason: "SLA timers deferred in complaints schema — only current status exists.",
  },
  {
    title: "Fee collection % of target",
    reason: "No term fee targets / collection rollup — absolute payments are shown instead.",
  },
  {
    title: "Analytics narrative insights",
    reason: "Demo callouts are hardcoded marketing copy, not derived from institute facts.",
  },
];

function statusHint(status: AnalyticsLoadStatus, error: string | null): string {
  if (status === "loading") return "Loading analytics summary…";
  if (status === "needs_institute") return "Select an institute to load analytics.";
  if (status === "forbidden") return error ?? "Access denied for this institute.";
  if (status === "error") return error ?? "Failed to load analytics summary.";
  return "";
}

function ChartEmpty({ hint }: { hint: string }) {
  return (
    <p className="text-sm text-muted-foreground px-1 py-10 text-center">{hint}</p>
  );
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
  const fees = series.feePaymentsMonthly.map((r) => ({
    m: r.label,
    collected: r.collected,
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Charts & trends</h2>
          <p className="text-[11px] text-muted-foreground">
            Live series from GET /api/v1/analytics/series · {series.fromMonth} → {series.toMonth}
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
          title="Fee payments collected"
          hint="Sum of fee_payment.amount by paid_on (₹) — not % of target"
        >
          {chartHasFeeData(series) ? (
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <BarChart data={fees} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="m" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} width={44} />
                <Tooltip
                  content={
                    <AdminChartTooltip formatter={(_, v) => `₹${v.toLocaleString()}`} />
                  }
                />
                <Bar
                  dataKey="collected"
                  name="Collected"
                  fill="var(--chart-4)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty hint="No fee payments recorded in this range." />
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
      </div>

      <Card>
        <CardHeader
          title="Unavailable charts"
          hint="Not backed by durable product data — demo series are not shown"
          action={<Pill tone="warning">Gated</Pill>}
        />
        <ul className="px-4 pb-4 space-y-2">
          {GATED_CHARTS.map((item) => (
            <li
              key={item.title}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              <span className="font-medium">{item.title}</span>
              <span className="block text-[11px] text-muted-foreground mt-0.5">{item.reason}</span>
            </li>
          ))}
        </ul>
      </Card>
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
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  useEffect(() => {
    if (instituteCtx.status === "loading") {
      setSummary(null);
      setSeries(null);
      setLoadStatus("loading");
      setSeriesStatus("loading");
      setLoadError(null);
      setSeriesError(null);
      setResolvedForInstituteId(null);
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
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setLoadStatus("loading");
    setSeriesStatus("loading");
    setLoadError(null);
    setSeriesError(null);

    void Promise.all([
      loadAnalyticsSummary(requestInstituteId),
      loadAnalyticsSeries(requestInstituteId, range),
    ]).then(([summaryNext, seriesNext]) => {
      if (
        !shouldCommitAnalyticsLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setSummary(summaryNext.summary);
      setLoadStatus(summaryNext.status);
      setLoadError(summaryNext.errorMessage);
      setSeries(seriesNext.series);
      setSeriesStatus(seriesNext.status);
      setSeriesError(seriesNext.errorMessage);
      setResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    range,
  ]);

  const view = resolveAnalyticsSummaryView({
    apiMode: true,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedSummary: summary,
    storedStatus: loadStatus,
    storedErrorMessage: loadError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const seriesValid =
    resolvedForInstituteId === instituteCtx.activeInstituteId &&
    seriesStatus === "ready" &&
    series != null;

  const hint = statusHint(view.status, view.errorMessage);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Institute analytics"
          hint="Live counts from GET /api/v1/analytics"
          action={<Pill tone="neutral">Read-only · API mode</Pill>}
        />
        {hint ? (
          <p className="px-4 pb-4 text-sm text-muted-foreground">{hint}</p>
        ) : view.summary ? (
          <div className="px-4 pb-4 lx-kpi-grid">
            <Kpi label="Students" value={String(view.summary.students)} icon={<Users className="size-3.5" />} />
            <Kpi
              label="Teachers"
              value={String(view.summary.teachers)}
              icon={<GraduationCap className="size-3.5" />}
            />
            <Kpi label="Parents" value={String(view.summary.parents)} icon={<Heart className="size-3.5" />} />
            <Kpi
              label="Open complaints"
              value={String(view.summary.openComplaints)}
              icon={<MessageSquareWarning className="size-3.5" />}
            />
            <Kpi
              label="Pending leave"
              value={String(view.summary.pendingLeave)}
              icon={<CalendarOff className="size-3.5" />}
            />
            <Kpi
              label="Homework"
              value={String(view.summary.homeworkItems)}
              icon={<BookOpen className="size-3.5" />}
            />
          </div>
        ) : null}
      </Card>

      {seriesValid && series ? (
        <AnalyticsCharts series={series} range={range} onRangeChange={setRange} />
      ) : seriesStatus === "loading" ||
        (resolvedForInstituteId !== instituteCtx.activeInstituteId &&
          instituteCtx.activeInstituteId) ? (
        <p className="text-sm text-muted-foreground px-1">Loading chart series…</p>
      ) : seriesStatus === "error" || seriesStatus === "forbidden" ? (
        <Card>
          <EmptyState
            title="Charts unavailable"
            hint={seriesError ?? "Failed to load analytics series. Demo charts are not shown."}
          />
        </Card>
      ) : null}
    </div>
  );
}
