import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, Button, Pill, Modal, Field, TextInput, Select } from "@lumenx/ui-admin";
import { Plus, Mail, KeyRound, UserPlus } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/teachers")({
  head: () => ({ meta: [{ title: "Teachers — LumenX Nexus" }] }),
  component: TeachersPage,
});

const teachers = [
  { name: "Sarah Jenkins", dept: "Mathematics", classes: 6, workload: 82, rating: 4.8, status: "active" },
  { name: "David Koal", dept: "Physics", classes: 5, workload: 74, rating: 4.6, status: "active" },
  { name: "Priya Iyer", dept: "Biology", classes: 4, workload: 62, rating: 4.9, status: "active" },
  { name: "Marcus Whitfield", dept: "English", classes: 7, workload: 91, rating: 4.4, status: "overloaded" },
  { name: "Hana Suzuki", dept: "Chemistry", classes: 5, workload: 70, rating: 4.7, status: "active" },
  { name: "Omar Faris", dept: "History", classes: 3, workload: 48, rating: 4.2, status: "underloaded" },
];

function TeachersPage() {
  const [open, setOpen] = useState(false);
  return (
    <AppShell title="Academic Staff" subtitle="186 teachers · 12 departments"
      actions={<Button variant="primary" onClick={() => setOpen(true)}><Plus className="size-3.5" /> Add Teacher</Button>}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teachers.map((t) => (
          <Card key={t.name} className="p-5 hover:bg-surface-hover transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-full bg-gradient-to-br from-primary/30 to-chart-5/30 ring-2 ring-border flex items-center justify-center text-xs font-semibold">
                  {t.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-[11px] text-muted-foreground">{t.dept}</div>
                </div>
              </div>
              {t.status === "active" && <Pill tone="success">Active</Pill>}
              {t.status === "overloaded" && <Pill tone="danger">Overloaded</Pill>}
              {t.status === "underloaded" && <Pill tone="warning">Underloaded</Pill>}
            </div>
            <div className="grid grid-cols-3 gap-3 mt-5">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Classes</div>
                <div className="text-base font-semibold mt-1">{t.classes}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Workload</div>
                <div className="text-base font-semibold mt-1">{t.workload}%</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Rating</div>
                <div className="text-base font-semibold mt-1">{t.rating}</div>
              </div>
            </div>
            <div className="mt-5 h-1 rounded bg-muted overflow-hidden">
              <div className={`h-full ${t.workload > 85 ? "bg-destructive" : t.workload > 60 ? "bg-primary" : "bg-warning"}`} style={{ width: `${t.workload}%` }} />
            </div>
            <div className="flex gap-2 mt-5">
              <Button className="flex-1 justify-center"><Mail className="size-3" /> Message</Button>
              <Button className="flex-1 justify-center"><KeyRound className="size-3" /> Reset</Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Onboard teacher" subtitle="Create faculty record, portal access and timetable assignment" size="lg"
        footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" onClick={() => setOpen(false)}><UserPlus className="size-3.5" /> Onboard</Button></>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full name" required><TextInput placeholder="Dr. Maya Robinson" /></Field>
          <Field label="Department" required><Select><option>Mathematics</option><option>Physics</option><option>Biology</option><option>Chemistry</option><option>English</option><option>History</option></Select></Field>
          <Field label="Email" required><TextInput type="email" placeholder="faculty@institute.edu" /></Field>
          <Field label="Phone"><TextInput placeholder="+1 555 010 4521" /></Field>
          <Field label="Subjects" hint="Comma separated"><TextInput placeholder="MTH-101, MTH-204" /></Field>
          <Field label="Workload target"><Select><option>Light · ≤60%</option><option>Balanced · 60–80%</option><option>Heavy · 80–95%</option></Select></Field>
          <Field label="Portal access"><Select><option>Faculty + Grading</option><option>Faculty only</option><option>Read-only</option></Select></Field>
          <Field label="Credentials"><Select><option>Email invite</option><option>Generate temp password</option><option>Skip for now</option></Select></Field>
        </div>
      </Modal>
    </AppShell>
  );
}
