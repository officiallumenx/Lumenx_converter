/**
 * Admin — immutable billing history (renewals, payments, adjustments, subscription).
 */

import { useCallback, useState } from "react";
import { Card, CardHeader, Pill } from "@lumenx/ui-admin";
import { useWindowEvents } from "@lumenx/ui";
import {
  SUBSCRIPTION_CHANGED_EVENT,
  getInstituteBillingHistory,
  labelSubscriptionDuration,
  labelSubscriptionLifecycle,
  type BillingAdjustment,
  type InstituteBillingHistory,
  type PaymentRecord,
  type RenewalRecord,
} from "@lumenx/utils";
import { getAdminBoundNexusInstituteId } from "@lumenx/config";

const EVENTS = ["storage", "focus", SUBSCRIPTION_CHANGED_EVENT] as const;

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

function RenewalRow({ row }: { row: RenewalRecord }) {
  return (
    <div className="rounded-lg border border-border px-3 py-3 space-y-2 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold text-sm">{row.instituteName}</div>
        <Pill tone={row.paymentStatus === "paid" ? "success" : "warning"}>
          {row.paymentStatus.toUpperCase()}
        </Pill>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Cell label="Students" value={String(row.activeStudentCountAtPurchase)} />
        <Cell label="Rate" value={`${formatInr(row.assignedRateInrAtPurchase)} / student`} />
        <Cell label="Minimum charge" value={formatInr(row.minMonthlyChargeInr)} />
        <Cell label="Monthly price" value={formatInr(row.monthlyPriceInr)} />
        <Cell label="Duration" value={labelSubscriptionDuration(row.durationMonths)} />
        <Cell label="Regular amount" value={formatInr(row.regularAmountInr)} />
        <Cell label="Discount" value={formatInr(row.discountAmountInr)} />
        <Cell label="Final amount" value={formatInr(row.payableAmountInr)} />
        <Cell label="Payment method" value={row.paymentMethod.toUpperCase()} />
        <Cell label="Start" value={formatDate(row.subscriptionStartAt)} />
        <Cell label="End" value={formatDate(row.subscriptionEndAt)} />
        <Cell label="Recorded" value={formatDateTime(row.createdAt)} />
      </div>
    </div>
  );
}

function PaymentRow({ row }: { row: PaymentRecord }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-xs">
      <div>
        <div className="font-medium font-mono">{formatInr(row.amountInr)}</div>
        <div className="text-muted-foreground">
          {row.method.toUpperCase()}
          {row.reference ? ` · ${row.reference}` : ""}
          {row.note ? ` · ${row.note}` : ""}
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
        {row.status === "verification_pending"
          ? "VERIFICATION_PENDING"
          : row.status.toUpperCase()}
      </Pill>
    </div>
  );
}

function AdjustmentRow({ row }: { row: BillingAdjustment }) {
  return (
    <div className="rounded-lg border border-border px-3 py-3 space-y-2 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold text-sm">+{row.additionalStudentCount} students</div>
        <Pill
          tone={
            row.status === "paid"
              ? "success"
              : row.status === "pending" || row.status === "verification_pending"
                ? "warning"
                : "info"
          }
        >
          {row.status === "verification_pending"
            ? "VERIFICATION_PENDING"
            : row.status.toUpperCase()}
        </Pill>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Cell label="Added students" value={String(row.additionalStudentCount)} />
        <Cell label="Rate" value={`${formatInr(row.assignedRateInr)} / student`} />
        <Cell label="Remaining period" value={`${row.remainingMonths} mo`} />
        <Cell label="Additional amount" value={formatInr(row.payableAmountInr)} />
        <Cell label="Reason" value={row.reason} />
        <Cell
          label="Payment status"
          value={
            row.status === "verification_pending"
              ? "VERIFICATION_PENDING"
              : row.status.toUpperCase()
          }
        />
        <Cell label="Created" value={formatDateTime(row.createdAt)} />
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        {label}
      </div>
      <div className="mt-0.5 font-medium break-all">{value}</div>
    </div>
  );
}

export function AdminBillingHistoryPanel() {
  const [history, setHistory] = useState<InstituteBillingHistory>(() =>
    getInstituteBillingHistory(getAdminBoundNexusInstituteId()),
  );

  const sync = useCallback(() => {
    setHistory(getInstituteBillingHistory(getAdminBoundNexusInstituteId()));
  }, []);

  useWindowEvents(EVENTS, sync);

  const sub = history.subscription;

  return (
    <Card className="mb-4">
      <CardHeader
        title="Billing history"
        hint="Immutable renewals · payments · adjustments · live rate/count never rewrite these"
      />
      <div className="px-5 pb-5 space-y-6">
        <section className="space-y-2">
          <div className="text-xs font-semibold">Subscription</div>
          {sub ? (
            <div className="rounded-md border border-border px-3 py-2 text-xs grid grid-cols-2 lg:grid-cols-4 gap-2">
              <Cell label="Institute" value={sub.instituteName} />
              <Cell
                label="Lifecycle"
                value={labelSubscriptionLifecycle(sub.lifecycleStatus)}
              />
              <Cell
                label="Live students"
                value={sub.activeStudentCount.toLocaleString("en-IN")}
              />
              <Cell
                label="Live rate"
                value={`${formatInr(sub.assignedRateInr)} / student`}
              />
              {sub.currentPeriod ? (
                <>
                  <Cell
                    label="Current period students (snapshot)"
                    value={String(sub.currentPeriod.activeStudentCount)}
                  />
                  <Cell
                    label="Current period rate (snapshot)"
                    value={`${formatInr(sub.currentPeriod.assignedRateInr)} / student`}
                  />
                  <Cell
                    label="Period start"
                    value={formatDate(sub.currentPeriod.startAt)}
                  />
                  <Cell label="Period end" value={formatDate(sub.currentPeriod.endAt)} />
                </>
              ) : (
                <Cell label="Paid period" value="None" />
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No subscription record.</p>
          )}
        </section>

        <section className="space-y-2">
          <div className="text-xs font-semibold">
            Renewal history ({history.renewals.length})
          </div>
          {history.renewals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No renewals yet.</p>
          ) : (
            history.renewals.map((r) => <RenewalRow key={r.renewalId} row={r} />)
          )}
        </section>

        <section className="space-y-2">
          <div className="text-xs font-semibold">
            Payment history ({history.payments.length})
          </div>
          {history.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments yet.</p>
          ) : (
            history.payments.map((p) => <PaymentRow key={p.paymentId} row={p} />)
          )}
        </section>

        <section className="space-y-2">
          <div className="text-xs font-semibold">
            Billing adjustments ({history.adjustments.length})
          </div>
          {history.adjustments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No seat adjustments yet.</p>
          ) : (
            history.adjustments.map((a) => (
              <AdjustmentRow key={a.adjustmentId} row={a} />
            ))
          )}
        </section>
      </div>
    </Card>
  );
}
