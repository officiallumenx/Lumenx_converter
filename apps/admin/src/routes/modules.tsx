import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Button, Pill, Select } from "@lumenx/ui-admin";
import {
  Users, GraduationCap, Heart, Building2, CalendarRange, ClipboardCheck, FileText,
  MessageSquareWarning, Bell, Megaphone, CalendarDays, Siren, ShieldCheck, HardDrive,
  BarChart3, Sparkles, Zap, Crown, Check, ClipboardList, Bus, Plane, Receipt, UserCheck,
  Briefcase, Landmark, FileBarChart, Award, BookOpen,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  type PlanTier,
  type BillingTerm,
  PLAN_ORDER,
  PLAN_LABELS,
  PLAN_DETAILS,
  BILLING_TERMS,
  MODULE_CATALOG,
  isModuleAvailable,
  defaultEnabledModules,
} from "@/lib/admin-plan-config";

export const Route = createFileRoute("/modules")({
  head: () => ({ meta: [{ title: "Modules — LumenX Admin" }] }),
  component: ModulesPage,
});

const iconMap: Record<string, typeof Users> = {
  students: Users, teachers: GraduationCap, parents: Heart, classes: Building2, subjects: BookOpen,
  attendance: ClipboardCheck, "teacher-attendance": ClipboardCheck, timetable: CalendarRange,
  exams: FileText, marks: ClipboardList, complaints: MessageSquareWarning,
  notifications: Bell, announcements: Megaphone, events: CalendarDays, alerts: Siren,
  analytics: BarChart3, permissions: ShieldCheck, storage: HardDrive,
  transport: Bus, leave: Plane, fees: Receipt, admissions: UserCheck, careers: Briefcase,
  institute: Landmark, calendar: CalendarDays, reports: FileBarChart,
  "teacher-performance": Award,
};

const planIcons: Record<PlanTier, typeof Zap> = { core: Zap, plus: Sparkles, max: Crown, custom: Crown };

function ModulesPage() {
  const [plan, setPlan] = useState<PlanTier>("plus");
  const [term, setTerm] = useState<BillingTerm>("1yr");
  const [paymentPending, setPaymentPending] = useState(false);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => defaultEnabledModules("plus"));

  const handlePlanChange = (p: PlanTier) => {
    setPlan(p);
    setEnabled(defaultEnabledModules(p));
    setPaymentPending(true);
  };

  const isAvailable = (mod: (typeof MODULE_CATALOG)[0]) => isModuleAvailable(mod, plan);

  const toggle = (id: string) => {
    const m = MODULE_CATALOG.find((x) => x.id === id);
    if (!m || !isAvailable(m)) return;
    setEnabled((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const groups = useMemo(() => Array.from(new Set(MODULE_CATALOG.map((m) => m.group))), []);
  const activeCount = MODULE_CATALOG.filter((m) => enabled[m.id] && isAvailable(m)).length;
  const disabledCount = MODULE_CATALOG.filter((m) => isAvailable(m) && !enabled[m.id]).length;
  const lockedCount = MODULE_CATALOG.filter((m) => !isAvailable(m)).length;

  return (
    <AppShell title="Modules & Plan" subtitle="Activate operational modules — availability depends on your subscription plan"
      actions={
        <Button variant="primary" onClick={() => setPaymentPending(false)}>
          {paymentPending ? "Activate after payment" : "Plan active"}
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-xs text-muted-foreground">Billing term:</span>
        <Select value={term} onChange={(e) => setTerm(e.target.value as BillingTerm)} className="w-36 h-9 text-xs">
          {BILLING_TERMS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </Select>
        {paymentPending && <Pill tone="warning">Payment pending — modules preview only</Pill>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        {PLAN_ORDER.map((p) => {
          const Icon = planIcons[p];
          const details = PLAN_DETAILS[p];
          const active = plan === p;
          return (
            <button key={p} onClick={() => handlePlanChange(p)}
              className={`text-left p-5 rounded-xl border transition-all duration-200 ${
                active ? "border-primary bg-primary/5 shadow-glow" : "border-border bg-surface hover:border-border-strong"
              }`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`size-9 rounded-md flex items-center justify-center border ${active ? "bg-primary/15 border-primary/30 text-primary" : "bg-accent border-border text-muted-foreground"}`}>
                  <Icon className="size-4" />
                </div>
                {active && <Pill tone="info" pulse>Current</Pill>}
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-base font-semibold">{PLAN_LABELS[p]}</div>
                <div className="text-xs text-muted-foreground font-mono">{details.price}</div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{details.desc}</p>
              <ul className="mt-4 space-y-1.5">
                {details.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[11px]"><Check className="size-3 text-success" /> {f}</li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <div className="lx-kpi-grid mb-6">
        <Card className="p-5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Enabled</div>
          <div className="mt-2 text-2xl font-semibold">{activeCount}</div>
        </Card>
        <Card className="p-5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Disabled</div>
          <div className="mt-2 text-2xl font-semibold">{disabledCount}</div>
        </Card>
        <Card className="p-5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Locked by plan</div>
          <div className="mt-2 text-2xl font-semibold">{lockedCount}</div>
        </Card>
        <Card className="p-5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Current plan</div>
          <div className="mt-2 text-2xl font-semibold">{PLAN_LABELS[plan]}</div>
        </Card>
      </div>

      {groups.map((g) => (
        <Card key={g} className="mb-4">
          <CardHeader title={g} hint={`${MODULE_CATALOG.filter((m) => m.group === g).length} modules`} />
          <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {MODULE_CATALOG.filter((m) => m.group === g).map((m) => {
              const Icon = iconMap[m.id] ?? Users;
              const avail = isAvailable(m);
              const on = enabled[m.id] && avail;
              return (
                <div key={m.id} className={`p-4 rounded-lg border transition-all ${
                  on ? "border-primary/30 bg-primary/[0.04]" : avail ? "border-border bg-background/40" : "border-dashed border-border bg-muted/30 opacity-70"
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`size-9 rounded-md flex items-center justify-center border ${on ? "bg-primary/15 border-primary/30 text-primary" : "bg-accent border-border text-muted-foreground"}`}>
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold flex items-center gap-1.5">
                        {m.label}
                        {!avail && <Pill tone="warning">{PLAN_LABELS[m.minPlan]}+</Pill>}
                        {avail && !on && <Pill tone="neutral">Hidden in Connect</Pill>}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{m.description}</div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-muted-foreground">Min · {PLAN_LABELS[m.minPlan]}</span>
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
      className={`relative w-10 h-5 rounded-full transition-colors ${on ? "bg-primary" : "bg-muted"} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
      <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}
