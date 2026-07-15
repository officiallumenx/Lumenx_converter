import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Kpi, Pill, Select } from "@lumenx/ui-admin";
import { ATTENDANCE_HEATMAP, MONTH_OPTIONS } from "@/lib/admin-analytics-data";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/attendance")({
  head: () => ({ meta: [{ title: "Attendance — LumenX Admin" }] }),
  component: AttendancePage,
});

const classRows = [
  { cls: "Grade 12-A", rate: 96, students: 38, trend: "+1.2%" },
  { cls: "Grade 11-A", rate: 94, students: 41, trend: "+0.4%" },
  { cls: "Grade 10-A", rate: 92, students: 44, trend: "−0.2%" },
  { cls: "Grade 9-B", rate: 88, students: 39, trend: "+0.8%" },
  { cls: "Grade 11-C", rate: 76, students: 36, trend: "−4.1%" },
  { cls: "Grade 9-A", rate: 71, students: 42, trend: "−6.3%" },
];

function heatColor(pct: number) {
  const alpha = Math.max(0.2, Math.min(1, pct / 100));
  return `oklch(0.65 0.18 254 / ${alpha})`;
}

function AttendancePage() {
  const [month, setMonth] = useState(MONTH_OPTIONS[1]!);
  const [classFilter, setClassFilter] = useState("all");

  const monthData = ATTENDANCE_HEATMAP[month] ?? {};
  const classes = Object.keys(monthData);
  const days = monthData[classes[0]!]?.length ?? 28;
  const dayLabels = Array.from({ length: days }, (_, i) => i + 1);

  const filteredClasses = useMemo(() => {
    if (classFilter === "all") return classes;
    return classes.filter((c) => c === classFilter);
  }, [classes, classFilter]);

  const filteredLeaderboard =
    classFilter === "all" ? classRows : classRows.filter((c) => c.cls === classFilter);

  return (
    <AppShell title="Attendance Monitoring" subtitle="Institute-wide rates and risk classes">
      <div className="lx-kpi-grid">
        <Kpi label="Institute Rate" value="94.2%" delta="−2.1%" tone="down" />
        <Kpi label="Critical Classes" value="3" delta="< 80%" tone="down" />
        <Kpi label="Teacher Presence" value="98.1%" delta="Stable" tone="up" />
        <Kpi label="On Leave" value="42" delta="Today" />
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-6 mb-4">
        <Select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-36 h-9 text-xs"
        >
          {MONTH_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
        <Select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="w-40 h-9 text-xs"
        >
          <option value="all">All classes</option>
          {classRows.map((c) => (
            <option key={c.cls} value={c.cls}>
              {c.cls}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-7">
          <CardHeader title="Monthly Attendance Heatmap" hint={`${month} · days × classes`} />
          <div className="px-5 pb-5 overflow-x-auto">
            <div className="min-w-[600px]">
              <div
                className="grid gap-1 mb-1"
                style={{ gridTemplateColumns: `100px repeat(${days}, minmax(12px, 1fr))` }}
              >
                <div />
                {dayLabels.map((d) => (
                  <div key={d} className="text-[8px] font-mono text-center text-muted-foreground">
                    {d}
                  </div>
                ))}
              </div>
              {filteredClasses.map((cls) => (
                <div
                  key={cls}
                  className="grid gap-1 items-center mb-1"
                  style={{ gridTemplateColumns: `100px repeat(${days}, minmax(12px, 1fr))` }}
                >
                  <div className="text-[10px] font-mono text-muted-foreground truncate">{cls}</div>
                  {(monthData[cls] ?? []).slice(0, days).map((v, j) => (
                    <div
                      key={j}
                      className="h-5 rounded"
                      style={{ background: heatColor(v) }}
                      title={`${v}%`}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-5 text-[10px] text-muted-foreground">
              <span>Low</span>
              <div className="flex gap-0.5">
                {[40, 60, 80, 95].map((v) => (
                  <div key={v} className="size-3 rounded" style={{ background: heatColor(v) }} />
                ))}
              </div>
              <span>High</span>
            </div>
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-5">
          <CardHeader title="Class Attendance Leaderboard" />
          <div className="px-5 pb-5 space-y-3">
            {filteredLeaderboard.map((c) => (
              <button
                key={c.cls}
                onClick={() => setClassFilter(c.cls)}
                className="w-full flex items-center justify-between hover:bg-surface-hover rounded-md px-2 py-1"
              >
                <div className="text-left">
                  <div className="text-xs font-medium">{c.cls}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {c.students} students · {c.trend}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-1.5 rounded bg-muted overflow-hidden">
                    <div
                      className={`h-full ${c.rate < 80 ? "bg-destructive" : c.rate < 90 ? "bg-warning" : "bg-success"}`}
                      style={{ width: `${c.rate}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono w-12 text-right">{c.rate}%</span>
                  {c.rate < 80 && <Pill tone="danger">Alert</Pill>}
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
