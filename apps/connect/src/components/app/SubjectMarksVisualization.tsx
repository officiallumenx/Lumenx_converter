import { cn } from "@lumenx/ui";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from "recharts";
import {
  countPassFail,
  isPassing,
  PASS_MARK_THRESHOLD,
  passFailLabel,
} from "@/lib/marks-utils";

export type SubjectMarkRow = {
  subject: string;
  total: number;
  internal?: number;
  exam?: number;
  grade?: string;
};

export function SubjectMarksVisualization({
  marks,
  examLabel,
}: {
  marks: SubjectMarkRow[];
  examLabel?: string;
}) {
  const chartData = marks.map((m) => ({
    subject: m.subject,
    short: m.subject.length > 10 ? `${m.subject.slice(0, 8)}…` : m.subject,
    total: m.total,
    internal: m.internal ?? 0,
    exam: m.exam ?? m.total,
    passed: isPassing(m.total),
    grade: m.grade,
  }));

  const { passed, failed } = countPassFail(marks);
  const avg = marks.length
    ? Math.round(marks.reduce((s, m) => s + m.total, 0) / marks.length)
    : 0;

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">Subject-wise marks</h3>
          {examLabel && (
            <p className="text-xs text-muted-foreground mt-0.5">{examLabel}</p>
          )}
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
              {row.short}
            </div>
            <div className="mt-0.5 flex items-baseline justify-between gap-1">
              <span className="font-display text-lg font-semibold tabular-nums">
                {row.total}%
              </span>
              <PassFailPill total={row.total} />
            </div>
            {row.grade && (
              <div className="mt-0.5 text-[10px] text-muted-foreground">Grade {row.grade}</div>
            )}
          </div>
        ))}
      </div>

      <div className="h-72 w-full min-w-0 max-w-full rounded-xl border bg-muted/10 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 12, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.92 0.01 250)" />
            <XAxis
              dataKey="short"
              tickLine={false}
              axisLine={false}
              fontSize={11}
              stroke="oklch(0.5 0.02 260)"
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              fontSize={11}
              stroke="oklch(0.5 0.02 260)"
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
            <ReferenceLine
              y={PASS_MARK_THRESHOLD}
              stroke="oklch(0.65 0.15 85)"
              strokeDasharray="5 5"
              label={{
                value: `Pass (${PASS_MARK_THRESHOLD}%)`,
                position: "insideTopRight",
                fontSize: 10,
                fill: "oklch(0.55 0.12 85)",
              }}
            />
            <Bar dataKey="total" name="Score" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`bar-${index}`}
                  fill={
                    entry.passed ? "oklch(0.58 0.2 145)" : "oklch(0.58 0.22 25)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

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
