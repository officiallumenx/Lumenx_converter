/**
 * Nexus — immutable subscription billing history for one institute.
 */

import { useEffect, useState } from "react";
import { Card, CardHeader, Pill } from "@lumenx/ui-admin";
import {
  getInstituteBillingHistory,
  labelSubscriptionDuration,
  labelSubscriptionLifecycle,
  subscribeSubscriptions,
  type BillingAdjustment,
  type PaymentRecord,
  type RenewalRecord,
} from "@lumenx/utils";

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

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        {label}
      </div>
      <div className="mt-0.5 text-xs font-medium break-all">{value}</div>
    </div>
  );
}

export function NexusSubscriptionBillingHistoryPanel({
  instituteId,
}: {
  instituteId: string;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => subscribeSubscriptions(() => setTick((t) => t + 1)), [instituteId]);
  void tick;

  const history = getInstituteBillingHistory(instituteId);
  const sub = history.subscription;

  return (
    <Card className="mb-4">
      <CardHeader
        title="Subscription billing history"
        hint="Immutable renewals · payments · adjustments — live rate/count never rewrite these"
      />
      <div className="px-5 pb-5 space-y-5">
        <section className="space-y-2">
          <div className="text-xs font-semibold">Subscription</div>
          {sub ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 rounded-md border border-border px-3 py-2">
              <Cell label="Institute" value={sub.instituteName} />
              <Cell label="Lifecycle" value={labelSubscriptionLifecycle(sub.lifecycleStatus)} />
              <Cell
                label="Live students"
                value={sub.activeStudentCount.toLocaleString("en-IN")}
              />
              <Cell label="Live rate" value={`${formatInr(sub.assignedRateInr)} / student`} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No unified subscription yet.</p>
          )}
        </section>

        <section className="space-y-2">
          <div className="text-xs font-semibold">
            Renewal history ({history.renewals.length})
          </div>
          {history.renewals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No renewals.</p>
          ) : (
            history.renewals.map((row: RenewalRecord) => (
              <div
                key={row.renewalId}
                className="rounded-lg border border-border px-3 py-3 space-y-2"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="text-sm font-semibold">
                    {labelSubscriptionDuration(row.durationMonths)}
                  </span>
                  <Pill tone="success">{row.paymentStatus.toUpperCase()}</Pill>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  <Cell label="Students" value={String(row.activeStudentCountAtPurchase)} />
                  <Cell
                    label="Rate"
                    value={`${formatInr(row.assignedRateInrAtPurchase)} / student`}
                  />
                  <Cell label="Minimum charge" value={formatInr(row.minMonthlyChargeInr)} />
                  <Cell label="Monthly price" value={formatInr(row.monthlyPriceInr)} />
                  <Cell label="Regular" value={formatInr(row.regularAmountInr)} />
                  <Cell label="Discount" value={formatInr(row.discountAmountInr)} />
                  <Cell label="Final amount" value={formatInr(row.payableAmountInr)} />
                  <Cell label="Method" value={row.paymentMethod.toUpperCase()} />
                  <Cell label="Start" value={formatDate(row.subscriptionStartAt)} />
                  <Cell label="End" value={formatDate(row.subscriptionEndAt)} />
                </div>
              </div>
            ))
          )}
        </section>

        <section className="space-y-2">
          <div className="text-xs font-semibold">
            Payment history ({history.payments.length})
          </div>
          {history.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments.</p>
          ) : (
            history.payments.map((row: PaymentRecord) => (
              <div
                key={row.paymentId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-xs"
              >
                <div>
                  <div className="font-mono font-medium">{formatInr(row.amountInr)}</div>
                  <div className="text-muted-foreground">
                    {row.method.toUpperCase()}
                    {row.reference ? ` · ${row.reference}` : ""}
                  </div>
                  <div className="text-muted-foreground">{formatDateTime(row.createdAt)}</div>
                </div>
                <Pill
                  tone={
                    row.status === "paid"
                      ? "success"
                      : row.status === "rejected"
                        ? "danger"
                        : "warning"
                  }
                >
                  {row.status.toUpperCase()}
                </Pill>
              </div>
            ))
          )}
        </section>

        <section className="space-y-2">
          <div className="text-xs font-semibold">
            Billing adjustments ({history.adjustments.length})
          </div>
          {history.adjustments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No adjustments.</p>
          ) : (
            history.adjustments.map((row: BillingAdjustment) => (
              <div
                key={row.adjustmentId}
                className="rounded-lg border border-border px-3 py-3 space-y-2"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="text-sm font-semibold">
                    +{row.additionalStudentCount} students
                  </span>
                  <Pill tone={row.status === "paid" ? "success" : "warning"}>
                    {row.status.toUpperCase()}
                  </Pill>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  <Cell label="Added students" value={String(row.additionalStudentCount)} />
                  <Cell label="Rate" value={`${formatInr(row.assignedRateInr)} / student`} />
                  <Cell label="Remaining period" value={`${row.remainingMonths} mo`} />
                  <Cell label="Additional amount" value={formatInr(row.payableAmountInr)} />
                  <Cell label="Reason" value={row.reason} />
                  <Cell label="Created" value={formatDateTime(row.createdAt)} />
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </Card>
  );
}
