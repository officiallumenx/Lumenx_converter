/**
 * Nexus institute subscription periods — API auth mode.
 */
import { useEffect, useState } from "react";
import { Card, CardHeader, Pill } from "@lumenx/ui-admin";
import {
  listSubscriptionPeriods,
  listSubscriptions,
  type SubscriptionDto,
  type SubscriptionPeriodDto,
} from "@/lib/subscriptions/api";

function formatInr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function NexusSubscriptionBillingHistoryApiPanel({
  instituteId,
}: {
  instituteId: string;
}) {
  const [sub, setSub] = useState<SubscriptionDto | null>(null);
  const [periods, setPeriods] = useState<SubscriptionPeriodDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const rows = await listSubscriptions(instituteId);
        const row = rows[0] ?? null;
        if (cancelled) return;
        setSub(row);
        if (!row) {
          setPeriods([]);
          return;
        }
        const periodRows = await listSubscriptionPeriods(row.id);
        if (!cancelled) setPeriods(periodRows);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load history");
          setSub(null);
          setPeriods([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [instituteId]);

  return (
    <Card className="mb-4">
      <CardHeader
        title="Subscription billing history"
        hint="Periods from GET /api/nexus/subscriptions/:id/periods"
      />
      <div className="px-5 pb-5 space-y-3">
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {!loading && !error && !sub ? (
          <p className="text-sm text-muted-foreground">No subscription row for this institute.</p>
        ) : null}
        {sub ? (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Pill tone={sub.lifecycleStatus === "active" ? "success" : "neutral"}>
              {sub.lifecycleStatus.replace(/_/g, " ")}
            </Pill>
            <span className="text-muted-foreground">
              {sub.activeStudentCount.toLocaleString("en-IN")} students ·{" "}
              {formatInr(sub.assignedRateInr)} / student
            </span>
          </div>
        ) : null}
        {periods.length === 0 && sub && !loading ? (
          <p className="text-sm text-muted-foreground">No billing periods yet.</p>
        ) : null}
        {periods.map((p) => (
          <div
            key={p.id}
            className="rounded-lg border border-border px-3 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2"
          >
            <div>
              <div className="font-medium">
                {p.durationMonths} mo · {formatDate(p.startsAt)} → {formatDate(p.endsAt)}
                {p.isCurrent ? " · current" : ""}
              </div>
              <div className="text-muted-foreground">
                {p.paymentMethod} · {p.paymentRef ?? "no ref"}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono font-semibold">{formatInr(p.payableAmountInr)}</div>
              <Pill tone={p.paymentStatus === "paid" ? "success" : "neutral"}>
                {p.paymentStatus}
              </Pill>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
