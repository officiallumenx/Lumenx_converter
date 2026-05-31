import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, Button, Pill } from "@/components/ui-kit";
import { Lock, FileText } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/complaints")({
  head: () => ({ meta: [{ title: "Complaints — LumenX Nexus" }] }),
  component: ComplaintsPage,
});

const complaints = [
  { id: "CMP-201", title: "Broken HVAC in Block B", from: "Prof. Sterling", role: "Teacher", priority: "P0", status: "pending", time: "2m ago", body: "AC unit in classroom 204 has failed for the third day. Affecting exam preparation." },
  { id: "CMP-200", title: "Bullying incident — Grade 9-B", from: "Anonymous Parent", role: "Parent", priority: "P0", status: "review", time: "1h ago", body: "Repeated incidents reported by multiple parents. Evidence attached." },
  { id: "CMP-199", title: "Cafeteria food quality", from: "Student Council", role: "Student", priority: "P2", status: "pending", time: "3h ago", body: "Quality has deteriorated over the past week. Petition signed by 80 students." },
  { id: "CMP-198", title: "Transport delays — Route 7", from: "K. Patel (parent)", role: "Parent", priority: "P1", status: "review", time: "Yesterday", body: "Bus consistently 25+ minutes late. Children waiting in extreme weather." },
  { id: "CMP-197", title: "Library access request", from: "External Research", role: "External", priority: "P3", status: "resolved", time: "2d ago", body: "Resolved — access approved through Director's office." },
];

const cols: { key: typeof complaints[number]["status"]; label: string; tone: "warning" | "info" | "success" }[] = [
  { key: "pending", label: "Pending", tone: "warning" },
  { key: "review", label: "Under Review", tone: "info" },
  { key: "resolved", label: "Resolved", tone: "success" },
];

function ComplaintsPage() {
  const [active, setActive] = useState(complaints[0]);
  return (
    <AppShell title="Complaint Triage" subtitle="Confidential · Principal & root admins only"
      actions={<Button><Lock className="size-3.5" /> Privacy log</Button>}
    >
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {cols.map((col) => {
            const items = complaints.filter((c) => c.status === col.key);
            return (
              <div key={col.key} className="bg-surface border border-border rounded-xl p-3 min-h-[420px]">
                <div className="flex items-center justify-between px-2 pb-3">
                  <div className="flex items-center gap-2">
                    <Pill tone={col.tone}>{col.label}</Pill>
                    <span className="text-[10px] text-muted-foreground font-mono">{items.length}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {items.map((c) => (
                    <button key={c.id} onClick={() => setActive(c)}
                      className={`w-full text-left rounded-lg p-3 border transition-colors ${
                        active.id === c.id ? "bg-elevated border-primary/30" : "bg-background/40 border-border hover:bg-surface-hover"
                      }`}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Pill tone={c.priority === "P0" ? "danger" : c.priority === "P1" ? "warning" : "neutral"}>{c.priority}</Pill>
                        <span className="text-[10px] text-muted-foreground ml-auto">{c.time}</span>
                      </div>
                      <div className="text-xs font-medium leading-snug">{c.title}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{c.from} · {c.role}</div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <Card className="col-span-12 lg:col-span-4 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Pill tone={active.priority === "P0" ? "danger" : "warning"}>{active.priority}</Pill>
            <Pill tone="info">{active.role}</Pill>
            <span className="ml-auto text-[10px] text-muted-foreground font-mono">{active.id}</span>
          </div>
          <h2 className="text-base font-semibold leading-tight">{active.title}</h2>
          <p className="text-[11px] text-muted-foreground mt-1">From {active.from} · {active.time}</p>
          <div className="mt-4 p-4 rounded-lg bg-background/40 border border-border text-xs leading-relaxed text-muted-foreground">
            {active.body}
          </div>
          <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
            <FileText className="size-3.5" /> 2 attachments · 0 comments
          </div>
          <div className="flex gap-2 mt-5">
            <Button variant="primary" className="flex-1 justify-center">Mark Resolved</Button>
            <Button className="flex-1 justify-center">Move to Review</Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
