/**
 * Attendance Analytics — charts & insights only. No exports.
 */

import { Link } from "@tanstack/react-router";
import {
  AdminChartTooltip,
  CHART_HEIGHT,
  ChartCard,
  axisTick,
  gridStroke,
} from "@/components/analytics/chart-utils";
import { Card, CardHeader, Kpi, PageStack, Pill } from "@lumenx/ui-admin";
import { ADMIN_MODULE_LABELS as M } from "@/lib/admin-module-labels";
import {
  buildAttendanceTrends,
  buildFrequentlyAbsentStudents,
  buildLowAttendanceSections,
} from "@lumenx/module-attendance";
import {
  attendanceReportRangeDefaults,
  listAttendanceReportSections,
} from "@/lib/attendance-report-demo";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function AttendanceAnalyticsView() {
  const range = useMemo(() => attendanceReportRangeDefaults(), []);
  const sections = useMemo(() => listAttendanceReportSections(), []);

  const trends = useMemo(
    () =>
      buildAttendanceTrends({
        sections,
        from: range.from,
        to: range.to,
      }),
    [sections, range.from, range.to],
  );

  const lowSections = useMemo(
    () =>
      buildLowAttendanceSections({
        sections,
        from: range.monthStart,
        to: range.to,
        thresholdPct: 90,
        criticalPct: 80,
      }),
    [sections, range.monthStart, range.to],
  );

  const frequentAbsent = useMemo(
    () =>
      buildFrequentlyAbsentStudents({
        sections,
        from: range.monthStart,
        to: range.to,
        minAbsentSlots: 1,
        limit: 12,
      }),
    [sections, range.monthStart, range.to],
  );

  const latestTrend = trends[trends.length - 1];
  const criticalCount = lowSections.filter((s) => s.status === "critical").length;

  return (
    <PageStack>
      <Card>
        <CardHeader
          title="Attendance Analytics"
          hint={`Live insights only · downloads are in ${M.reports}`}
          action={
            <Link to="/reports" className="text-xs font-medium text-primary hover:underline">
              Open {M.reports}
            </Link>
          }
        />
        <div className="px-5 pb-4 text-xs text-muted-foreground">
          Analytics = charts and insight lists only (no tabular builders, no file exports). Reports
          stay under{" "}
          <Link to="/attendance" search={{ view: "reports" }} className="font-medium text-primary hover:underline">
            Reports
          </Link>
          .
        </div>
      </Card>

      <div className="lx-kpi-grid">
        <Kpi label="Latest month %" value={`${latestTrend?.attendancePct ?? "—"}%`} />
        <Kpi label="Low sections" value={String(lowSections.length)} />
        <Kpi label="Critical sections" value={String(criticalCount)} />
        <Kpi label="Frequent absentees" value={String(frequentAbsent.length)} />
      </div>

      <ChartCard
        title="Attendance Trends"
        hint={`${range.from} → ${range.to} · institute aggregate`}
      >
        <div style={{ height: CHART_HEIGHT }} className="w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trends} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="att-trend-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis domain={[60, 100]} tick={axisTick} tickLine={false} axisLine={false} width={36} />
              <Tooltip content={<AdminChartTooltip />} />
              <Area
                type="monotone"
                dataKey="attendancePct"
                name="Attendance %"
                stroke="var(--primary)"
                fill="url(#att-trend-fill)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Low Attendance"
            hint="Sections below 90% this month"
            action={<Pill tone="warning">{lowSections.length}</Pill>}
          />
          <div className="px-4 pb-4 sm:px-5">
            {lowSections.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sections below the threshold.</p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {lowSections.map((row) => (
                  <li
                    key={row.sectionKey}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="font-medium">{row.label}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {row.absentSlots} absent slots · {row.workingDays} working days
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-mono text-xs font-semibold">{row.attendancePct}%</span>
                      <Pill tone={row.status === "critical" ? "danger" : "warning"}>
                        {row.status === "critical" ? "Critical" : "Watch"}
                      </Pill>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Frequently Absent"
            hint="Highest absent slot counts this month"
            action={<Pill tone="danger">{frequentAbsent.length}</Pill>}
          />
          <div className="px-4 pb-4 sm:px-5">
            {frequentAbsent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No frequent absences in range.</p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {frequentAbsent.map((row) => (
                  <li
                    key={`${row.sectionKey}:${row.studentId}`}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{row.studentName}</div>
                      <div className="text-[11px] text-muted-foreground">{row.label}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-mono text-xs font-semibold">{row.absentSlots} absent</div>
                      <div className="text-[11px] text-muted-foreground">{row.attendancePct}%</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </PageStack>
  );
}
