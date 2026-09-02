import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  DataTable,
  Kpi,
  Pill,
  Td,
  Th,
  Tr,
} from "@lumenx/ui-admin";
import { CreditCard } from "lucide-react";
import { NexusOfflinePaymentsInbox } from "@/components/billing/NexusOfflinePaymentsInbox";
import { listLicenses, type LicenseDto } from "@/lib/licenses/api";
import { listSubscriptions, type SubscriptionDto } from "@/lib/subscriptions/api";

function formatInr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

type InstituteOption = { id: string; name: string };

export function BillingPortfolioApiPanel({
  institutes,
}: {
  institutes: InstituteOption[];
}) {
  const [subs, setSubs] = useState<SubscriptionDto[]>([]);
  const [licenses, setLicenses] = useState<LicenseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, l] = await Promise.all([listSubscriptions(), listLicenses()]);
      setSubs(s);
      setLicenses(l);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load billing portfolio");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const nameById = useMemo(
    () => new Map(institutes.map((i) => [i.id, i.name])),
    [institutes],
  );
  const licenseByInstitute = useMemo(
    () => new Map(licenses.map((l) => [l.instituteId, l])),
    [licenses],
  );

  const kpis = useMemo(() => {
    const active = subs.filter((s) => s.lifecycleStatus === "active").length;
    const trial = subs.filter((s) =>
      s.lifecycleStatus.startsWith("trial"),
    ).length;
    const billed = subs.reduce(
      (acc, s) => acc + (s.currentPeriod?.payableAmountInr ?? 0),
      0,
    );
    const paid = subs.reduce(
      (acc, s) => acc + (s.currentPeriod?.amountPaidInr ?? 0),
      0,
    );
    return { active, trial, billed, paid, total: subs.length };
  }, [subs]);

  return (
    <div className="space-y-6">
      <NexusOfflinePaymentsInbox />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi label="Subscriptions" value={String(kpis.total)} icon={<CreditCard className="size-3.5" />} />
        <Kpi label="Active" value={String(kpis.active)} tone="up" />
        <Kpi label="Trial" value={String(kpis.trial)} />
        <Kpi label="Current billed" value={formatInr(kpis.billed)} />
        <Kpi label="Current paid" value={formatInr(kpis.paid)} tone="up" />
      </div>

      <Card>
        <CardHeader
          title="Subscription portfolio"
          hint="Live from GET /api/nexus/subscriptions (+ licenses)"
          action={
            <Button size="sm" variant="outline" onClick={() => void reload()}>
              Refresh
            </Button>
          }
        />
        {loading ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">Loading…</p>
        ) : error ? (
          <p className="px-5 pb-5 text-sm text-destructive">{error}</p>
        ) : subs.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">No subscriptions yet.</p>
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Institute</Th>
                <Th>Plan</Th>
                <Th>Lifecycle</Th>
                <Th>Students</Th>
                <Th>Rate</Th>
                <Th>Period</Th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => {
                const plan = licenseByInstitute.get(s.instituteId)?.plan ?? "—";
                return (
                  <Tr key={s.id}>
                    <Td className="font-medium">
                      {nameById.get(s.instituteId) ?? s.instituteId.slice(0, 8)}
                    </Td>
                    <Td className="capitalize">{plan}</Td>
                    <Td>
                      <Pill tone={s.lifecycleStatus === "active" ? "success" : "neutral"}>
                        {s.lifecycleStatus.replace(/_/g, " ")}
                      </Pill>
                    </Td>
                    <Td className="tabular-nums">{s.activeStudentCount}</Td>
                    <Td className="font-mono">{formatInr(s.assignedRateInr)}</Td>
                    <Td className="text-xs text-muted-foreground">
                      {s.currentPeriod
                        ? `${s.currentPeriod.startsAt.slice(0, 10)} → ${s.currentPeriod.endsAt.slice(0, 10)}`
                        : "—"}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </DataTable>
        )}
      </Card>
    </div>
  );
}
