import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Kpi } from "@/components/ui-kit";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics — LumenX Admin" }] }),
  component: AnalyticsPage,
});

const months = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
const perf = [72, 74, 73, 78, 80, 79, 82, 85, 84];
const att = [88, 90, 92, 93, 91, 89, 92, 94, 94];

function AnalyticsPage() {
  const max = 100;
  const w = 100 / (months.length - 1);
  const pointsPerf = perf.map((v, i) => `${i * w},${100 - v}`).join(" ");
  const pointsAtt = att.map((v, i) => `${i * w},${100 - v}`).join(" ");

  return (
    <AppShell title="Analytics" subtitle="Institute growth and trend intelligence">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Avg GPA" value="3.42" delta="+0.18" tone="up" />
        <Kpi label="Pass Rate" value="92.6%" delta="+2.1%" tone="up" />
        <Kpi label="Parent Engagement" value="78%" delta="+12%" tone="up" />
        <Kpi label="Teacher Retention" value="96%" delta="Stable" />
      </div>

      <Card className="mt-6">
        <CardHeader title="Performance vs Attendance" hint="9-month moving correlation" />
        <div className="px-5 pb-5">
          <div className="relative h-72 w-full">
            <svg viewBox={`0 0 ${(months.length - 1) * w} 100`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
              {[20, 40, 60, 80].map((y) => <line key={y} x1="0" x2={(months.length - 1) * w} y1={y} y2={y} stroke="oklch(1 0 0 / 0.05)" strokeWidth="0.2" />)}
              <polyline fill="none" stroke="oklch(0.65 0.18 254)" strokeWidth="0.6" points={pointsPerf} vectorEffect="non-scaling-stroke" />
              <polyline fill="none" stroke="oklch(0.72 0.17 152)" strokeWidth="0.6" points={pointsAtt} vectorEffect="non-scaling-stroke" strokeDasharray="2 2" />
            </svg>
          </div>
          <div className="flex justify-between mt-3 text-[10px] font-mono text-muted-foreground">
            {months.map((m) => <span key={m}>{m}</span>)}
          </div>
          <div className="flex gap-5 mt-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-2"><i className="block w-3 h-0.5 bg-primary" /> Performance</span>
            <span className="flex items-center gap-2"><i className="block w-3 h-0.5 bg-success" style={{ borderTop: "1px dashed" }} /> Attendance</span>
          </div>
        </div>
      </Card>
    </AppShell>
  );
}
