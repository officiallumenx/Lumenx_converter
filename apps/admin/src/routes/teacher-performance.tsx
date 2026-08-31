import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Button, Pill, Kpi } from "@lumenx/ui-admin";
import { TEACHER_PERFORMANCE } from "@/lib/admin-module-data";
import { TrendingUp, Award, FileDown } from "lucide-react";
import { ADMIN_MODULE_LABELS as M, adminPageTitle } from "@/lib/admin-module-labels";
import { isApiAuthMode } from "@/auth/auth-mode";
import { TeacherPerformanceApiPanel } from "@/components/teacher-performance/TeacherPerformanceApiPanel";
import { useMemo } from "react";

export const Route = createFileRoute("/teacher-performance")({
  head: () => ({ meta: [{ title: adminPageTitle("/teacher-performance") }] }),
  component: TeacherPerformancePage,
});

function TeacherPerformanceDemoPage() {
  const top = TEACHER_PERFORMANCE[0]!;
  const depts = [...new Set(TEACHER_PERFORMANCE.map((t) => t.dept))];

  const instituteAvg = useMemo(() => {
    const sum = TEACHER_PERFORMANCE.reduce((a, t) => a + t.rating, 0);
    return (sum / TEACHER_PERFORMANCE.length).toFixed(2);
  }, []);

  return (
    <AppShell
      title={M.performance}
      subtitle={`Student feedback & trends · analytics only · exports are in ${M.reports}`}
      actions={
        <Link to="/reports">
          <Button variant="outline">
            <FileDown className="size-3.5" /> {M.reports}
          </Button>
        </Link>
      }
    >
      <div className="lx-kpi-grid">
        <Kpi
          label="Institute avg"
          value={instituteAvg}
          delta="+0.08"
          tone="up"
          icon={<TrendingUp className="size-3.5" />}
        />
        <Kpi
          label="Top rated"
          value={top.name.split(" ")[0]!}
          delta={`${top.rating}`}
          tone="up"
          icon={<Award className="size-3.5" />}
        />
        <Kpi label="Departments" value={String(depts.length)} />
        <Kpi label="Faculty count" value={String(TEACHER_PERFORMANCE.length)} delta="Rated" />
      </div>

      <div className="grid grid-cols-12 gap-4 mt-6">
        <Card className="col-span-12 lg:col-span-8">
          <CardHeader title="Monthly rankings" hint="Aggregated student feedback" />
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background/40 border-b border-border">
                  <th className="px-5 py-3 font-semibold">Rank</th>
                  <th className="px-5 py-3 font-semibold">Teacher</th>
                  <th className="px-5 py-3 font-semibold">Department</th>
                  <th className="px-5 py-3 font-semibold">Rating</th>
                  <th className="px-5 py-3 font-semibold">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {TEACHER_PERFORMANCE.map((t) => (
                  <tr key={t.id} className="hover:bg-surface-hover">
                    <td className="px-5 py-3 text-xs font-mono">#{t.rank}</td>
                    <td className="px-5 py-3 text-xs font-medium">{t.name}</td>
                    <td className="px-5 py-3 text-xs">{t.dept}</td>
                    <td className="px-5 py-3 text-xs font-mono">{t.rating}</td>
                    <td className="px-5 py-3">
                      <Pill tone={t.trend.startsWith("+") ? "success" : "danger"}>{t.trend}</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing 1–{TEACHER_PERFORMANCE.length} of {TEACHER_PERFORMANCE.length}
            </span>
            <div className="flex gap-1">
              <Button size="sm" disabled>
                Previous
              </Button>
              <Button size="sm" disabled>
                Next
              </Button>
            </div>
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-4">
          <CardHeader title="Department rankings" />
          <div className="px-5 pb-5 space-y-3">
            {depts.map((d) => {
              const deptTeachers = TEACHER_PERFORMANCE.filter((t) => t.dept === d);
              const avg = deptTeachers.reduce((a, t) => a + t.rating, 0) / deptTeachers.length;
              return (
                <div key={d}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{d}</span>
                    <span className="font-mono">{avg.toFixed(2)}</span>
                  </div>
                  <div className="h-1.5 rounded bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${(avg / 5) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Performance trends" hint="Term-over-term · demo chart placeholder" />
        <div className="px-5 pb-5 h-40 flex items-end gap-2">
          {[4.2, 4.35, 4.41, 4.52, 4.58, 4.62, 4.68].map((v, i) => (
            <div
              key={i}
              className="flex-1 bg-primary/30 rounded-t-md hover:bg-primary/50 transition-colors"
              style={{ height: `${(v / 5) * 100}%` }}
            />
          ))}
        </div>
        <div className="px-5 pb-5 flex justify-between text-[10px] font-mono text-muted-foreground">
          {["T1", "T2", "T3", "T4", "T5", "T6", "T7"].map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}

function TeacherPerformancePage() {
  if (isApiAuthMode()) {
    return (
      <AppShell
        title={M.performance}
        subtitle={`Operational faculty index · analytics only · exports are in ${M.reports}`}
      >
        <TeacherPerformanceApiPanel />
      </AppShell>
    );
  }
  return <TeacherPerformanceDemoPage />;
}
