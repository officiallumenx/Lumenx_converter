import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Button, Pill, Field, TextInput, TextArea, Select } from "@lumenx/ui-admin";
import { Send, Users, GraduationCap, Heart, Bell } from "lucide-react";
import { useState } from "react";
import { useAdminToast } from "@/components/AdminActionToast";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — LumenX Admin" }] }),
  component: NotificationsPage,
});

type Broadcast = {
  id: string;
  title: string;
  audience: string;
  time: string;
  priority: "normal" | "high" | "critical";
};

const INITIAL: Broadcast[] = [
  { id: "1", title: "Exam schedule released — Term 2", audience: "All Students, All Parents", time: "2h ago", priority: "high" },
  { id: "2", title: "PTM rescheduled to Saturday", audience: "Grade 9–10 Parents", time: "Yesterday", priority: "normal" },
  { id: "3", title: "Sports day participation form", audience: "All Students", time: "2d ago", priority: "normal" },
  { id: "4", title: "Emergency: School closed tomorrow", audience: "Everyone", time: "1w ago", priority: "critical" },
];

const AUDIENCES = ["Students", "Teachers", "Parents", "All"] as const;

function NotificationsPage() {
  const notify = useAdminToast();
  const [recent, setRecent] = useState(INITIAL);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<(typeof AUDIENCES)[number]>("All");
  const [priority, setPriority] = useState<"normal" | "high" | "critical">("normal");
  const [schedule, setSchedule] = useState<"now" | "later">("now");

  const send = () => {
    if (!title.trim()) return;
    const entry: Broadcast = {
      id: String(Date.now()),
      title: title.trim(),
      audience: audience === "All" ? "Everyone" : `All ${audience}`,
      time: schedule === "now" ? "Just now" : "Scheduled",
      priority,
    };
    setRecent((prev) => [entry, ...prev]);
    setTitle("");
    setMessage("");
    notify(
      schedule === "now"
        ? `Broadcast sent to ${entry.audience} · ${priority} priority`
        : `Broadcast scheduled for ${entry.audience}`,
    );
  };

  return (
    <AppShell title="Notification Center" subtitle="Targeted announcements & emergency alerts">
      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-7">
          <CardHeader title="Compose Broadcast" />
          <div className="px-5 pb-5 space-y-4">
            <Field label="Title" required>
              <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Mid-term exam schedule" />
            </Field>
            <Field label="Message">
              <TextArea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write your announcement…" />
            </Field>
            <Field label="Audience">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
                {[
                  { icon: Users, label: "Students" as const },
                  { icon: GraduationCap, label: "Teachers" as const },
                  { icon: Heart, label: "Parents" as const },
                  { icon: Bell, label: "All" as const },
                ].map((a) => {
                  const Icon = a.icon;
                  const active = audience === a.label;
                  return (
                    <button
                      key={a.label}
                      type="button"
                      onClick={() => setAudience(a.label)}
                      className={`flex items-center justify-center gap-2 h-10 rounded-md border text-xs font-medium transition-colors ${
                        active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:bg-surface-hover"
                      }`}
                    >
                      <Icon className="size-3.5" /> {a.label}
                    </button>
                  );
                })}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Priority">
                <Select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="critical">Critical (Push)</option>
                </Select>
              </Field>
              <Field label="Schedule">
                <Select value={schedule} onChange={(e) => setSchedule(e.target.value as typeof schedule)}>
                  <option value="now">Send now</option>
                  <option value="later">Schedule for later</option>
                </Select>
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={() => notify("Draft saved")}>Save draft</Button>
              <Button variant="primary" onClick={send} disabled={!title.trim()}>
                <Send className="size-3.5" /> Send broadcast
              </Button>
            </div>
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-5">
          <CardHeader title="Recent Broadcasts" />
          <div className="px-5 pb-5 divide-y divide-border">
            {recent.map((n) => (
              <div key={n.id} className="py-3 first:pt-0 last:pb-0">
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
