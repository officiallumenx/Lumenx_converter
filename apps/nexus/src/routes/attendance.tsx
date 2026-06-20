import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Kpi, Pill } from "@lumenx/ui-admin";

export const Route = createFileRoute("/attendance")({
  head: () => ({ meta: [{ title: "Attendance — LumenX Nexus" }] }),
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

const heat = Array.from({ length: 6 }, (_, r) =>
  Array.from({ length: 12 }, (_, c) => 0.4 + ((r * 7 + c * 3) % 12) / 20)
);

function AttendancePage() {
  return (
    <AppShell title="Attendance Monitoring" subtitle="Institute-wide rates and risk classes">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Institute Rate" value="94.2%" delta="−2.1%" tone="down" />
        <Kpi label="Critical Classes" value="3" delta="< 80%" tone="down" />
        <Kpi label="Teacher Presence" value="98.1%" delta="Stable" tone="up" />
        <Kpi label="On Leave" value="42" delta="Today" />
      </div>

      <div className="grid grid-cols-12 gap-4 mt-6">
        <Card className="col-span-12 lg:col-span-7">
          <CardHeader title="Attendance Heatmap" hint="Last 12 weeks × 6 classes" />
          <div className="px-5 pb-5">
            <div className="space-y-1.5">
              {classRows.slice(0, 6).map((r, i) => (
                <div key={r.cls} className="grid gap-1.5 items-center" style={{ gridTemplateColumns: "100px repeat(12, minmax(0, 1fr))" }}>
                  <div className="text-[10px] font-mono text-muted-foreground">{r.cls}</div>
                  {heat[i].map((v, j) => (
                    <div key={j} className="h-6 rounded" style={{ background: `oklch(0.65 0.18 254 / ${v})` }} />
                  ))}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-5 text-[10px] text-muted-foreground">
              <span>Low</span>
              <div className="flex gap-0.5">
                {[0.3, 0.5, 0.7, 0.9].map((v) => <div key={v} className="size-3 rounded" style={{ background: `oklch(0.65 0.18 254 / ${v})` }} />)}
              </div>
              <span>High</span>
            </div>
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-5">
          <CardHeader title="Class Attendance Leaderboard" />
          <div className="px-5 pb-5 space-y-3">
            {classRows.map((c) => (
              <div key={c.cls} className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium">{c.cls}</div>
                  <div className="text-[10px] text-muted-foreground">{c.students} students · {c.trend}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-1.5 rounded bg-muted overflow-hidden">
                    <div className={`h-full ${c.rate < 80 ? "bg-destructive" : c.rate < 90 ? "bg-warning" : "bg-success"}`} style={{ width: `${c.rate}%` }} />
                  </div>
                  <span className="text-xs font-mono w-12 text-right">{c.rate}%</span>
                  {c.rate < 80 && <Pill tone="danger">Alert</Pill>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
