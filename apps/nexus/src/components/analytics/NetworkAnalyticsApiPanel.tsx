import { useEffect, useState } from "react";
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
  Building2,
  CreditCard,
  GraduationCap,
  LifeBuoy,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  getNetworkAnalytics,
  type NetworkAnalyticsDto,
  type NetworkAnalyticsRange,
} from "@/lib/analytics/api";
import { barHeights, polylinePoints } from "@/lib/network-analytics-metrics";
import { colorForModule } from "@/lib/nexus-module-colors";

const DATE_RANGE_OPTIONS: Array<{ id: NetworkAnalyticsRange; label: string }> = [
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "6m", label: "Last 6 months" },
  { id: "12m", label: "Last 12 months" },
];

function formatCount(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n);
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function NetworkAnalyticsApiPanel() {
  const [range, setRange] = useState<NetworkAnalyticsRange>("6m");
  const [instituteId, setInstituteId] = useState("all");
  const [plan, setPlan] = useState<"all" | "core" | "plus" | "max">("all");
  const [data, setData] = useState<NetworkAnalyticsDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getNetworkAnalytics({
      range,
      instituteId: instituteId === "all" ? undefined : instituteId,
      plan,
    })
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((err) => {
        if (!cancelled) {
          setData(null);
          setError(err instanceof Error ? err.message : "Failed to load network analytics");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range, instituteId, plan]);

  const kpis = data?.kpis;
  const series = data?.series;
  const planMix = data?.planMix ?? { core: 0, plus: 0, max: 0 };
  const planTotal = planMix.core + planMix.plus + planMix.max || 1;

  return (
    <>
      <Card className="mb-6">
        <PageToolbar>
          <ToolbarGroup>
            <Select
              value={range}
              onChange={(e) => setRange(e.target.value as NetworkAnalyticsRange)}
              className="min-w-[150px]"
            >
              {DATE_RANGE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Select
              value={instituteId}
              onChange={(e) => setInstituteId(e.target.value)}
              className="min-w-[180px]"
            >
              <option value="all">All institutes</option>
              {(data?.instituteOptions ?? []).map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </Select>
            <Select
              value={plan}
              onChange={(e) => setPlan(e.target.value as "all" | "core" | "plus" | "max")}
              className="min-w-[120px]"
            >
              <option value="all">All plans</option>
              <option value="core">Core</option>
              <option value="plus">Plus</option>
              <option value="max">Max</option>
            </Select>
          </ToolbarGroup>
          <ToolbarSpacer />
          <ToolbarMeta>
            {loading ? "Loading live aggregates…" : "Live platform aggregates from API"}
          </ToolbarMeta>
        </PageToolbar>
      </Card>

      {error ? (
        <p className="mb-4 text-sm text-destructive">{error}</p>
      ) : null}

      {!kpis || !series ? (
        <p className="text-sm text-muted-foreground">
          {loading ? "Loading network analytics…" : "No analytics available."}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
            <Kpi label="Institutes" value={formatCount(kpis.institutes)} icon={<Building2 className="size-3.5" />} />
            <Kpi label="Active" value={formatCount(kpis.activeInstitutes)} tone="up" />
            <Kpi
              label="Inactive"
              value={formatCount(kpis.inactiveInstitutes)}
              tone={kpis.inactiveInstitutes ? "down" : "neutral"}
            />
            <Kpi label="Students (network)" value={formatCount(kpis.students)} icon={<Users className="size-3.5" />} />
            <Kpi
              label="Faculty (network)"
              value={formatCount(kpis.faculty)}
              icon={<GraduationCap className="size-3.5" />}
            />
            <Kpi
              label="Parents / users"
              value={formatCount(kpis.platformUsers)}
              delta={`${formatCount(kpis.parents)} parents`}
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            <Kpi label="Billed" value={formatMoney(kpis.billedInr)} icon={<CreditCard className="size-3.5" />} />
            <Kpi label="Paid" value={formatMoney(kpis.paidInr)} tone="up" />
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
                  hint="Cumulative institutes by created month"
                  action={<Pill tone="info">{formatCount(kpis.institutes)}</Pill>}
                />
                <TrendChart labels={series.labels} values={series.instituteGrowth} format={formatCount} />
              </Card>
              <Card className="col-span-12 lg:col-span-6">
                <CardHeader
                  title="Student growth"
                  hint="Cumulative student records"
                  action={<Pill tone="info">{formatCount(kpis.students)}</Pill>}
                />
                <TrendChart labels={series.labels} values={series.studentGrowth} format={formatCount} />
              </Card>
              <Card className="col-span-12 lg:col-span-6">
                <CardHeader title="Faculty growth" hint="Cumulative teacher records" />
                <TrendChart labels={series.labels} values={series.facultyGrowth} format={formatCount} />
              </Card>
              <Card className="col-span-12 lg:col-span-6">
                <CardHeader
                  title="Parent / user growth"
                  hint="Parents + students + faculty"
                  action={<TrendingUp className="size-3.5 text-muted-foreground" />}
                />
                <TrendChart labels={series.labels} values={series.userGrowth} format={formatCount} />
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
                      tier === "core"
                        ? "bg-muted-foreground"
                        : tier === "plus"
                          ? "bg-primary"
                          : "bg-chart-5";
                    return (
                      <div key={tier}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="capitalize">{tier}</span>
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
                  {(data.moduleAdoption ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground col-span-2">No module entitlements yet.</p>
                  ) : (
                    data.moduleAdoption.map((m) => {
                      const accent = colorForModule(m.id);
                      return (
                        <div key={m.id}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="truncate pr-2 capitalize">{m.label}</span>
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
                    })
                  )}
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-12 gap-4">
              <Card className="col-span-12 lg:col-span-6">
                <CardHeader title="Billing trends" hint="Licensing billed vs paid by period month" />
                <DualTrendChart
                  labels={series.labels}
                  a={series.billedInr}
                  b={series.paidInr}
                  aLabel="Billed"
                  bLabel="Paid"
                  format={formatMoney}
                />
              </Card>
              <Card className="col-span-12 lg:col-span-6">
                <CardHeader title="Renewal trends" hint="Period end dates by month" />
                <MiniBarChart labels={series.labels} values={series.renewals} />
              </Card>
              <Card className="col-span-12">
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
            Live Network Analytics from <code className="font-mono">GET /api/nexus/analytics/network</code>.
            Aggregates only — no class GPA or person-level school ops.
          </p>
        </>
      )}
    </>
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
          <span key={`${m}-${format(0)}`}>{m}</span>
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
        <span>
          {aLabel}: {format(a[a.length - 1] ?? 0)}
        </span>
        <span>
          {bLabel}: {format(b[b.length - 1] ?? 0)}
        </span>
      </div>
    </div>
  );
}

function MiniBarChart({ labels, values }: { labels: string[]; values: number[] }) {
  const heights = barHeights(values);
  return (
    <div className="px-5 pb-5">
      <div className="flex items-end gap-1 h-36">
        {heights.map((h, i) => (
          <div key={`${labels[i]}-${i}`} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full rounded-t bg-primary/70" style={{ height: `${h}%` }} />
            <span className="text-[9px] font-mono text-muted-foreground">{labels[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
