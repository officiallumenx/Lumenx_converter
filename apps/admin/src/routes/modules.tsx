import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Button, Pill } from "@/components/ui-kit";
import {
  Users, GraduationCap, Heart, Building2, CalendarRange, ClipboardCheck, FileText,
  MessageSquareWarning, Bell, Megaphone, CalendarDays, Siren, ShieldCheck, HardDrive,
  BarChart3, Sparkles, Zap, Crown, Check,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/modules")({
  head: () => ({ meta: [{ title: "Modules — LumenX Admin" }] }),
  component: ModulesPage,
});

type Plan = "Starter" | "Professional" | "Enterprise";

type Module = {
  id: string; label: string; icon: typeof Users;
  description: string;
  minPlan: Plan;
  group: "Core" | "Operations" | "Communications" | "Intelligence" | "Infrastructure";
};

const modules: Module[] = [
  { id: "students", label: "Students", icon: Users, description: "Directory, admissions, 360 profiles", minPlan: "Starter", group: "Core" },
  { id: "teachers", label: "Teachers", icon: GraduationCap, description: "Faculty records, workload, ratings", minPlan: "Starter", group: "Core" },
  { id: "parents", label: "Parents", icon: Heart, description: "Guardian accounts and child linking", minPlan: "Starter", group: "Core" },
  { id: "classes", label: "Classes & Sections", icon: Building2, description: "Class structure and section assignments", minPlan: "Starter", group: "Core" },
  { id: "attendance", label: "Attendance", icon: ClipboardCheck, description: "Daily attendance capture and reports", minPlan: "Starter", group: "Operations" },
  { id: "timetable", label: "Timetable Builder", icon: CalendarRange, description: "Conflict-aware schedule builder", minPlan: "Professional", group: "Operations" },
  { id: "exams", label: "Exams & Marks", icon: FileText, description: "Exam scheduling and grade ingestion", minPlan: "Professional", group: "Operations" },
  { id: "complaints", label: "Complaints", icon: MessageSquareWarning, description: "Case management with SLAs", minPlan: "Professional", group: "Operations" },
  { id: "notifications", label: "Notifications", icon: Bell, description: "Push/email/SMS triggered messages", minPlan: "Starter", group: "Communications" },
  { id: "announcements", label: "Announcements", icon: Megaphone, description: "Long-form notices with pinning", minPlan: "Professional", group: "Communications" },
  { id: "events", label: "Events", icon: CalendarDays, description: "Calendar, RSVPs, audience targeting", minPlan: "Professional", group: "Communications" },
  { id: "alerts", label: "Alerts (P0–P3)", icon: Siren, description: "Rule-based operational alerting", minPlan: "Enterprise", group: "Communications" },
  { id: "analytics", label: "Analytics", icon: BarChart3, description: "Cohort and performance intelligence", minPlan: "Professional", group: "Intelligence" },
  { id: "permissions", label: "IAM & Permissions", icon: ShieldCheck, description: "Roles, scopes, custom matrices", minPlan: "Enterprise", group: "Infrastructure" },
  { id: "storage", label: "Cloud Storage", icon: HardDrive, description: "Archive, quotas, cleanup", minPlan: "Professional", group: "Infrastructure" },
];

const planOrder: Plan[] = ["Starter", "Professional", "Enterprise"];

function ModulesPage() {
  const [plan, setPlan] = useState<Plan>("Professional");
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(modules.map((m) => [m.id, planOrder.indexOf(m.minPlan) <= planOrder.indexOf("Professional")])),
  );

  const isAvailable = (m: Module) => planOrder.indexOf(m.minPlan) <= planOrder.indexOf(plan);

  const toggle = (id: string) => {
    const m = modules.find((x) => x.id === id);
    if (!m || !isAvailable(m)) return;
    setEnabled((p) => ({ ...p, [id]: !p[id] }));
  };

  const groups = Array.from(new Set(modules.map((m) => m.group)));
  const activeCount = modules.filter((m) => enabled[m.id] && isAvailable(m)).length;

  return (
    <AppShell title="Modules & Plan" subtitle="Activate operational modules — availability depends on your subscription plan"
      actions={<Button variant="primary"><Sparkles className="size-3.5" /> Upgrade Plan</Button>}
    >
      {/* Plan switcher */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {([
          { p: "Starter", icon: Zap, price: "Free", desc: "Core people management for small institutes",
            features: ["Up to 500 students", "Basic notifications", "Single branch"] },
          { p: "Professional", icon: Sparkles, price: "$249/mo", desc: "Operational depth for growing institutes",
            features: ["Up to 5,000 students", "Timetable builder", "Multi-branch · 3", "Analytics"] },
          { p: "Enterprise", icon: Crown, price: "Custom", desc: "Unlimited scale with IAM and SLAs",
            features: ["Unlimited students", "IAM & custom roles", "Alert rule engine", "Priority SLA"] },
        ] as const).map((opt) => {
          const Icon = opt.icon;
          const active = plan === opt.p;
          return (
            <button key={opt.p} onClick={() => setPlan(opt.p as Plan)}
              className={`text-left p-5 rounded-xl border transition-all duration-200 ${
                active
                  ? "border-primary bg-primary/5 shadow-glow"
                  : "border-border bg-surface hover:border-border-strong hover:-translate-y-0.5"
              }`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`size-9 rounded-md flex items-center justify-center border ${active ? "bg-primary/15 border-primary/30 text-primary" : "bg-accent border-border text-muted-foreground"}`}>
                  <Icon className="size-4" />
                </div>
                {active && <Pill tone="info" pulse>Current</Pill>}
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-base font-semibold">{opt.p}</div>
                <div className="text-xs text-muted-foreground font-mono">{opt.price}</div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{opt.desc}</p>
              <ul className="mt-4 space-y-1.5">
                {opt.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[11px]">
                    <Check className="size-3 text-success" /> {f}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Active modules</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">{activeCount}/{modules.length}</div>
        </Card>
        <Card className="p-5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Current plan</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">{plan}</div>
        </Card>
        <Card className="p-5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Locked modules</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">{modules.filter((m) => !isAvailable(m)).length}</div>
        </Card>
        <Card className="p-5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Module groups</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">{groups.length}</div>
        </Card>
      </div>

      {groups.map((g) => (
        <Card key={g} className="mb-4">
          <CardHeader title={g} hint={`${modules.filter((m) => m.group === g).length} modules in this group`} />
          <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {modules.filter((m) => m.group === g).map((m) => {
              const Icon = m.icon;
              const avail = isAvailable(m);
              const on = enabled[m.id] && avail;
              return (
                <div key={m.id}
                  className={`p-4 rounded-lg border transition-all ${
                    on ? "border-primary/30 bg-primary/[0.04]"
                       : avail ? "border-border bg-background/40 hover:border-border-strong"
                       : "border-dashed border-border bg-muted/30 opacity-70"
                  }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`size-9 rounded-md flex items-center justify-center border ${
                        on ? "bg-primary/15 border-primary/30 text-primary"
                           : avail ? "bg-accent border-border text-muted-foreground"
                           : "bg-muted border-border text-muted-foreground"
                      }`}>
                        <Icon className="size-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold flex items-center gap-1.5">
                          {m.label}
                          {!avail && <Pill tone="warning">{m.minPlan}+</Pill>}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{m.description}</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      Min plan · {m.minPlan}
                    </span>
                    <Toggle on={on} disabled={!avail} onChange={() => toggle(m.id)} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </AppShell>
  );
}

function Toggle({ on, disabled, onChange }: { on: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} disabled={disabled}
      className={`relative w-10 h-5 rounded-full transition-colors ${
        on ? "bg-primary" : "bg-muted"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
      <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}
