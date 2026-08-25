import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Button,
  Card,
  CardHeader,
  Field,
  FormGrid,
  Kpi,
  PageToolbar,
  Pill,
  SegmentedControl,
  TextInput,
  ToolbarGroup,
  ToolbarMeta,
  ToolbarSpacer,
} from "@lumenx/ui-admin";
import { HardDrive, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { subscribeInstituteDirectory } from "@/lib/institute-directory-store";
import { subscribeLicenses } from "@/lib/institute-licensing-store";
import {
  DEFAULT_PLAN_STORAGE_LIMITS,
  QUOTA_WARNING_PCT,
  formatGb,
  labelQuotaStatus,
  listInstituteStorageQuotas,
  loadPlanStorageLimits,
  quotaStatusTone,
  savePlanStorageLimits,
  storageQuotaStats,
  subscribeStorageQuotas,
  type PlanStorageLimits,
  type QuotaStatus,
} from "@/lib/storage-quota-store";

export const Route = createFileRoute("/storage")({
  head: () => ({ meta: [{ title: "Storage Quotas — LumenX Nexus" }] }),
  component: StorageQuotasPage,
});

type StatusFilter = "all" | QuotaStatus;

function StorageQuotasPage() {
  const [tick, setTick] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [draftLimits, setDraftLimits] = useState<PlanStorageLimits>(() => loadPlanStorageLimits());
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

  useEffect(() => {
    const a = subscribeStorageQuotas(() => setTick((t) => t + 1));
    const b = subscribeInstituteDirectory(() => setTick((t) => t + 1));
    const c = subscribeLicenses(() => setTick((t) => t + 1));
    return () => {
      a();
      b();
      c();
    };
  }, []);

  useEffect(() => {
    setDraftLimits(loadPlanStorageLimits());
  }, [tick]);

  const limits = useMemo(() => loadPlanStorageLimits(), [tick]);
  const rows = useMemo(() => listInstituteStorageQuotas(limits), [limits, tick]);
  const stats = useMemo(() => storageQuotaStats(rows), [rows]);

  const filtered = useMemo(
    () => (statusFilter === "all" ? rows : rows.filter((r) => r.quotaStatus === statusFilter)),
    [rows, statusFilter],
  );

  const dirty =
    draftLimits.core !== limits.core ||
    draftLimits.plus !== limits.plus ||
    draftLimits.max !== limits.max;

  function saveLimits() {
    savePlanStorageLimits(draftLimits, limits);
    setSavedFlash("Plan storage limits saved");
    setTick((t) => t + 1);
    window.setTimeout(() => setSavedFlash(null), 2000);
  }

  return (
    <AppShell
      title="Storage Quotas"
      subtitle="Plan limits and institute usage · Admin manages files · Nexus monitors quota"
    >
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <Kpi
          label="Institutes monitored"
          value={String(stats.institutes)}
          icon={<HardDrive className="size-3.5" />}
        />
        <Kpi label="Total used" value={formatGb(stats.totalUsedGb)} delta={`of ${formatGb(stats.totalLimitGb)}`} />
        <Kpi label="Within quota" value={String(stats.ok)} tone="up" />
        <Kpi
          label="Quota warning"
          value={String(stats.warning)}
          tone={stats.warning ? "down" : "neutral"}
          delta={`≥ ${QUOTA_WARNING_PCT}%`}
        />
        <Kpi
          label="Quota exceeded"
          value={String(stats.exceeded)}
          tone={stats.exceeded ? "down" : "up"}
        />
      </div>

      <div className="grid grid-cols-12 gap-4 mb-6">
        <Card className="col-span-12 lg:col-span-5">
          <CardHeader
            title="Plan storage limits"
            hint="Core / Plus / Max ceilings in GB"
            action={
              dirty ? (
                <Button variant="primary" onClick={saveLimits}>
                  <Save className="size-3.5" /> Save limits
                </Button>
              ) : (
                <Pill tone="success">Saved</Pill>
              )
            }
          />
          <div className="px-5 pb-5 space-y-4">
            {savedFlash && <p className="text-xs text-success">{savedFlash}</p>}
            <FormGrid>
              <Field label="Core (GB)">
                <TextInput
                  type="number"
                  min={1}
                  value={String(draftLimits.core)}
                  onChange={(e) =>
                    setDraftLimits((d) => ({ ...d, core: Number(e.target.value) || 0 }))
                  }
                />
              </Field>
              <Field label="Plus (GB)">
                <TextInput
                  type="number"
                  min={1}
                  value={String(draftLimits.plus)}
                  onChange={(e) =>
                    setDraftLimits((d) => ({ ...d, plus: Number(e.target.value) || 0 }))
                  }
                />
              </Field>
              <Field label="Max (GB)" className="sm:col-span-2">
                <TextInput
                  type="number"
                  min={1}
                  value={String(draftLimits.max)}
                  onChange={(e) =>
                    setDraftLimits((d) => ({ ...d, max: Number(e.target.value) || 0 }))
                  }
                />
              </Field>
            </FormGrid>
            <div className="grid grid-cols-3 gap-2 text-center">
              {(["core", "plus", "max"] as const).map((tier) => (
                <div key={tier} className="rounded-md border border-border bg-background/40 px-2 py-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                    {tier}
                  </div>
                  <div className="text-sm font-mono mt-1">{limits[tier]} GB</div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Defaults: Core {DEFAULT_PLAN_STORAGE_LIMITS.core} GB · Plus{" "}
              {DEFAULT_PLAN_STORAGE_LIMITS.plus} GB · Max {DEFAULT_PLAN_STORAGE_LIMITS.max} GB. Changing
              limits does not delete institute files.
            </p>
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-7">
          <CardHeader title="Platform quota signal" hint="Aggregated across live institutes" />
          <div className="px-5 pb-5 space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Network used vs allotted</span>
                <span className="font-mono">
                  {formatGb(stats.totalUsedGb)} / {formatGb(stats.totalLimitGb)}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full ${
                    stats.totalLimitGb > 0 && stats.totalUsedGb / stats.totalLimitGb >= 1
                      ? "bg-destructive"
                      : stats.totalLimitGb > 0 &&
                          (stats.totalUsedGb / stats.totalLimitGb) * 100 >= QUOTA_WARNING_PCT
                        ? "bg-warning"
                        : "bg-primary"
                  }`}
                  style={{
                    width: `${Math.min(100, stats.totalLimitGb > 0 ? (stats.totalUsedGb / stats.totalLimitGb) * 100 : 0)}%`,
                  }}
                />
              </div>
            </div>
            <div className="rounded-md border border-border bg-muted/20 px-4 py-3 text-[11px] text-muted-foreground leading-relaxed">
              Nexus does <span className="text-foreground font-medium">not</span> manage homework,
              documents, or media files. Admin continues file operations inside each institute. This
              surface only sets plan ceilings and monitors usage against them.
            </div>
          </div>
        </Card>
      </div>

      <Card className="mb-4">
        <PageToolbar>
          <ToolbarGroup>
            <SegmentedControl
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "All" },
                { value: "ok", label: "Within quota" },
                { value: "warning", label: "Warning" },
                { value: "exceeded", label: "Exceeded" },
              ]}
            />
          </ToolbarGroup>
          <ToolbarSpacer />
          <ToolbarMeta>{filtered.length} institutes</ToolbarMeta>
        </PageToolbar>
      </Card>

      <Card>
        <CardHeader
          title="Institute storage quotas"
          hint="Usage · limit · % used · remaining · status"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background/40 border-b border-border">
                <th className="px-5 py-3 font-semibold">Institute</th>
                <th className="px-5 py-3 font-semibold">Plan</th>
                <th className="px-5 py-3 font-semibold text-right">Used</th>
                <th className="px-5 py-3 font-semibold text-right">Limit</th>
                <th className="px-5 py-3 font-semibold text-right">% used</th>
                <th className="px-5 py-3 font-semibold text-right">Remaining</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-xs text-muted-foreground">
                    No institutes match this filter.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.instituteId} className="hover:bg-surface-hover">
                    <td className="px-5 py-3">
                      <Link
                        to="/institutes/$id"
                        params={{ id: r.instituteId }}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        {r.instituteName}
                      </Link>
                      <div className="text-[10px] text-muted-foreground">{r.location}</div>
                    </td>
                    <td className="px-5 py-3 text-xs">{r.planLabel}</td>
                    <td className="px-5 py-3 text-xs font-mono text-right">{formatGb(r.usedGb)}</td>
                    <td className="px-5 py-3 text-xs font-mono text-right">{formatGb(r.limitGb)}</td>
                    <td className="px-5 py-3 text-right min-w-[120px]">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs font-mono">{r.pctUsed}%</span>
                        <div className="w-24 h-1.5 rounded bg-muted overflow-hidden">
                          <div
                            className={`h-full ${
                              r.quotaStatus === "exceeded"
                                ? "bg-destructive"
                                : r.quotaStatus === "warning"
                                  ? "bg-warning"
                                  : "bg-success"
                            }`}
                            style={{ width: `${Math.min(100, r.pctUsed)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs font-mono text-right">
                      {r.quotaStatus === "exceeded" ? "0 GB" : formatGb(r.remainingGb)}
                    </td>
                    <td className="px-5 py-3">
                      <Pill tone={quotaStatusTone(r.quotaStatus)}>{labelQuotaStatus(r.quotaStatus)}</Pill>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
