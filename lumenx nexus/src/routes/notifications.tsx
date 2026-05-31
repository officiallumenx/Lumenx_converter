import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Button, Pill } from "@/components/ui-kit";
import { Send, Users, GraduationCap, Heart, Bell } from "lucide-react";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Luminexa Admin" }] }),
  component: NotificationsPage,
});

const recent = [
  { title: "Exam schedule released — Term 2", audience: "All Students, All Parents", time: "2h", priority: "high" },
  { title: "PTM rescheduled to Saturday", audience: "Grade 9–10 Parents", time: "Yesterday", priority: "normal" },
  { title: "Sports day participation form", audience: "All Students", time: "2d", priority: "normal" },
  { title: "Emergency: School closed tomorrow", audience: "Everyone", time: "1w", priority: "critical" },
];

function NotificationsPage() {
  return (
    <AppShell title="Notification Center" subtitle="Targeted announcements & emergency alerts">
      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-7">
          <CardHeader title="Compose Broadcast" />
          <div className="px-5 pb-5 space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Title</label>
              <input placeholder="e.g. Mid-term exam schedule" className="mt-1 w-full h-10 px-3 rounded-md bg-background border border-border text-sm focus:outline-none focus:border-primary/40" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Message</label>
              <textarea rows={4} placeholder="Write your announcement…" className="mt-1 w-full px-3 py-2 rounded-md bg-background border border-border text-sm focus:outline-none focus:border-primary/40 resize-none" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Audience</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                {[
                  { icon: Users, label: "Students" },
                  { icon: GraduationCap, label: "Teachers" },
                  { icon: Heart, label: "Parents" },
                  { icon: Bell, label: "All" },
                ].map((a) => (
                  <button key={a.label} className="flex items-center justify-center gap-2 h-10 rounded-md border border-border bg-background hover:bg-surface-hover text-xs font-medium">
                    <a.icon className="size-3.5" /> {a.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Priority</label>
                <select className="mt-1 w-full h-10 px-3 rounded-md bg-background border border-border text-sm focus:outline-none focus:border-primary/40">
                  <option>Normal</option>
                  <option>High</option>
                  <option>Critical (Push)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Schedule</label>
                <select className="mt-1 w-full h-10 px-3 rounded-md bg-background border border-border text-sm focus:outline-none focus:border-primary/40">
                  <option>Send now</option>
                  <option>Schedule for later</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button>Save draft</Button>
              <Button variant="primary"><Send className="size-3.5" /> Send broadcast</Button>
            </div>
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-5">
          <CardHeader title="Recent Broadcasts" />
          <div className="px-5 pb-5 divide-y divide-border">
            {recent.map((n, i) => (
              <div key={i} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2 mb-1">
                  {n.priority === "critical" && <Pill tone="danger">Critical</Pill>}
                  {n.priority === "high" && <Pill tone="warning">High</Pill>}
                  {n.priority === "normal" && <Pill tone="info">Normal</Pill>}
                  <span className="text-[10px] text-muted-foreground ml-auto">{n.time}</span>
                </div>
                <div className="text-xs font-medium">{n.title}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">→ {n.audience}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
