import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Button,
  Card,
  CardHeader,
  Field,
  FormGrid,
  PageToolbar,
  Pill,
  SegmentedControl,
  Select,
  TextInput,
  ToolbarGroup,
  ToolbarMeta,
  ToolbarSpacer,
} from "@lumenx/ui-admin";
import { Save, Settings2 } from "lucide-react";
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  NEXUS_MODULE_CATALOG,
  PLAN_ORDER,
  REMINDER_DAY_OPTIONS,
  planLabel,
  type BillingCadence,
  type BillingModel,
  type PlanTier,
} from "@/lib/institute-licensing-store";
import {
  labelAuditRetention,
  labelBillingCadence,
  labelBillingModel,
  labelOperatorDigest,
  labelSessionTimeout,
  loadPlatformSettings,
  savePlatformSettings,
  subscribePlatformSettings,
  toggleReminderDay,
  type AuditRetention,
  type OperatorDigest,
  type PlatformSettings,
  type SessionTimeoutMin,
} from "@/lib/platform-settings-store";
import {
  loadPlanStorageLimits,
  savePlanStorageLimits,
  subscribeStorageQuotas,
} from "@/lib/storage-quota-store";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Platform Settings — LumenX Nexus" }] }),
  component: PlatformSettingsPage,
});

type Tab =
  | "information"
  | "plans"
  | "modules"
  | "billing"
  | "storage"
  | "notifications"
  | "policies"
  | "security";

const TABS: { id: Tab; label: string }[] = [
  { id: "information", label: "Platform" },
  { id: "plans", label: "Plans" },
  { id: "modules", label: "Modules" },
  { id: "billing", label: "Billing" },
  { id: "storage", label: "Storage" },
  { id: "notifications", label: "Notifications" },
  { id: "policies", label: "Policies" },
  { id: "security", label: "Security" },
];

function PlatformSettingsPage() {
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState<Tab>("information");
  const [draft, setDraft] = useState<PlatformSettings>(() => loadPlatformSettings());
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    const a = subscribePlatformSettings(() => setTick((t) => t + 1));
    const b = subscribeStorageQuotas(() => setTick((t) => t + 1));
    return () => {
      a();
      b();
    };
  }, []);

  useEffect(() => {
    const loaded = loadPlatformSettings();
    const limits = loadPlanStorageLimits();
    setDraft({
      ...loaded,
      storageLimitGb: { ...limits },
    });
  }, [tick]);

  const saved = useMemo(() => {
    const loaded = loadPlatformSettings();
    const limits = loadPlanStorageLimits();
    return { ...loaded, storageLimitGb: { ...limits } };
  }, [tick]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  function patch<K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function save() {
    const prev = loadPlatformSettings();
    const next = savePlatformSettings(draft, prev);
    savePlanStorageLimits(next.storageLimitGb, loadPlanStorageLimits());
    setFlash("Platform settings saved");
    window.setTimeout(() => setFlash(null), 2200);
    setTick((t) => t + 1);
  }

  return (
    <AppShell
      title="Platform Settings"
      subtitle="Nexus-wide defaults · not institute academic or calendar settings"
      actions={
        <Button variant="primary" onClick={save} disabled={!dirty}>
          <Save className="size-3.5" /> Save changes
        </Button>
      }
    >
      {flash && <div className="mb-4 text-xs text-success font-medium">{flash}</div>}

      <PageToolbar>
        <ToolbarGroup>
          <Settings2 className="size-3.5 text-muted-foreground" />
          <ToolbarMeta>Applies to new institutes and platform operators</ToolbarMeta>
        </ToolbarGroup>
        <ToolbarSpacer />
        <ToolbarMeta>
          {dirty ? <Pill tone="warning">Unsaved</Pill> : <Pill tone="success">Synced</Pill>}
        </ToolbarMeta>
      </PageToolbar>

      <div className="mb-6 overflow-x-auto">
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={TABS.map((t) => ({ value: t.id, label: t.label }))}
        />
      </div>

      {tab === "information" && <InformationSection draft={draft} patch={patch} />}
      {tab === "plans" && <PlansSection draft={draft} patch={patch} setDraft={setDraft} />}
      {tab === "modules" && <ModulesSection draft={draft} setDraft={setDraft} />}
      {tab === "billing" && <BillingSection draft={draft} patch={patch} setDraft={setDraft} />}
      {tab === "storage" && <StorageSection draft={draft} setDraft={setDraft} />}
      {tab === "notifications" && <NotificationsSection draft={draft} patch={patch} />}
      {tab === "policies" && <PoliciesSection draft={draft} patch={patch} />}
      {tab === "security" && <SecuritySection draft={draft} patch={patch} />}

      <p className="mt-6 text-[11px] text-muted-foreground leading-relaxed max-w-3xl">
        Institute name, academic year, branches, and calendar live in Admin. Storage monitoring
        details are on{" "}
        <Link to="/storage" className="text-primary underline-offset-2 hover:underline">
          Storage Quotas
        </Link>
        ; policy alerts are managed on{" "}
        <Link to="/policies" className="text-primary underline-offset-2 hover:underline">
          Policies & Alerts
        </Link>
        .
      </p>
    </AppShell>
  );
}

function InformationSection({
  draft,
  patch,
}: {
  draft: PlatformSettings;
  patch: <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => void;
}) {
  return (
    <Card>
      <CardHeader
        title="Platform information"
        hint="LumenX identity shown to operators · not an institute profile"
      />
      <div className="px-5 pb-5">
        <FormGrid>
          <Field label="Platform name">
            <TextInput
              value={draft.platformName}
              onChange={(e) => patch("platformName", e.target.value)}
            />
          </Field>
          <Field label="Tagline">
            <TextInput
              value={draft.platformTagline}
              onChange={(e) => patch("platformTagline", e.target.value)}
            />
          </Field>
          <Field label="Legal entity">
            <TextInput
              value={draft.legalEntity}
              onChange={(e) => patch("legalEntity", e.target.value)}
            />
          </Field>
          <Field label="Primary region">
            <TextInput
              value={draft.primaryRegion}
              onChange={(e) => patch("primaryRegion", e.target.value)}
            />
          </Field>
          <Field label="Platform support email">
            <TextInput
              value={draft.supportEmail}
              onChange={(e) => patch("supportEmail", e.target.value)}
            />
          </Field>
          <Field label="Platform support phone">
            <TextInput
              value={draft.supportPhone}
              onChange={(e) => patch("supportPhone", e.target.value)}
            />
          </Field>
          <Field label="Status page URL" className="sm:col-span-2">
            <TextInput
              value={draft.statusPageUrl}
              onChange={(e) => patch("statusPageUrl", e.target.value)}
            />
          </Field>
        </FormGrid>
      </div>
    </Card>
  );
}

function PlansSection({
  draft,
  patch,
  setDraft,
}: {
  draft: PlatformSettings;
  patch: <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => void;
  setDraft: Dispatch<SetStateAction<PlatformSettings>>;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Default plans" hint="Applied when creating institutes in Nexus" />
        <div className="px-5 pb-5">
          <FormGrid>
            <Field label="Default plan for new institutes">
              <Select
                value={draft.defaultPlanForNewInstitutes}
                onChange={(e) => patch("defaultPlanForNewInstitutes", e.target.value as PlanTier)}
              >
                {PLAN_ORDER.map((p) => (
                  <option key={p} value={p}>
                    {planLabel(p)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Default trial length (days)">
              <TextInput
                type="number"
                min={0}
                value={String(draft.defaultTrialDays)}
                onChange={(e) => patch("defaultTrialDays", Math.max(0, Number(e.target.value) || 0))}
              />
            </Field>
          </FormGrid>
        </div>
      </Card>

      <Card>
        <CardHeader title="Suggested list prices" hint="Demo rates used when assigning plans · ₹ INR" />
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background/40 border-b border-border">
                <th className="px-5 py-3 font-semibold">Plan</th>
                <th className="px-5 py-3 font-semibold">Yearly (₹)</th>
                <th className="px-5 py-3 font-semibold">Monthly (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {PLAN_ORDER.map((tier) => (
                <tr key={tier}>
                  <td className="px-5 py-3 text-sm font-medium">{planLabel(tier)}</td>
                  <td className="px-5 py-3">
                    <TextInput
                      type="number"
                      min={0}
                      className="max-w-[160px]"
                      value={String(draft.planSuggestedYearlyInr[tier])}
                      onChange={(e) => {
                        const n = Math.max(0, Number(e.target.value) || 0);
                        setDraft((d) => ({
                          ...d,
                          planSuggestedYearlyInr: { ...d.planSuggestedYearlyInr, [tier]: n },
                        }));
                      }}
                    />
                  </td>
                  <td className="px-5 py-3">
                    <TextInput
                      type="number"
                      min={0}
                      className="max-w-[160px]"
                      value={String(draft.planSuggestedMonthlyInr[tier])}
                      onChange={(e) => {
                        const n = Math.max(0, Number(e.target.value) || 0);
                        setDraft((d) => ({
                          ...d,
                          planSuggestedMonthlyInr: { ...d.planSuggestedMonthlyInr, [tier]: n },
                        }));
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ModulesSection({
  draft,
  setDraft,
}: {
  draft: PlatformSettings;
  setDraft: Dispatch<SetStateAction<PlatformSettings>>;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, typeof NEXUS_MODULE_CATALOG>();
    for (const m of NEXUS_MODULE_CATALOG) {
      const list = map.get(m.group) ?? [];
      list.push(m);
      map.set(m.group, list);
    }
    return [...map.entries()];
  }, []);

  return (
    <Card>
      <CardHeader
        title="Default module catalog"
        hint="Minimum plan for each platform module · entitlement ceiling for Admin"
      />
      <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-elevated z-10">
            <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <th className="px-5 py-3 font-semibold">Module</th>
              <th className="px-5 py-3 font-semibold">Group</th>
              <th className="px-5 py-3 font-semibold">Min plan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {groups.flatMap(([group, mods]) =>
              mods.map((m) => (
                <tr key={m.id} className="hover:bg-surface-hover">
                  <td className="px-5 py-2.5">
                    <div className="text-xs font-medium">{m.label}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{m.id}</div>
                  </td>
                  <td className="px-5 py-2.5 text-[11px] text-muted-foreground">{group}</td>
                  <td className="px-5 py-2.5">
                    <Select
                      value={draft.moduleMinPlans[m.id] ?? m.minPlan}
                      onChange={(e) => {
                        const minPlan = e.target.value as PlanTier;
                        setDraft((d) => ({
                          ...d,
                          moduleMinPlans: { ...d.moduleMinPlans, [m.id]: minPlan },
                        }));
                      }}
                      className="min-w-[110px]"
                    >
                      {PLAN_ORDER.map((p) => (
                        <option key={p} value={p}>
                          {planLabel(p)}
                        </option>
                      ))}
                    </Select>
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function BillingSection({
  draft,
  patch,
  setDraft,
}: {
  draft: PlatformSettings;
  patch: <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => void;
  setDraft: Dispatch<SetStateAction<PlatformSettings>>;
}) {
  return (
    <Card>
      <CardHeader
        title="Billing defaults"
        hint="LumenX → institute licensing · not student fee collection"
      />
      <div className="px-5 pb-5 space-y-5">
        <FormGrid>
          <Field label="Default billing model">
            <Select
              value={draft.defaultBillingModel}
              onChange={(e) => patch("defaultBillingModel", e.target.value as BillingModel)}
            >
              {(["per_institute", "per_student", "custom"] as BillingModel[]).map((m) => (
                <option key={m} value={m}>
                  {labelBillingModel(m)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Default cadence">
            <Select
              value={draft.defaultBillingCadence}
              onChange={(e) => patch("defaultBillingCadence", e.target.value as BillingCadence)}
            >
              {(["yearly", "monthly"] as BillingCadence[]).map((c) => (
                <option key={c} value={c}>
                  {labelBillingCadence(c)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Currency">
            <TextInput value={draft.currencyCode} disabled />
          </Field>
          <Field label="GST %">
            <TextInput
              type="number"
              min={0}
              max={100}
              value={String(draft.gstPercent)}
              onChange={(e) => patch("gstPercent", Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
            />
          </Field>
          <Field label="Invoice prefix">
            <TextInput
              value={draft.invoicePrefix}
              onChange={(e) => patch("invoicePrefix", e.target.value.toUpperCase())}
            />
          </Field>
        </FormGrid>

        <div>
          <div className="text-xs font-medium mb-2">Default renewal reminder days</div>
          <div className="flex flex-wrap gap-2">
            {REMINDER_DAY_OPTIONS.map((day) => {
              const on = draft.defaultReminderDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      defaultReminderDays: toggleReminderDay(d.defaultReminderDays, day),
                    }))
                  }
                  className={`h-8 px-3 rounded-md border text-xs font-mono transition-colors ${
                    on
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-surface text-muted-foreground hover:bg-surface-hover"
                  }`}
                >
                  {day}d
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

function StorageSection({
  draft,
  setDraft,
}: {
  draft: PlatformSettings;
  setDraft: Dispatch<SetStateAction<PlatformSettings>>;
}) {
  return (
    <Card>
      <CardHeader
        title="Storage quota defaults"
        hint="Plan ceilings for institute usage · Admin manages files"
      />
      <div className="px-5 pb-5">
        <FormGrid>
          {PLAN_ORDER.map((tier) => (
            <Field key={tier} label={`${planLabel(tier)} limit (GB)`}>
              <TextInput
                type="number"
                min={1}
                value={String(draft.storageLimitGb[tier])}
                onChange={(e) => {
                  const n = Math.max(1, Number(e.target.value) || 1);
                  setDraft((d) => ({
                    ...d,
                    storageLimitGb: { ...d.storageLimitGb, [tier]: n },
                  }));
                }}
              />
            </Field>
          ))}
          <Field label="Warning threshold (%)">
            <TextInput
              type="number"
              min={1}
              max={100}
              value={String(draft.storageWarningPct)}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  storageWarningPct: Math.min(100, Math.max(1, Number(e.target.value) || 80)),
                }))
              }
            />
          </Field>
        </FormGrid>
        <p className="mt-4 text-[11px] text-muted-foreground">
          Saving updates the same defaults used on the Storage Quotas page.
        </p>
      </div>
    </Card>
  );
}

function NotificationsSection({
  draft,
  patch,
}: {
  draft: PlatformSettings;
  patch: <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => void;
}) {
  return (
    <Card>
      <CardHeader
        title="Platform notification settings"
        hint="Operator alerts for platform events · not student/parent messaging"
      />
      <div className="px-5 pb-5 space-y-4">
        <ToggleRow
          label="Critical platform alerts"
          hint="Security, incidents, SLA breaches"
          checked={draft.notifyOnCriticalAlert}
          onChange={(v) => patch("notifyOnCriticalAlert", v)}
        />
        <ToggleRow
          label="Overdue institute billing"
          hint="When license payments fall behind"
          checked={draft.notifyOnOverdueBilling}
          onChange={(v) => patch("notifyOnOverdueBilling", v)}
        />
        <ToggleRow
          label="Support escalations"
          hint="High-priority Support Center threads"
          checked={draft.notifyOnSupportEscalation}
          onChange={(v) => patch("notifyOnSupportEscalation", v)}
        />
        <ToggleRow
          label="Storage quota exceeded"
          hint="Institute usage above plan ceiling"
          checked={draft.notifyOnQuotaExceeded}
          onChange={(v) => patch("notifyOnQuotaExceeded", v)}
        />
        <FormGrid>
          <Field label="Operator digest">
            <Select
              value={draft.operatorDigest}
              onChange={(e) => patch("operatorDigest", e.target.value as OperatorDigest)}
            >
              {(["off", "daily", "weekly"] as OperatorDigest[]).map((v) => (
                <option key={v} value={v}>
                  {labelOperatorDigest(v)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ops notify email">
            <TextInput
              value={draft.operatorNotifyEmail}
              onChange={(e) => patch("operatorNotifyEmail", e.target.value)}
            />
          </Field>
        </FormGrid>
      </div>
    </Card>
  );
}

function PoliciesSection({
  draft,
  patch,
}: {
  draft: PlatformSettings;
  patch: <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => void;
}) {
  return (
    <Card>
      <CardHeader
        title="Platform policy defaults"
        hint="SLA and escalation baselines · academic rules stay in Admin"
      />
      <div className="px-5 pb-5">
        <FormGrid>
          <Field label="Support SLA · high (hours)">
            <TextInput
              type="number"
              min={1}
              value={String(draft.supportSlaHoursHigh)}
              onChange={(e) => patch("supportSlaHoursHigh", Math.max(1, Number(e.target.value) || 1))}
            />
          </Field>
          <Field label="Support SLA · medium (hours)">
            <TextInput
              type="number"
              min={1}
              value={String(draft.supportSlaHoursMedium)}
              onChange={(e) => patch("supportSlaHoursMedium", Math.max(1, Number(e.target.value) || 1))}
            />
          </Field>
          <Field label="Support SLA · low (hours)">
            <TextInput
              type="number"
              min={1}
              value={String(draft.supportSlaHoursLow)}
              onChange={(e) => patch("supportSlaHoursLow", Math.max(1, Number(e.target.value) || 1))}
            />
          </Field>
          <Field label="Auto-escalate overdue (days)">
            <TextInput
              type="number"
              min={1}
              value={String(draft.autoEscalateOverdueDays)}
              onChange={(e) =>
                patch("autoEscalateOverdueDays", Math.max(1, Number(e.target.value) || 1))
              }
            />
          </Field>
          <Field label="Renewal warning (days before)">
            <TextInput
              type="number"
              min={1}
              value={String(draft.renewalWarningDays)}
              onChange={(e) => patch("renewalWarningDays", Math.max(1, Number(e.target.value) || 1))}
            />
          </Field>
        </FormGrid>
      </div>
    </Card>
  );
}

function SecuritySection({
  draft,
  patch,
}: {
  draft: PlatformSettings;
  patch: <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => void;
}) {
  return (
    <Card>
      <CardHeader
        title="Operator & security preferences"
        hint="Nexus operator session and audit · not institute staff accounts"
      />
      <div className="px-5 pb-5 space-y-4">
        <ToggleRow
          label="Require two-factor authentication"
          hint="All Nexus operators"
          checked={draft.require2fa}
          onChange={(v) => patch("require2fa", v)}
        />
        <ToggleRow
          label="Allow self-serve invites"
          hint="Operators can invite without Root approval"
          checked={draft.allowSelfServeInvite}
          onChange={(v) => patch("allowSelfServeInvite", v)}
        />
        <ToggleRow
          label="Show operator handles in audit"
          hint="Display handles on the platform audit trail"
          checked={draft.showOperatorHandlesInAudit}
          onChange={(v) => patch("showOperatorHandlesInAudit", v)}
        />
        <FormGrid>
          <Field label="Session timeout">
            <Select
              value={String(draft.sessionTimeoutMin)}
              onChange={(e) =>
                patch("sessionTimeoutMin", Number(e.target.value) as SessionTimeoutMin)
              }
            >
              {([30, 60, 240] as SessionTimeoutMin[]).map((m) => (
                <option key={m} value={m}>
                  {labelSessionTimeout(m)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Audit log retention">
            <Select
              value={draft.auditRetention}
              onChange={(e) => patch("auditRetention", e.target.value as AuditRetention)}
            >
              {(["90", "365", "forever"] as AuditRetention[]).map((v) => (
                <option key={v} value={v}>
                  {labelAuditRetention(v)}
                </option>
              ))}
            </Select>
          </Field>
        </FormGrid>
      </div>
    </Card>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-0">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint ? <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 rounded-full border transition-colors ${
          checked ? "bg-primary border-primary" : "bg-muted border-border"
        }`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-background shadow transition-transform ${
            checked ? "left-6" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
