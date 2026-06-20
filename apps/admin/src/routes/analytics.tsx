import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ChartCard, ChartLegendRow, AdminChartTooltip, CHART_HEIGHT, CHART_HEIGHT_SM, axisTick, gridStroke } from "@/components/analytics/chart-utils";
import { Button, Kpi, KpiGrid, Pill, SegmentedControl, PageStack } from "@lumenx/ui-admin";
import {
  BRANCHES,
  ENROLLMENT_MONTHLY,
  ATTENDANCE_MONTHLY,
  PERF_MONTHLY,
  FEE_COLLECTION_MONTHLY,
  EXAM_PASS_RATES,
  PARENT_ENGAGEMENT,
  COMPLAINT_SLA,
  CONNECT_USAGE,
  SUBJECT_PERFORMANCE,
  GRADE_ATTENDANCE,
  AT_RISK_PIE,
  BRANCH_COMPARE_CHART,
  ANALYTICS_INSIGHTS,
  sliceByRange,
} from "@/lib/admin-analytics-data";
import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
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
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  Users,
  Wallet,
  Smartphone,
  AlertTriangle,
  FileDown,
  GraduationCap,
  FileText,
} from "lucide-react";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics — LumenX Admin" }] }),
  component: AnalyticsPage,
});

type Range = "term" | "year";

function AnalyticsPage() {
  const [range, setRange] = useState<Range>("year");
  const [branchId, setBranchId] = useState<string>("all");

  const enrollment = useMemo(() => sliceByRange(ENROLLMENT_MONTHLY, range), [range]);
  const attendance = useMemo(() => sliceByRange(ATTENDANCE_MONTHLY, range), [range]);
  const perf = useMemo(() => sliceByRange(PERF_MONTHLY, range), [range]);
  const fees = useMemo(() => sliceByRange(FEE_COLLECTION_MONTHLY, range), [range]);
  const parents = useMemo(() => sliceByRange(PARENT_ENGAGEMENT, range), [range]);
  const sla = useMemo(() => sliceByRange(COMPLAINT_SLA, range), [range]);
  const connect = useMemo(() => sliceByRange(CONNECT_USAGE, range), [range]);

  const branchLabel = branchId === "all" ? "All branches" : BRANCHES.find((b) => b.id === branchId)?.name ?? "";

  const avgGpa = (PERF_MONTHLY.reduce((a, d) => a + d.gpa, 0) / PERF_MONTHLY.length).toFixed(2);
  const lastAtt = ATTENDANCE_MONTHLY[ATTENDANCE_MONTHLY.length - 1]!.v;
  const lastFee = FEE_COLLECTION_MONTHLY[FEE_COLLECTION_MONTHLY.length - 1]!.collected;
  const lastPass = EXAM_PASS_RATES[EXAM_PASS_RATES.length - 1]!.pass;
  const lastParent = PARENT_ENGAGEMENT[PARENT_ENGAGEMENT.length - 1]!.v;
  const lastSla = COMPLAINT_SLA[COMPLAINT_SLA.length - 1]!.resolved;
  const totalStudents = BRANCHES.reduce((a, b) => a + b.students, 0);

  const branchSegments = [
    { id: "all", label: "All branches" },
    ...BRANCHES.map((b) => ({ id: b.id, label: b.name.replace("Branch ", "") })),
  ];

  return (
    <AppShell
      title="Analytics"
      subtitle={`Institute intelligence · ${branchLabel} · Session 2025–26`}
      actions={
        <Button>
          <FileDown className="size-3.5" /> Export report
        </Button>
      }
    >
      <PageStack>
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
        <SegmentedControl
          value={range}
          onChange={setRange}
          options={[
            { value: "term", label: "Current term" },
            { value: "year", label: "Full year" },
          ]}
        />
        <SegmentedControl
          value={branchId}
          onChange={setBranchId}
          options={branchSegments.map((b) => ({ value: b.id, label: b.label }))}
        />
      </div>

      <KpiGrid cols={6}>
        <Kpi label="Total students" value={totalStudents.toLocaleString()} delta="+124 YTD" tone="up" icon={<Users />} />
        <Kpi label="Avg GPA" value={avgGpa} delta="+0.18" tone="up" icon={<GraduationCap />} />
        <Kpi label="Attendance" value={`${lastAtt}%`} delta="This month" tone="up" icon={<TrendingUp />} />
        <Kpi label="Fee collection" value={`${lastFee}%`} delta="Of target" tone="up" icon={<Wallet />} />
        <Kpi label="Exam pass rate" value={`${lastPass}%`} delta="Pre-board" tone="up" icon={<FileText />} />
        <Kpi label="Parent app use" value={`${lastParent}%`} delta="+6% YoY" tone="up" icon={<Smartphone />} />
      </KpiGrid>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {ANALYTICS_INSIGHTS.map((insight) => (
          <div
            key={insight.title}
            className={`rounded-xl border p-4 text-sm ${
              insight.tone === "success"
                ? "border-success/25 bg-success/5"
                : insight.tone === "warning"
                  ? "border-warning/25 bg-warning/5"
                  : "border-primary/25 bg-primary/5"
            }`}
          >
            <p className="font-semibold text-foreground">{insight.title}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{insight.body}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-4">
        <ChartCard className="col-span-12 lg:col-span-8" title="Enrollment trend" hint={range === "year" ? "Headcount & new admissions" : "Last 4 months"}>
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <ComposedChart data={enrollment} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="m" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={axisTick} axisLine={false} tickLine={false} width={36} />
              <YAxis yAxisId="right" orientation="right" tick={axisTick} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<AdminChartTooltip formatter={(n, v) => (n === "New admissions" ? `${v}` : v.toLocaleString())} />} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar yAxisId="right" dataKey="new" name="New admissions" fill="var(--chart-3)" radius={[4, 4, 0, 0]} barSize={14} />
              <Area yAxisId="left" type="monotone" dataKey="v" name="Total students" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.15} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard className="col-span-12 lg:col-span-4" title="Student risk profile" hint="Institute-wide">
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <PieChart>
              <Pie data={AT_RISK_PIE} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={2}>
                {AT_RISK_PIE.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<AdminChartTooltip formatter={(_, v) => `${v.toLocaleString()} students`} />} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard className="col-span-12 lg:col-span-6" title="Attendance trend" hint="Monthly institute average %">
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <AreaChart data={attendance} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="m" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis domain={[88, 100]} tick={axisTick} axisLine={false} tickLine={false} width={32} />
              <Tooltip content={<AdminChartTooltip formatter={(_, v) => `${v}%`} />} />
              <ReferenceLine y={93} stroke="var(--chart-4)" strokeDasharray="4 4" label={{ value: "Target 93%", position: "insideTopRight", fontSize: 9, fill: "oklch(0.55 0.02 260)" }} />
              <Area type="monotone" dataKey="v" name="Attendance" stroke="var(--chart-2)" fill="url(#attGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard className="col-span-12 lg:col-span-6" title="GPA vs attendance" hint="Dual-axis correlation">
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <LineChart data={perf} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="m" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis yAxisId="gpa" domain={[3.2, 3.6]} tick={axisTick} axisLine={false} tickLine={false} width={28} />
              <YAxis yAxisId="att" orientation="right" domain={[88, 100]} tick={axisTick} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<AdminChartTooltip formatter={(n, v) => (n === "GPA" ? v.toFixed(2) : `${v}%`)} />} />
              <Line yAxisId="gpa" type="monotone" dataKey="gpa" name="GPA" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3, fill: "var(--chart-1)" }} />
              <Line yAxisId="att" type="monotone" dataKey="att" name="Attendance" stroke="var(--chart-2)" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3, fill: "var(--chart-2)" }} />
            </LineChart>
          </ResponsiveContainer>
          <ChartLegendRow
            items={[
              { label: "GPA (4.0 scale)", color: "var(--chart-1)" },
              { label: "Attendance %", color: "var(--chart-2)" },
            ]}
          />
        </ChartCard>

        <ChartCard className="col-span-12 md:col-span-6" title="Fee collection" hint="% of term target collected">
          <ResponsiveContainer width="100%" height={CHART_HEIGHT_SM}>
            <BarChart data={fees} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="m" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis domain={[70, 100]} tick={axisTick} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<AdminChartTooltip formatter={(_, v) => `${v}%`} />} />
              <ReferenceLine y={90} stroke="var(--chart-3)" strokeDasharray="4 4" />
              <Bar dataKey="collected" name="Collected" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard className="col-span-12 md:col-span-6" title="Exam outcomes" hint="Pass rate & average score by term">
          <ResponsiveContainer width="100%" height={CHART_HEIGHT_SM}>
            <ComposedChart data={EXAM_PASS_RATES} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="term" tick={{ ...axisTick, fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" domain={[85, 100]} tick={axisTick} axisLine={false} tickLine={false} width={28} />
              <YAxis yAxisId="right" orientation="right" domain={[60, 80]} tick={axisTick} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<AdminChartTooltip formatter={(n, v) => (n === "Avg score" ? `${v}%` : `${v}% pass`)} />} />
              <Bar yAxisId="left" dataKey="pass" name="Pass rate" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="avg" name="Avg score" stroke="var(--chart-5)" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard className="col-span-12 md:col-span-6" title="Parent Connect engagement" hint="Active families %">
          <ResponsiveContainer width="100%" height={CHART_HEIGHT_SM}>
            <AreaChart data={parents} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="m" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis domain={[60, 85]} tick={axisTick} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<AdminChartTooltip formatter={(_, v) => `${v}%`} />} />
              <Area type="monotone" dataKey="v" name="Engagement" stroke="var(--chart-5)" fill="var(--chart-5)" fillOpacity={0.2} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard className="col-span-12 md:col-span-6" title="Complaint resolution SLA" hint="Resolved within SLA %">
          <ResponsiveContainer width="100%" height={CHART_HEIGHT_SM}>
            <LineChart data={sla} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="m" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis domain={[80, 100]} tick={axisTick} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<AdminChartTooltip formatter={(n, v) => (n === "Open" ? `${v} tickets` : `${v}%`)} />} />
              <ReferenceLine y={90} stroke="var(--chart-3)" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="resolved" name="SLA met" stroke="var(--chart-2)" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="open" name="Open" stroke="var(--chart-4)" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard className="col-span-12" title="Connect app adoption" hint="Monthly active users by portal">
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <LineChart data={connect} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="m" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis domain={[50, 100]} tick={axisTick} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<AdminChartTooltip formatter={(_, v) => `${v}%`} />} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="parent" name="Parent" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="teacher" name="Teacher" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="student" name="Student" stroke="var(--chart-5)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard className="col-span-12 lg:col-span-7" title="Subject performance" hint="Average score & pass rate">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={SUBJECT_PERFORMANCE} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="subject" tick={{ ...axisTick, fontSize: 9 }} width={72} axisLine={false} tickLine={false} />
              <Tooltip content={<AdminChartTooltip formatter={(n, v) => `${v}%`} />} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="avg" name="Avg score" fill="var(--chart-1)" radius={[0, 4, 4, 0]} barSize={10} />
              <Bar dataKey="pass" name="Pass rate" fill="var(--chart-2)" radius={[0, 4, 4, 0]} barSize={10} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard className="col-span-12 lg:col-span-5" title="Attendance by grade" hint="Current month">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={GRADE_ATTENDANCE} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="grade" tick={{ ...axisTick, fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis domain={[85, 100]} tick={axisTick} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<AdminChartTooltip formatter={(n, v) => (n === "Students" ? v.toLocaleString() : `${v}%`)} />} />
              <Bar dataKey="attendance" name="Attendance" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard className="col-span-12 lg:col-span-5" title="Branch comparison" hint="Attendance % by campus">
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <BarChart data={BRANCH_COMPARE_CHART} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
              <XAxis type="number" domain={[70, 100]} tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={axisTick} width={48} axisLine={false} tickLine={false} />
              <Tooltip content={<AdminChartTooltip formatter={(_, v) => `${v}%`} />} />
              <Bar dataKey="attendance" name="Attendance" radius={[0, 4, 4, 0]}>
                {BRANCH_COMPARE_CHART.map((_, i) => (
                  <Cell key={i} fill={["var(--chart-1)", "var(--chart-3)", "var(--chart-4)"][i] ?? "var(--chart-1)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard className="col-span-12 lg:col-span-7" title="Branch overview" hint="Students, attendance & growth">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-3 font-semibold">Branch</th>
                  <th className="py-3 font-semibold">Students</th>
                  <th className="py-3 font-semibold">Attendance</th>
                  <th className="py-3 font-semibold">YoY growth</th>
                  <th className="py-3 font-semibold">SLA</th>
                  <th className="py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {BRANCHES.map((b) => (
                  <tr key={b.id} className="hover:bg-surface-hover transition-colors">
                    <td className="py-3 font-medium">{b.name}</td>
                    <td className="py-3 font-mono">{b.students.toLocaleString()}</td>
                    <td className="py-3 font-mono">{b.attendance}%</td>
                    <td className={`py-3 font-mono ${b.growth >= 0 ? "text-success" : "text-destructive"}`}>
                      {b.growth >= 0 ? "+" : ""}
                      {b.growth}%
                    </td>
                    <td className="py-3 font-mono">{lastSla}%</td>
                    <td className="py-3">
                      <Pill tone={b.performance === "high" ? "success" : b.performance === "medium" ? "warning" : "danger"}>
                        {b.performance === "high" ? "High" : b.performance === "medium" ? "Medium" : "Low"}
                      </Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 flex items-start gap-2 text-[11px] text-muted-foreground">
            <AlertTriangle className="size-3.5 shrink-0 text-warning mt-0.5" />
            Demo data — charts update with term/year filters; branch filter applies to labels for preview.
          </p>
        </ChartCard>
      </div>
      </PageStack>
    </AppShell>
  );
}
