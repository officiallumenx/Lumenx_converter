import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Button,
  Card,
  CardHeader,
  Kpi,
  PageToolbar,
  Pill,
  SegmentedControl,
  ToolbarGroup,
  ToolbarMeta,
  ToolbarSpacer,
} from "@lumenx/ui-admin";
import {
  Building2,
  Briefcase,
  ShieldAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { subscribeInstituteDirectory } from "@/lib/institute-directory-store";
import { subscribeLicenses } from "@/lib/institute-licensing-store";
import {
  buildHealthRisksSnapshot,
  formatRiskDate,
  labelRiskLevel,
  riskLevelTone,
  type HealthRiskItem,
  type RiskLevel,
  type SuggestedAction,
} from "@/lib/platform-health-risks";

export const Route = createFileRoute("/health-risks")({
  head: () => ({ meta: [{ title: "Health & Risks — LumenX Nexus" }] }),
  component: HealthRisksPage,
});

type Lane = "institute" | "business";
type LevelFilter = "all" | RiskLevel;

function HealthRisksPage() {
  const [tick, setTick] = useState(0);
  const [lane, setLane] = useState<Lane>("institute");
  const [level, setLevel] = useState<LevelFilter>("all");

  useEffect(() => {
    const a = subscribeInstituteDirectory(() => setTick((t) => t + 1));
    const b = subscribeLicenses(() => setTick((t) => t + 1));
    return () => {
      a();
      b();
    };
  }, []);

  const snap = useMemo(() => buildHealthRisksSnapshot(), [tick]);
  const rows = lane === "institute" ? snap.instituteRisks : snap.businessRisks;
  const stats = lane === "institute" ? snap.instituteStats : snap.businessStats;
  const filtered = level === "all" ? rows : rows.filter((r) => r.level === level);

  return (
    <AppShell
      title="Health & Risks"
      subtitle="Institute operational risk · Nexus commercial risk · institute-level only"
      actions={
        <>
          <Link to="/support">
            <Button>Support</Button>
          </Link>
          <Link to="/billing">
            <Button variant="primary">Billing</Button>
          </Link>
        </>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Kpi
          label="Institute risks"
          value={String(snap.instituteStats.total)}
          delta={`${snap.instituteStats.high} high`}
          tone={snap.instituteStats.high ? "down" : "up"}
          icon={<Building2 className="size-3.5" />}
        />
        <Kpi
          label="Business risks"
          value={String(snap.businessStats.total)}
          delta={`${snap.businessStats.high} high`}
          tone={snap.businessStats.high ? "down" : "up"}
          icon={<Briefcase className="size-3.5" />}
        />
        <Kpi
          label="High (this lane)"
          value={String(stats.high)}
          tone={stats.high ? "down" : "neutral"}
          icon={<ShieldAlert className="size-3.5" />}
        />
        <Kpi label="Medium / Low" value={`${stats.medium} / ${stats.low}`} />
      </div>

      <Card className="mb-6">
        <PageToolbar>
          <ToolbarGroup>
            <SegmentedControl
              value={lane}
              onChange={setLane}
              options={[
                { value: "institute", label: "Institute risk" },
                { value: "business", label: "Nexus business risk" },
              ]}
            />
          </ToolbarGroup>
          <ToolbarSpacer />
          <ToolbarGroup>
            <SegmentedControl
              value={level}
              onChange={setLevel}
              options={[
                { value: "all", label: "All levels" },
                { value: "high", label: "High" },
                { value: "medium", label: "Medium" },
                { value: "low", label: "Low" },
              ]}
            />
          </ToolbarGroup>
          <ToolbarMeta>{filtered.length} shown · no personal records</ToolbarMeta>
        </PageToolbar>
      </Card>

      {lane === "institute" ? (
        <p className="text-[11px] text-muted-foreground mb-4">
          Operational health of institutes on the platform — usage, enrollment signals, modules,
          storage, and unresolved support. Not student or staff profiles.
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground mb-4">
          Commercial risk to LumenX — payments, renewals, engagement, churn likelihood, and support
          burden. Suggested actions are operator workflows.
        </p>
      )}

      <Card>
        <CardHeader
          title={lane === "institute" ? "Institute risk register" : "Nexus business risk register"}
          hint="Institute · Risk · Reason · Date · Suggested action"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background/40 border-b border-border">
                <th className="px-5 py-3 font-semibold">Institute</th>
                <th className="px-5 py-3 font-semibold">Risk</th>
                <th className="px-5 py-3 font-semibold">Level</th>
                <th className="px-5 py-3 font-semibold min-w-[220px]">Reason</th>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Suggested action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-xs text-muted-foreground">
                    No risks match this filter.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => <RiskRow key={row.id} row={row} />)
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}

function RiskRow({ row }: { row: HealthRiskItem }) {
  return (
    <tr className="hover:bg-surface-hover transition-colors align-top">
      <td className="px-5 py-3">
        <Link
          to="/institutes/$id"
          params={{ id: row.instituteId }}
          className="text-xs font-medium text-primary hover:underline"
        >
          {row.instituteName}
        </Link>
        <div className="text-[10px] text-muted-foreground mt-0.5">{row.location}</div>
      </td>
      <td className="px-5 py-3 text-xs font-medium max-w-[180px]">{row.risk}</td>
      <td className="px-5 py-3">
        <Pill tone={riskLevelTone(row.level)}>{labelRiskLevel(row.level)}</Pill>
      </td>
      <td className="px-5 py-3 text-xs text-muted-foreground max-w-sm leading-relaxed">{row.reason}</td>
      <td className="px-5 py-3 text-[11px] font-mono text-muted-foreground whitespace-nowrap">
        {formatRiskDate(row.date)}
      </td>
      <td className="px-5 py-3">
        <ActionButton row={row} />
      </td>
    </tr>
  );
}

function ActionButton({ row }: { row: HealthRiskItem }) {
  const label = row.suggestedAction;
  if (row.actionTo === "/institutes/$id") {
    return (
      <Link to="/institutes/$id" params={{ id: row.instituteId }}>
        <Button className="h-7 text-[11px]">{label}</Button>
      </Link>
    );
  }
  if (row.actionTo === "/billing") {
    return (
      <Link to="/billing">
        <Button className="h-7 text-[11px]">{label}</Button>
      </Link>
    );
  }
  if (row.actionTo === "/modules") {
    return (
      <Link to="/modules">
        <Button className="h-7 text-[11px]">{label}</Button>
      </Link>
    );
  }
  if (row.actionTo === "/support") {
    return (
      <Link to="/support">
        <Button className="h-7 text-[11px]">{label}</Button>
      </Link>
    );
  }
  return <Button className="h-7 text-[11px]">{label as SuggestedAction}</Button>;
}
