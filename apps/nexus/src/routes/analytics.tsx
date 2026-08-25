import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Card,
  CardHeader,
  Kpi,
  PageToolbar,
  Pill,
  Select,
  ToolbarGroup,
  ToolbarMeta,
  ToolbarSpacer,
} from "@lumenx/ui-admin";
import {
  Activity,
  Building2,
  CreditCard,
  GraduationCap,
  LifeBuoy,
  TrendingUp,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  DATE_RANGE_OPTIONS,
  barHeights,
  buildNetworkAnalytics,
  defaultNetworkAnalyticsFilters,
  polylinePoints,
  type DateRangeKey,
  type NetworkAnalyticsFilters,
} from "@/lib/network-analytics-metrics";
import type { InstituteStatus, PlanTier } from "@/lib/institute-directory-store";
import { colorForModule } from "@/lib/nexus-module-colors";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Network Analytics — LumenX Nexus" }] }),
  component: NetworkAnalyticsPage,
});

function NetworkAnalyticsPage() {
  const [filters, setFilters] = useState<NetworkAnalyticsFilters>(defaultNetworkAnalyticsFilters);
  const snap = useMemo(() => buildNetworkAnalytics(filters), [filters]);
  const { kpis, series, planMix, planLabels, moduleAdoption, usageTrend, format } = snap;
  const planTotal = planMix.core + planMix.plus + planMix.max || 1;

  const patch = <K extends keyof NetworkAnalyticsFilters>(key: K, value: NetworkAnalyticsFilters[K]) => {
    setFilters((f) => ({ ...f, [key]: value }));
  };

  return (
    <AppShell
      title="Network Analytics"
      subtitle="Cross-institute platform performance · aggregates only · not Admin school analytics"
    >
      <Card className="mb-6">
        <PageToolbar>
          <ToolbarGroup>
            <Select
              value={filters.dateRange}
              onChange={(e) => patch("dateRange", e.target.value as DateRangeKey)}
              className="min-w-[150px]"
            >
              {DATE_RANGE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Select
              value={filters.instituteId}
              onChange={(e) => patch("instituteId", e.target.value)}
              className="min-w-[180px]"
            >
              <option value="all">All institutes</option>
              {snap.instituteOptions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </Select>
            <Select
              value={filters.plan}
              onChange={(e) => patch("plan", e.target.value as "all" | PlanTier)}
              className="min-w-[120px]"
            >
              <option value="all">All plans</option>
              <option value="core">Core</option>
              <option value="plus">Plus</option>
              <option value="max">Max</option>
            </Select>
            <Select
              value={filters.moduleId}
              onChange={(e) => patch("moduleId", e.target.value)}
              className="min-w-[160px]"
            >
              <option value="all">All modules</option>
              {snap.moduleOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </Select>
            <Select
              value={filters.status}
              onChange={(e) => patch("status", e.target.value as "all" | InstituteStatus)}
              className="min-w-[130px]"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspended</option>
              <option value="archived">Archived</option>
            </Select>
          </ToolbarGroup>
          <ToolbarSpacer />
          <ToolbarMeta>How is the LumenX platform performing?</ToolbarMeta>
        </PageToolbar>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        <Kpi label="Institutes" value={format.count(kpis.institutes)} icon={<Building2 className="size-3.5" />} />
        <Kpi label="Active" value={format.count(kpis.activeInstitutes)} tone="up" />
        <Kpi
          label="Inactive"
          value={format.count(kpis.inactiveInstitutes)}
          tone={kpis.inactiveInstitutes ? "down" : "neutral"}
        />
        <Kpi label="Students (network)" value={format.count(kpis.students)} icon={<Users className="size-3.5" />} />
        <Kpi label="Faculty (network)" value={format.count(kpis.faculty)} icon={<GraduationCap className="size-3.5" />} />
        <Kpi label="Parents / users" value={format.count(kpis.platformUsers)} delta={`${format.count(kpis.parents)} parents`} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <Kpi label="Billed" value={format.money(kpis.billedInr)} icon={<CreditCard className="size-3.5" />} />
        <Kpi label="Paid" value={format.money(kpis.paidInr)} tone="up" />
        <Kpi label="Renewals in window" value={String(kpis.renewalsInWindow)} />
        <Kpi
          label="Support open"
          value={String(kpis.supportOpen)}
          delta={`${kpis.supportResolved} resolved`}
          icon={<LifeBuoy className="size-3.5" />}
        />
      </div>

      <section className="space-y-6">
        <div className="grid grid-cols-12 gap-4">
          <Card className="col-span-12 lg:col-span-6">
            <CardHeader
              title="Institute growth"
              hint="Live institutes on the platform"
              action={<Pill tone="info">{format.count(kpis.institutes)}</Pill>}
            />
            <TrendChart labels={series.labels} values={series.instituteGrowth} format={format.count} />
          </Card>
          <Card className="col-span-12 lg:col-span-6">
            <CardHeader
              title="Student growth"
              hint="Aggregate headcount across filtered institutes"
              action={<Pill tone="info">{format.count(kpis.students)}</Pill>}
            />
            <TrendChart labels={series.labels} values={series.studentGrowth} format={format.count} />
          </Card>
          <Card className="col-span-12 lg:col-span-6">
            <CardHeader title="Faculty growth" hint="Network faculty totals" />
            <TrendChart labels={series.labels} values={series.facultyGrowth} format={format.count} />
          </Card>
          <Card className="col-span-12 lg:col-span-6">
            <CardHeader
              title="Parent / user growth"
              hint="Parents + students + faculty + institute admins"
              action={<TrendingUp className="size-3.5 text-muted-foreground" />}
            />
            <TrendChart labels={series.labels} values={series.userGrowth} format={format.count} />
          </Card>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <Card className="col-span-12 lg:col-span-4">
            <CardHeader title="Plan distribution" hint="Core / Plus / Max across filtered set" />
            <div className="px-5 pb-5 space-y-3">
              {(["core", "plus", "max"] as const).map((tier) => {
                const n = planMix[tier];
                const pct = Math.round((n / planTotal) * 100);
                const bar =
                  tier === "core" ? "bg-muted-foreground" : tier === "plus" ? "bg-primary" : "bg-chart-5";
                return (
                  <div key={tier}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{planLabels[tier]}</span>
                      <span className="font-mono text-muted-foreground">
                        {n} · {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded bg-muted overflow-hidden">
                      <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="col-span-12 lg:col-span-8">
            <CardHeader title="Module adoption" hint="% of filtered institutes with module enabled" />
            <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 max-h-64 overflow-y-auto">
              {moduleAdoption.map((m) => {
                const accent = colorForModule(m.id);
                return (
                <div key={m.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="truncate pr-2">{m.label}</span>
                    <span className="font-mono text-muted-foreground shrink-0">{m.pct}%</span>
                  </div>
                  <div className="h-1.5 rounded bg-muted overflow-hidden">
                    <div
                      className="h-full"
                      style={{ width: `${m.pct}%`, background: accent.solid }}
                    />
                  </div>
                </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <Card className="col-span-12 lg:col-span-6">
            <CardHeader title="Billing trends" hint="Platform licensing billed vs paid (not student fees)" />
            <DualTrendChart
              labels={series.labels}
              a={series.billedInr}
              b={series.paidInr}
              aLabel="Billed"
              bLabel="Paid"
              format={(v) => format.money(v)}
            />
          </Card>
          <Card className="col-span-12 lg:col-span-6">
            <CardHeader title="Renewal trends" hint="Institutes in reminder window over time" />
            <BarChart labels={series.labels} values={series.renewals} />
          </Card>
          <Card className="col-span-12 lg:col-span-6">
            <CardHeader
              title="Usage trends"
              hint={`Network average active usage · now ${kpis.avgUsagePct}%`}
              action={<Activity className="size-3.5 text-muted-foreground" />}
            />
            <BarChart
              labels={usageTrend.map((u) => u.label)}
              values={usageTrend.map((u) => u.avgUsagePct)}
              suffix="%"
            />
          </Card>
          <Card className="col-span-12 lg:col-span-6">
            <CardHeader title="Support trends" hint="Open vs resolved thread volume (platform)" />
            <DualTrendChart
              labels={series.labels}
              a={series.supportOpen}
              b={series.supportResolved}
              aLabel="Open / in flight"
              bLabel="Resolved"
              format={(v) => String(v)}
            />
          </Card>
        </div>
      </section>

      <p className="mt-6 text-[11px] text-muted-foreground max-w-3xl leading-relaxed">
        Network Analytics is multi-institute and commercial/platform-scoped. It does not show class
        GPA, individual attendance, or person-level records — those stay in Admin Analytics for a
        single institute.
      </p>
    </AppShell>
  );
}

function TrendChart({
  labels,
  values,
  format,
}: {
  labels: string[];
  values: number[];
  format: (n: number) => string;
}) {
  const points = polylinePoints(values);
  const last = values[values.length - 1] ?? 0;
  return (
    <div className="px-5 pb-5">
      <div className="text-right text-[10px] font-mono text-muted-foreground mb-1">{format(last)}</div>
      <div className="relative h-36 w-full">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          {[25, 50, 75].map((y) => (
            <line
              key={y}
              x1="0"
              x2="100"
              y1={y}
              y2={y}
              stroke="currentColor"
              className="text-border"
              strokeWidth="0.3"
            />
          ))}
          <polyline
            fill="none"
            stroke="oklch(0.58 0.14 195)"
            strokeWidth="1.2"
            points={points}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <div className="flex justify-between mt-2 text-[10px] font-mono text-muted-foreground">
        {labels.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </div>
  );
}

function DualTrendChart({
  labels,
  a,
  b,
  aLabel,
  bLabel,
  format,
}: {
  labels: string[];
  a: number[];
  b: number[];
  aLabel: string;
  bLabel: string;
  format: (n: number) => string;
}) {
  const max = Math.max(1, ...a, ...b);
  return (
    <div className="px-5 pb-5">
      <div className="relative h-40 w-full">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          {[25, 50, 75].map((y) => (
            <line
              key={y}
              x1="0"
              x2="100"
              y1={y}
              y2={y}
              stroke="currentColor"
              className="text-border"
              strokeWidth="0.3"
            />
          ))}
          <polyline
            fill="none"
            stroke="oklch(0.58 0.14 195)"
            strokeWidth="1.2"
            points={polylinePoints(a, max)}
            vectorEffect="non-scaling-stroke"
          />
          <polyline
            fill="none"
            stroke="oklch(0.62 0.14 165)"
            strokeWidth="1.2"
            points={polylinePoints(b, max)}
            vectorEffect="non-scaling-stroke"
            strokeDasharray="3 2"
          />
        </svg>
      </div>
      <div className="flex justify-between mt-2 text-[10px] font-mono text-muted-foreground">
        {labels.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
      <div className="flex flex-wrap gap-4 mt-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <i className="block w-3 h-0.5 bg-primary" /> {aLabel} · {format(a[a.length - 1] ?? 0)}
        </span>
        <span className="flex items-center gap-1.5">
          <i className="block w-3 h-0.5 bg-success" /> {bLabel} · {format(b[b.length - 1] ?? 0)}
        </span>
      </div>
    </div>
  );
}

function BarChart({
  labels,
  values,
  suffix = "",
}: {
  labels: string[];
  values: number[];
  suffix?: string;
}) {
  const heights = barHeights(values);
  return (
    <div className="px-5 pb-5">
      <div className="h-40 flex items-end gap-2">
        {values.map((v, i) => (
          <div key={labels[i] ?? i} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
            <span className="text-[9px] font-mono text-muted-foreground">
              {v}
              {suffix}
            </span>
            <div className="w-full flex items-end h-28">
              <div
                className="w-full rounded-t-md bg-primary/40"
                style={{ height: `${heights[i]}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-[10px] font-mono text-muted-foreground">
        {labels.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </div>
  );
}
