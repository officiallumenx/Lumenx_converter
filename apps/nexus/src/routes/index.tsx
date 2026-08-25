import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Button, Card, CardHeader, Kpi, Pill } from "@lumenx/ui-admin";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CreditCard,
  GraduationCap,
  HardDrive,
  HeartHandshake,
  Layers,
  LifeBuoy,
  RefreshCw,
  ShieldAlert,
  TrendingDown,
  Users,
  UserCircle2,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  buildMissionControlSnapshot,
  type PlatformActivityKind,
} from "@/lib/command-center-metrics";
import { subscribeInstituteDirectory } from "@/lib/institute-directory-store";
import { subscribeLicenses } from "@/lib/institute-licensing-store";
import { colorForModule } from "@/lib/nexus-module-colors";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Command Center — LumenX Nexus" }] }),
  component: MissionControlPage,
});

const activityTone: Record<PlatformActivityKind, string> = {
  plan_changed: "bg-primary/10 text-primary border-primary/20",
  module_toggled: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  institute_created: "bg-success/10 text-success border-success/20",
  payment_status: "bg-warning/10 text-warning border-warning/20",
  support_ticket: "bg-destructive/10 text-destructive border-destructive/20",
};

function MissionControlPage() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const unsubDir = subscribeInstituteDirectory(() => setTick((t) => t + 1));
    const unsubLic = subscribeLicenses(() => setTick((t) => t + 1));
    return () => {
      unsubDir();
      unsubLic();
    };
  }, []);

  const snap = useMemo(() => buildMissionControlSnapshot(), [tick]);
  const { kpis, business, platform, risk, activity, format } = snap;
  const planTotal = business.planMix.core + business.planMix.plus + business.planMix.max || 1;

  return (
    <AppShell
      title="Command Center"
      subtitle="LumenX platform overview · institutes, plans, billing, health, and support"
      actions={
        <>
          <Link to="/institutes">
            <Button>
              Institutes <ArrowUpRight className="size-3" />
            </Button>
          </Link>
          <Link to="/billing">
            <Button variant="primary">
              Billing <ArrowUpRight className="size-3" />
            </Button>
          </Link>
        </>
      }
    >
      {/* Top platform KPIs — two rows so labels/icons don’t crush */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          <Kpi label="Total Institutes" value={format.count(kpis.totalInstitutes)} icon={<Building2 className="size-3.5" />} />
          <Kpi label="Active" value={format.count(kpis.activeInstitutes)} tone="up" />
          <Kpi label="Trial" value={format.count(kpis.trialInstitutes)} />
          <Kpi
            label="Suspended"
            value={format.count(kpis.suspendedInstitutes)}
            tone={kpis.suspendedInstitutes ? "down" : "neutral"}
          />
          <Kpi
            label="Overdue"
            value={format.count(kpis.overdueInstitutes)}
            tone={kpis.overdueInstitutes ? "down" : "up"}
            icon={<AlertTriangle className="size-3.5" />}
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Students (all)" value={format.count(kpis.totalStudents)} icon={<Users className="size-3.5" />} />
          <Kpi label="Faculty (all)" value={format.count(kpis.totalFaculty)} icon={<GraduationCap className="size-3.5" />} />
          <Kpi label="Parents (all)" value={format.count(kpis.totalParents)} icon={<UserCircle2 className="size-3.5" />} />
          <Kpi
            label="Platform Users"
            value={format.count(kpis.totalPlatformUsers)}
            delta="All roles combined"
            icon={<HeartHandshake className="size-3.5" />}
          />
        </div>
      </div>

      {/* Business */}
      <section className="mt-8">
        <SectionLabel title="Business" hint="Plans, revenue signal, renewals" />
        <div className="grid grid-cols-12 gap-4 mt-3">
          <Card className="col-span-12 lg:col-span-4">
            <CardHeader
              title="Active plans"
              hint={`${business.activePlans} institutes on a live plan`}
              action={<Link to="/modules"><Button>Modules</Button></Link>}
            />
            <div className="px-5 pb-5 space-y-3">
              {(["core", "plus", "max"] as const).map((tier) => {
                const n = business.planMix[tier];
                const pct = Math.round((n / planTotal) * 100);
                const bar =
                  tier === "core" ? "bg-muted-foreground" : tier === "plus" ? "bg-primary" : "bg-chart-5";
                return (
                  <div key={tier}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>{business.planLabels[tier]}</span>
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

          <Card className="col-span-12 sm:col-span-6 lg:col-span-4">
            <CardHeader title="Revenue signal" hint="Institute licensing · not student fees" />
            <div className="px-5 pb-5 grid grid-cols-2 gap-3">
              <MetricTile label="Paid" value={format.money(business.revenuePaidInr)} tone="success" />
              <MetricTile label="Billed" value={format.money(business.revenueBilledInr)} />
              <MetricTile
                label="Pending"
                value={format.money(business.pendingInr)}
                tone={business.pendingInr ? "warning" : "neutral"}
              />
              <MetricTile
                label="Overdue institutes"
                value={String(business.overdueCount)}
                tone={business.overdueCount ? "danger" : "success"}
              />
            </div>
            <div className="px-5 pb-5">
              <Link to="/billing">
                <Button className="w-full justify-center">
                  Open billing <ArrowUpRight className="size-3" />
                </Button>
              </Link>
            </div>
          </Card>

          <Card className="col-span-12 sm:col-span-6 lg:col-span-4">
            <CardHeader
              title="Upcoming renewals"
              hint={`${business.upcomingRenewals.length} in reminder window`}
              action={<Pill tone="info">{business.upcomingRenewals.length}</Pill>}
            />
            <div className="px-5 pb-5 space-y-2.5">
              {business.upcomingRenewals.length === 0 ? (
                <p className="text-xs text-muted-foreground">No renewals in the current reminder window.</p>
              ) : (
                business.upcomingRenewals.map((r) => (
                  <div key={r.instituteId} className="flex items-start justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{r.instituteName}</div>
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        {business.planLabels[r.plan]} · {format.money(r.amountInr)}
                      </div>
                    </div>
                    <Pill tone={r.status === "overdue" ? "danger" : r.status === "due" ? "warning" : "info"}>
                      {r.status === "overdue"
                        ? `${Math.abs(r.daysUntil)}d overdue`
                        : r.daysUntil === 0
                          ? "Due today"
                          : `${r.daysUntil}d`}
                    </Pill>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </section>

      {/* Platform */}
      <section className="mt-8">
        <SectionLabel title="Platform" hint="Adoption, usage, health, support" />
        <div className="grid grid-cols-12 gap-4 mt-3">
          <Card className="col-span-12 lg:col-span-5">
            <CardHeader title="Module adoption" hint="Share of live institutes with module enabled" />
            <div className="px-5 pb-5 space-y-2.5 max-h-72 overflow-y-auto">
              {platform.moduleAdoption.map((m) => {
                const accent = colorForModule(m.id);
                return (
                <div key={m.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="truncate pr-2">{m.label}</span>
                    <span className="font-mono text-muted-foreground shrink-0">
                      {m.enabled}/{m.total} · {m.pct}%
                    </span>
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

          <Card className="col-span-12 sm:col-span-6 lg:col-span-3">
            <CardHeader title="Active usage" hint={`Platform avg ${platform.avgActiveUsagePct}%`} />
            <div className="px-5 pb-5 space-y-3">
              <MetricTile label="Healthy" value={String(platform.activeUsageHealthy)} tone="success" />
              <MetricTile label="Moderate" value={String(platform.activeUsageModerate)} tone="info" />
              <MetricTile label="Low / inactive" value={String(platform.activeUsageLow)} tone="warning" />
            </div>
          </Card>

          <Card className="col-span-12 sm:col-span-6 lg:col-span-4">
            <CardHeader
              title="Inactive institutes"
              hint="Suspended or usage below threshold"
              action={<Pill tone={platform.inactiveInstitutes.length ? "warning" : "success"}>{platform.inactiveInstitutes.length}</Pill>}
            />
            <div className="px-5 pb-5 space-y-2.5">
              {platform.inactiveInstitutes.length === 0 ? (
                <p className="text-xs text-muted-foreground">No inactive institutes in the live set.</p>
              ) : (
                platform.inactiveInstitutes.slice(0, 5).map((i) => (
                  <Link
                    key={i.id}
                    to="/institutes/$id"
                    params={{ id: i.id }}
                    className="flex items-center justify-between gap-2 text-xs hover:bg-surface-hover -mx-2 px-2 py-1.5 rounded-md transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{i.name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{i.location}</div>
                    </div>
                    <span className="font-mono text-muted-foreground shrink-0">{i.usagePct}%</span>
                  </Link>
                ))
              )}
            </div>
          </Card>

          <Card className="col-span-12 md:col-span-6 lg:col-span-6">
            <CardHeader
              title="Platform health"
              hint="Infrastructure signals"
              action={<Pill tone={platform.health.healthTone} pulse>{platform.health.healthLabel}</Pill>}
            />
            <div className="px-5 pb-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <HealthCell label="API p99" value={`${platform.health.apiP99Ms}ms`} icon={Activity} />
              <HealthCell label="Ingest lag" value={`${platform.health.ingestLagSec}s`} icon={RefreshCw} />
              <HealthCell label="Job failures (24h)" value={String(platform.health.jobFailures24h)} icon={ShieldAlert} />
              <HealthCell label="Avg institute usage" value={`${platform.avgActiveUsagePct}%`} icon={Layers} />
            </div>
          </Card>

          <Card className="col-span-12 md:col-span-6 lg:col-span-6">
            <CardHeader
              title="Support & SLA"
              hint="Platform tickets · institute names only"
              action={
                <Link to="/support">
                  <Button>Support</Button>
                </Link>
              }
            />
            <div className="px-5 pb-5 grid grid-cols-2 gap-3">
              <MetricTile
                label="Open tickets"
                value={String(platform.openTickets)}
                tone="info"
                icon={<LifeBuoy className="size-3.5" />}
              />
              <MetricTile
                label="SLA breaches"
                value={String(platform.slaBreaches)}
                tone={platform.slaBreaches ? "danger" : "success"}
                icon={<AlertTriangle className="size-3.5" />}
              />
            </div>
          </Card>
        </div>
      </section>

      {/* Risk */}
      <section className="mt-8">
        <SectionLabel title="Risk" hint="Institute-level watchlist · aggregates only" />
        <div className="grid grid-cols-12 gap-4 mt-3">
          <Card className="col-span-12 lg:col-span-5">
            <CardHeader title="Top risky institutes" action={<Pill tone="danger">{risk.topRisky.length}</Pill>} />
            <div className="px-5 pb-5 space-y-2.5">
              {risk.topRisky.length === 0 ? (
                <p className="text-xs text-muted-foreground">No elevated risk institutes.</p>
              ) : (
                risk.topRisky.map((i) => (
                  <Link
                    key={i.id}
                    to="/institutes/$id"
                    params={{ id: i.id }}
                    className="flex items-start justify-between gap-3 text-xs hover:bg-surface-hover -mx-2 px-2 py-2 rounded-md transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{i.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {i.location} · {format.count(i.studentCount)} students · {i.usagePct}% usage
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {i.reasons.map((r) => (
                          <span
                            key={r}
                            className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-border text-muted-foreground"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Pill tone={i.riskTone === "danger" ? "danger" : i.riskTone === "warning" ? "warning" : "neutral"}>
                      {i.riskLabel}
                    </Pill>
                  </Link>
                ))
              )}
            </div>
          </Card>

          <div className="col-span-12 lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <RiskList
              title="Usage decline"
              empty="No declining usage signals."
              icon={<TrendingDown className="size-3.5" />}
              rows={risk.usageDecline.map((r) => ({
                id: r.id,
                name: r.name,
                meta: `${r.location} · ${r.usagePct}%`,
                value: `${r.deltaPts > 0 ? "+" : ""}${r.deltaPts} pts`,
                danger: r.deltaPts < 0,
              }))}
            />
            <RiskList
              title="Student-count decline"
              empty="No enrollment decline signals."
              icon={<Users className="size-3.5" />}
              rows={risk.studentDecline.map((r) => ({
                id: r.id,
                name: r.name,
                meta: `${r.location} · ${format.count(r.studentCount)}`,
                value: format.count(r.delta),
                danger: true,
              }))}
            />
            <RiskList
              title="Payment risk"
              empty="No payment risk institutes."
              icon={<CreditCard className="size-3.5" />}
              rows={risk.paymentRisk.map((r) => ({
                id: r.id,
                name: r.name,
                meta: `${r.location} · ${r.paymentStatus}`,
                value: format.money(r.pendingInr),
                danger: r.paymentStatus === "overdue",
              }))}
            />
            <RiskList
              title="Storage risk"
              empty="No storage pressure institutes."
              icon={<HardDrive className="size-3.5" />}
              rows={risk.storageRisk.map((r) => ({
                id: r.id,
                name: r.name,
                meta: r.location,
                value: `${r.pressurePct}%`,
                danger: r.pressurePct >= 85,
              }))}
            />
            <RiskList
              title="Support risk"
              empty="No support-risk institutes."
              className="sm:col-span-2"
              icon={<LifeBuoy className="size-3.5" />}
              rows={risk.supportRisk.map((r) => ({
                id: r.id,
                name: r.name,
                meta: `${r.location} · ${r.risk}`,
                value: `${r.openTicketsDemo} open`,
                danger: r.risk === "critical",
              }))}
            />
          </div>
        </div>
      </section>

      {/* Recent platform activity */}
      <section className="mt-8 mb-2">
        <SectionLabel title="Recent platform activity" hint="Commercial and lifecycle events · no personal names" />
        <Card className="mt-3">
          <CardHeader
            title="Activity feed"
            action={
              <span className="flex items-center gap-1.5 text-[10px] text-success font-mono uppercase tracking-wider">
                <span className="size-1.5 rounded-full bg-success animate-pulse" /> Demo feed
              </span>
            }
          />
          <div className="px-5 pb-5 space-y-1">
            {activity.map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-3 py-2.5 border-b border-border last:border-0"
              >
                <div
                  className={`size-8 rounded-md border flex items-center justify-center shrink-0 ${activityTone[a.kind]}`}
                >
                  <ActivityIcon kind={a.kind} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-relaxed">
                    <span className="font-medium">{a.title}</span>
                    {a.instituteName ? (
                      <>
                        {" "}
                        <span className="text-muted-foreground">·</span>{" "}
                        <span className="text-primary">{a.instituteName}</span>
                      </>
                    ) : null}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{a.detail}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 font-mono">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </AppShell>
  );
}

function SectionLabel({ title, hint }: { title: string; hint: string }) {
  return (
    <div>
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>
    </div>
  );
}

function MetricTile({
  label,
  value,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  icon?: ReactNode;
}) {
  const toneCls =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "danger"
          ? "text-destructive"
          : tone === "info"
            ? "text-primary"
            : "text-muted-foreground";
  return (
    <div className="p-3 rounded-md border border-border bg-background/40">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={`font-mono mt-1.5 text-sm ${toneCls}`}>{value}</div>
    </div>
  );
}

function HealthCell({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Activity;
}) {
  return (
    <div className="p-3 rounded-md border border-border bg-background/40">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3" /> {label}
      </div>
      <div className="font-mono mt-1.5">{value}</div>
    </div>
  );
}

function RiskList({
  title,
  empty,
  rows,
  icon,
  className = "",
}: {
  title: string;
  empty: string;
  icon?: ReactNode;
  className?: string;
  rows: { id: string; name: string; meta: string; value: string; danger?: boolean }[];
}) {
  return (
    <Card className={className}>
      <CardHeader
        title={title}
        action={icon ? <span className="text-muted-foreground">{icon}</span> : undefined}
      />
      <div className="px-5 pb-5 space-y-2.5">
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">{empty}</p>
        ) : (
          rows.map((r) => (
            <Link
              key={r.id}
              to="/institutes/$id"
              params={{ id: r.id }}
              className="flex items-center justify-between gap-2 text-xs hover:bg-surface-hover -mx-2 px-2 py-1.5 rounded-md transition-colors"
            >
              <div className="min-w-0">
                <div className="font-medium truncate">{r.name}</div>
                <div className="text-[10px] text-muted-foreground truncate">{r.meta}</div>
              </div>
              <span className={`font-mono shrink-0 ${r.danger ? "text-destructive" : "text-muted-foreground"}`}>
                {r.value}
              </span>
            </Link>
          ))
        )}
      </div>
    </Card>
  );
}

function ActivityIcon({ kind }: { kind: PlatformActivityKind }) {
  const cls = "size-3.5";
  if (kind === "plan_changed") return <Layers className={cls} />;
  if (kind === "module_toggled") return <Layers className={cls} />;
  if (kind === "institute_created") return <Building2 className={cls} />;
  if (kind === "payment_status") return <CreditCard className={cls} />;
  return <LifeBuoy className={cls} />;
}
