import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Kpi, Pill, Button } from "@/components/ui-kit";

export const Route = createFileRoute("/exams")({
  head: () => ({ meta: [{ title: "Exams & Marks — Luminexa Admin" }] }),
  component: ExamsPage,
});

const exams = [
  { name: "Mid-term Examination", grade: "All Grades", date: "Week 2 · 6 days", status: "scheduled", progress: 0 },
  { name: "Unit Test 3", grade: "Grade 10–12", date: "This week", status: "in-progress", progress: 64 },
  { name: "Pre-board Mock", grade: "Grade 12", date: "Last week", status: "grading", progress: 82 },
  { name: "Term 1 Final", grade: "All Grades", date: "Completed", status: "published", progress: 100 },
];

function ExamsPage() {
  return (
    <AppShell title="Exams & Marks" subtitle="Monitor exams, grading progress, and result publication">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Upcoming" value="6" delta="Next 30 days" />
        <Kpi label="Pending Grading" value="284" delta="Across 12 teachers" tone="down" />
        <Kpi label="Avg Score" value="78.4%" delta="+3.2%" tone="up" />
        <Kpi label="Published" value="14" delta="This term" />
      </div>

      <Card className="mt-6">
        <CardHeader title="Examination Pipeline" action={<Button variant="primary">Schedule Exam</Button>} />
        <div className="px-5 pb-5 divide-y divide-border">
          {exams.map((e) => (
            <div key={e.name} className="py-4 first:pt-0 last:pb-0 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium">{e.name}</div>
                  {e.status === "scheduled" && <Pill tone="info">Scheduled</Pill>}
                  {e.status === "in-progress" && <Pill tone="warning">In progress</Pill>}
                  {e.status === "grading" && <Pill tone="warning">Grading</Pill>}
                  {e.status === "published" && <Pill tone="success">Published</Pill>}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">{e.grade} · {e.date}</div>
              </div>
              <div className="w-48 hidden md:block">
                <div className="h-1.5 rounded bg-muted overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${e.progress}%` }} />
                </div>
                <div className="text-[10px] text-muted-foreground font-mono mt-1 text-right">{e.progress}%</div>
              </div>
              <Button>View</Button>
            </div>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}
