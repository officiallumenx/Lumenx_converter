import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Button, Pill, Modal, Field, Select, TextInput, TextArea } from "@lumenx/ui-admin";
import { Plus, Siren, ShieldAlert, AlertTriangle, MessageSquareWarning, ClipboardCheck } from "lucide-react";
import { useState } from "react";
import { useAdminToast } from "@/components/AdminActionToast";

export const Route = createFileRoute("/alerts")({
  head: () => ({ meta: [{ title: "Alerts — LumenX Admin" }] }),
  component: AlertsPage,
});

type Rule = {
  id: string;
  name: string;
  icon: typeof ClipboardCheck;
  desc: string;
  priority: "P0" | "P2";
  channels: string[];
  audience: string;
  active: boolean;
};

const INITIAL: Rule[] = [
  { id: "1", name: "Attendance drop", icon: ClipboardCheck, desc: "Triggers when a student's monthly attendance falls below 75%.", priority: "P2", channels: ["Email", "Parent app"], audience: "Class teacher · Parent", active: true },
  { id: "2", name: "Weak performance", icon: AlertTriangle, desc: "Triggers on two consecutive exam scores under 40%.", priority: "P2", channels: ["Email", "Counsellor"], audience: "HoD · Parent", active: true },
  { id: "3", name: "Complaint escalation", icon: MessageSquareWarning, desc: "Triggers when a P0/P1 complaint sits unresolved past SLA.", priority: "P0", channels: ["SMS", "Push", "Email"], audience: "Principal · Admin", active: true },
  { id: "4", name: "Security incident", icon: ShieldAlert, desc: "Triggers on multiple failed admin logins or token tampering.", priority: "P0", channels: ["SMS", "PagerDuty"], audience: "Root admins", active: true },
  { id: "5", name: "Emergency broadcast", icon: Siren, desc: "Manual institute-wide critical alert (lockdown, weather, etc.).", priority: "P0", channels: ["All channels"], audience: "Institute-wide", active: false },
];

function AlertsPage() {
  const notify = useAdminToast();
  const [rules, setRules] = useState(INITIAL);
  const [open, setOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [emergencyMsg, setEmergencyMsg] = useState("");

  const createRule = () => {
    if (!ruleName.trim()) return;
    setRules((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: ruleName.trim(),
        icon: AlertTriangle,
        desc: "Custom rule — configure trigger in settings.",
        priority: "P2",
        channels: ["Email"],
        audience: "Administrators",
        active: true,
      },
    ]);
    setRuleName("");
    setOpen(false);
    notify(`Alert rule "${ruleName.trim()}" created`);
  };

  const sendEmergency = () => {
    if (!emergencyMsg.trim()) return;
    setEmergencyOpen(false);
    setEmergencyMsg("");
    notify("Emergency broadcast sent to all channels · institute-wide");
  };

  return (
    <AppShell title="Alert Center" subtitle="Configure operational, academic & emergency alert rules"
      actions={<><Button variant="danger" onClick={() => setEmergencyOpen(true)}><Siren className="size-3.5" /> Emergency broadcast</Button><Button variant="primary" onClick={() => setOpen(true)}><Plus className="size-3.5" /> New rule</Button></>}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Active rules", value: String(rules.filter((r) => r.active).length) },
          { label: "Alerts fired · 24h", value: "47" },
          { label: "Pending acknowledgements", value: "3" },
        ].map((s) => (
          <Card key={s.label} className="p-5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight">{s.value}</div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="Alert rules" hint="Priorities map to delivery channels and on-call routing" />
        <div className="px-5 pb-5 space-y-3">
          {rules.map((r) => {
            const Icon = r.icon;
            return (
              <div key={r.id} className="flex items-start gap-4 p-4 rounded-lg border border-border bg-background/40">
                <div className={`size-10 rounded-md flex items-center justify-center ${r.priority === "P0" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                  <Icon className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-medium">{r.name}</div>
                    <Pill tone={r.priority === "P0" ? "danger" : "warning"}>{r.priority}</Pill>
                    {r.channels.map((c) => <Pill key={c} tone="neutral">{c}</Pill>)}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{r.desc}</p>
                  <div className="mt-1.5 text-[11px] text-muted-foreground">Routed to: <span className="text-foreground">{r.audience}</span></div>
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone={r.active ? "success" : "neutral"}>{r.active ? "Active" : "Paused"}</Pill>
                  <Button onClick={() => notify(`Configure ${r.name}`)}>Configure</Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="New alert rule" subtitle="Define trigger, priority, audience and channel"
        footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" onClick={createRule} disabled={!ruleName.trim()}>Create rule</Button></>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Rule name" required><TextInput value={ruleName} onChange={(e) => setRuleName(e.target.value)} placeholder="e.g. Late fee overdue" /></Field>
          <Field label="Priority" required><Select defaultValue="P2"><option>P0 · Critical</option><option>P1 · High</option><option>P2 · Medium</option><option>P3 · Low</option></Select></Field>
          <Field label="Trigger source" required><Select defaultValue="Attendance"><option>Attendance</option><option>Exam scores</option><option>Complaints SLA</option><option>Security</option><option>Custom webhook</option></Select></Field>
          <Field label="Audience"><Select defaultValue="Class teachers"><option>Class teachers</option><option>Heads of Department</option><option>Principal</option><option>Parents</option><option>Institute-wide</option></Select></Field>
          <div className="sm:col-span-2"><Field label="Trigger condition"><TextArea placeholder="e.g. attendance_monthly < 75" /></Field></div>
        </div>
      </Modal>

      <Modal open={emergencyOpen} onClose={() => setEmergencyOpen(false)} title="Emergency broadcast" subtitle="Sends critical alert to all channels immediately" size="md"
        footer={<><Button onClick={() => setEmergencyOpen(false)}>Cancel</Button><Button variant="danger" onClick={sendEmergency} disabled={!emergencyMsg.trim()}><Siren className="size-3.5" /> Send now</Button></>}
      >
        <Field label="Emergency message" required>
          <TextArea rows={4} value={emergencyMsg} onChange={(e) => setEmergencyMsg(e.target.value)} placeholder="e.g. Institute closed due to severe weather. All classes suspended." />
        </Field>
      </Modal>
    </AppShell>
  );
}
