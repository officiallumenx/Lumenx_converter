import { memo, useMemo } from "react";
import { cn } from "@lumenx/ui";
import { BarChart3 } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { countPassFail, isPassing, PASS_MARK_THRESHOLD, passFailLabel } from "@/lib/marks-utils";
import { prefersReducedMotion } from "@/lib/prefers-reduced-motion";
import {
  SubjectChartAxisTick,
  getSubjectChartAxisHeightForSubjects,
  subjectChartLabel,
} from "@/components/app/marks-chart-axis";

export type SubjectMarkRow = {
  subject: string;
  total: number;
  internal?: number;
  exam?: number;
  grade?: string;
};

export const SubjectMarksVisualization = memo(function SubjectMarksVisualization({
  marks,
  examLabel,
}: {
  marks: SubjectMarkRow[];
  examLabel?: string;
}) {
  const chartData = useMemo(
    () =>
      marks.map((m) => ({
        subject: m.subject,
        total: m.total,
        internal: m.internal ?? 0,
        // Derive exam from total − internal when not supplied, so the tooltip never shows
        // the aggregate total in the "Exam /80" slot (which would exceed 80).
        exam: m.exam ?? Math.max(0, m.total - (m.internal ?? 0)),
        passed: isPassing(m.total),
        grade: m.grade,
      })),
    [marks],
  );

  const { passed, failed } = useMemo(() => countPassFail(marks), [marks]);
  const avg = useMemo(
    () => (marks.length ? Math.round(marks.reduce((s, m) => s + m.total, 0) / marks.length) : 0),
    [marks],
  );

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <BarChart3 className="size-4 text-primary shrink-0" />
            Subject-wise marks
          </h3>
          {examLabel && <p className="text-xs text-muted-foreground mt-0.5 pl-6">{examLabel}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-success" />
            {passed} passed
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-destructive" />
            {failed} failed
          </span>
          <span className="tabular-nums">Avg {avg}%</span>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {chartData.map((row) => (
          <div
            key={row.subject}
            className={cn(
              "rounded-xl border p-2.5 transition-colors",
              row.passed
                ? "border-success/25 bg-success/5"
                : "border-destructive/25 bg-destructive/5",
            )}
          >
            <div className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {subjectChartLabel(row.subject)}
            </div>
            <div className="mt-0.5 flex items-baseline justify-between gap-1">
              <span className="font-display text-lg font-semibold tabular-nums">{row.total}%</span>
              <PassFailPill total={row.total} />
            </div>
            {row.grade && (
              <div className="mt-0.5 text-[10px] text-muted-foreground">Grade {row.grade}</div>
            )}
          </div>
        ))}
      </div>

      <div className="h-72 w-full min-w-0 max-w-full overflow-hidden rounded-xl bg-muted/10 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 12, right: 16, left: 4, bottom: 4 }}
            barCategoryGap="14%"
            barGap={2}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="subject"
              tickLine={false}
              axisLine={false}
              tick={SubjectChartAxisTick}
              interval={0}
              height={getSubjectChartAxisHeightForSubjects(chartData.map((d) => d.subject))}
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              fontSize={11}
              stroke="var(--muted-foreground)"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as (typeof chartData)[number];
                return (
                  <div className="rounded-xl border bg-popover px-3 py-2 text-xs shadow-md">
                    <div className="font-medium">{row.subject}</div>
                    <div className="mt-1 space-y-0.5 text-muted-foreground">
                      <div>Total: {row.total}/100</div>
                      {row.internal > 0 && (
                        <div>
                          Internal: {row.internal}/20 · Exam: {row.exam}/80
                        </div>
                      )}
                      <div className={row.passed ? "text-success" : "text-destructive"}>
                        {passFailLabel(row.total)}
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="total"
              name="Score"
              radius={[8, 8, 0, 0]}
              isAnimationActive={!prefersReducedMotion()}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`bar-${index}`}
                  fill={entry.passed ? "oklch(0.58 0.2 145)" : "oklch(0.58 0.22 25)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-muted-foreground">Pass mark: {PASS_MARK_THRESHOLD}% per subject</p>
    </div>
  );
});

function PassFailPill({ total }: { total: number }) {
  const passed = isPassing(total);
  return (
    <span
      className={cn(
        "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
        passed ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
      )}
    >
      {passFailLabel(total)}
    </span>
  );
}
