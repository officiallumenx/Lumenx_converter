import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Button, Pill } from "@lumenx/ui-admin";
import { ArrowLeft, Mail, Phone, KeyRound, Power, Edit3, BookOpen, Users } from "lucide-react";

export const Route = createFileRoute("/students/$id")({
  head: ({ params }) => ({ meta: [{ title: `${params.id} — LumenX Admin` }] }),
  component: StudentProfile,
});

function StudentProfile() {
  const { id } = Route.useParams();
  return (
    <AppShell title="Student Profile" subtitle={`Record · ${id}`}
      actions={<>
        <Link to="/students" className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-md text-xs font-medium bg-surface border border-border hover:bg-surface-hover"><ArrowLeft className="size-3.5" /> Back</Link>
        <Button><Edit3 className="size-3.5" /> Edit</Button>
        <Button variant="danger"><Power className="size-3.5" /> Suspend</Button>
      </>}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-6 lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="size-20 rounded-full bg-gradient-to-br from-primary/30 to-chart-5/30 ring-4 ring-border flex items-center justify-center text-lg font-semibold">AS</div>
            <h2 className="mt-4 text-base font-semibold">Aanya Sharma</h2>
            <div className="text-[11px] text-muted-foreground font-mono">{id} · Grade 10-A</div>
            <Pill tone="success">Active</Pill>
          </div>
          <div className="mt-6 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground"><Mail className="size-3.5" /> aanya@LUMENX ADMIN.edu</div>
            <div className="flex items-center gap-2 text-muted-foreground"><Phone className="size-3.5" /> +91 98765 11020</div>
            <div className="flex items-center gap-2 text-muted-foreground"><Users className="size-3.5" /> Guardian: Rohan Sharma</div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <Button><KeyRound className="size-3.5" /> Reset</Button>
            <Button>Message</Button>
          </div>
        </Card>

        <div className="lg:col-span-2 grid grid-cols-1 gap-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { l: "Attendance", v: "96%" },
              { l: "GPA", v: "3.8" },
              { l: "Assignments", v: "42/45" },
              { l: "Complaints", v: "0" },
            ].map((s) => (
              <Card key={s.l} className="p-4">
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{s.l}</div>
                <div className="mt-1 text-xl font-semibold">{s.v}</div>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader title="Enrolled subjects" hint="Term 2 · 2026" action={<Button>Manage</Button>} />
            <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {["Mathematics · S. Jenkins", "Physics · D. Koal", "Biology · P. Iyer", "English · M. Whitfield", "Chemistry · H. Suzuki", "History · O. Faris"].map((s) => (
                <div key={s} className="flex items-center gap-2 px-3 h-10 rounded-md bg-background/40 border border-border text-xs">
                  <BookOpen className="size-3.5 text-primary" />{s}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Lifecycle timeline" />
            <div className="px-5 pb-5 space-y-3">
              {[
                { d: "Apr 2024", t: "Admitted to Grade 9-A" },
                { d: "Jun 2024", t: "Promoted to Grade 9-A (continued)" },
                { d: "Apr 2025", t: "Section transfer 9-B → 10-A" },
                { d: "Mar 2026", t: "Awarded merit scholarship" },
              ].map((e) => (
                <div key={e.t} className="flex gap-3 text-xs">
                  <div className="w-20 text-muted-foreground font-mono">{e.d}</div>
                  <div className="flex-1">{e.t}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
