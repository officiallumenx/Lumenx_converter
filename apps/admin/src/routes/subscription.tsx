/**
 * Admin subscription renewal — dedicated checkout surface.
 * Offline: instructions → external pay → reference → VERIFICATION_PENDING (never auto-ACTIVE).
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Button,
  Card,
  CardHeader,
  Field,
  Pill,
  TextInput,
} from "@lumenx/ui-admin";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  CreditCard,
  Landmark,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ADMIN_MODULE_LABELS as M, adminPageTitle } from "@/lib/admin-module-labels";
import { AdminBillingHistoryPanel } from "@/components/AdminBillingHistoryPanel";
import {
  getBoundRenewalReminderView,
  getBoundSubscriptionTrialView,
  syncAdminSubscriptionAccess,
} from "@/lib/sync-admin-subscription-access";
import { getAdminBoundNexusInstituteId } from "@lumenx/config";
import {
  SUBSCRIPTION_CHANGED_EVENT,
  beginOnlineCheckout,
  calculateSubscriptionQuote,
  daysRemainingUntil,
  getInstituteSubscription,
  getOnlinePaymentStatusMessage,
  getPendingBillingAdjustment,
  isOnlinePaymentAvailable,
  labelOfflinePaymentStatus,
  labelRenewalReminder,
  labelSubscriptionDuration,
  labelSubscriptionLifecycle,
  listOfflinePaymentSubmissions,
  quoteAllDurations,
  submitBillingAdjustmentOffline,
  submitOfflinePayment,
  subscribeSubscriptions,
  type OfflinePaymentSubmission,
  type SubscriptionDurationMonths,
  type SubscriptionQuote,
} from "@lumenx/utils";

export const Route = createFileRoute("/subscription")({
  head: () => ({ meta: [{ title: adminPageTitle("/subscription") }] }),
  component: SubscriptionPage,
});

function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
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

type PayMethod = "online" | "offline";
type Step = "quote" | "offline_instructions" | "submitted" | "adjustment_pay";

function MonthlyBreakdown({ quote }: { quote: SubscriptionQuote }) {
  if (quote.showAsBaseSubscription) {
    return (
      <div className="rounded-lg border border-border bg-muted/15 px-4 py-3 space-y-1">
        <div className="text-sm font-semibold">Base Subscription</div>
        <div className="text-lg font-semibold font-mono tabular-nums">
          {formatInr(quote.monthlyPriceInr)} / month
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/15 px-4 py-3 space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            Active Students
          </div>
          <div className="mt-1 text-sm font-semibold font-mono">
            {quote.activeStudentCount.toLocaleString("en-IN")}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            Assigned Rate
          </div>
          <div className="mt-1 text-sm font-semibold font-mono">
            {formatInr(quote.assignedRateInr)} / student
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            Monthly Price
          </div>
          <div className="mt-1 text-sm font-semibold font-mono">
            {formatInr(quote.monthlyPriceInr)}
          </div>
        </div>
      </div>
    </div>
  );
}

function PendingSubmissionCard({
  submission,
}: {
  submission: OfflinePaymentSubmission;
}) {
  return (
    <Card className="mb-4 border-amber-500/35 bg-amber-500/5">
      <CardHeader
        title="Payment submitted. Waiting for verification."
        hint="Subscription is not active yet · Nexus must verify this payment"
        action={
          <Pill tone="warning">{labelOfflinePaymentStatus(submission.status)}</Pill>
        }
      />
      <div className="px-5 pb-5">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="rounded-md border border-border bg-background/60 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              Amount
            </div>
            <div className="mt-1 text-sm font-semibold font-mono">
              {formatInr(submission.payableAmountInr)}
            </div>
          </div>
          <div className="rounded-md border border-border bg-background/60 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              Duration
            </div>
            <div className="mt-1 text-sm font-semibold">
              {labelSubscriptionDuration(submission.durationMonths)}
            </div>
          </div>
          <div className="rounded-md border border-border bg-background/60 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              Transaction / reference ID
            </div>
            <div className="mt-1 text-sm font-semibold font-mono break-all">
              {submission.referenceId}
            </div>
          </div>
          <div className="rounded-md border border-border bg-background/60 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              Submitted date
            </div>
            <div className="mt-1 text-sm font-semibold">
              {formatDateTime(submission.submittedAt)}
            </div>
          </div>
          <div className="rounded-md border border-border bg-background/60 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              Verification status
            </div>
            <div className="mt-1 text-sm font-semibold">
              {labelOfflinePaymentStatus(submission.status)}
            </div>
          </div>
          {submission.proofLabel ? (
            <div className="rounded-md border border-border bg-background/60 px-3 py-2.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                Payment proof
              </div>
              <div className="mt-1 text-sm font-semibold break-all">
                {submission.proofLabel}
              </div>
            </div>
          ) : null}
        </div>
        <p className="mt-3 text-[12px] text-muted-foreground leading-relaxed flex items-start gap-2">
          <CheckCircle2 className="size-3.5 mt-0.5 shrink-0 text-amber-700 dark:text-amber-300" />
          Payment was not marked paid automatically. Nexus will review this submission before
          your subscription becomes active.
        </p>
      </div>
    </Card>
  );
}

function SubscriptionPage() {
  const [tick, setTick] = useState(0);
  const [duration, setDuration] = useState<SubscriptionDurationMonths>(1);
  const [method, setMethod] = useState<PayMethod | null>(null);
  const [step, setStep] = useState<Step>("quote");
  const [referenceId, setReferenceId] = useState("");
  const [proofLabel, setProofLabel] = useState("");
  const [onlineMsg, setOnlineMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showQuoteDuringTrial, setShowQuoteDuringTrial] = useState(false);

  const refresh = useCallback(() => {
    syncAdminSubscriptionAccess();
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    refresh();
    return subscribeSubscriptions(refresh);
  }, [refresh]);

  useEffect(() => {
    const onEvt = () => refresh();
    window.addEventListener(SUBSCRIPTION_CHANGED_EVENT, onEvt);
    window.addEventListener("focus", onEvt);
    return () => {
      window.removeEventListener(SUBSCRIPTION_CHANGED_EVENT, onEvt);
      window.removeEventListener("focus", onEvt);
    };
  }, [refresh]);

  void tick;
  const instituteId = getAdminBoundNexusInstituteId();
  const sub = getInstituteSubscription(instituteId);
  const trialView = getBoundSubscriptionTrialView();
  const reminderView = getBoundRenewalReminderView();

  const quotes = useMemo(() => {
    if (!sub) return [] as SubscriptionQuote[];
    return quoteAllDurations({
      activeStudentCount: sub.activeStudentCount,
      assignedRateInr: sub.assignedRateInr,
    });
  }, [sub]);

  const selectedQuote = useMemo(() => {
    if (!sub) return null;
    return calculateSubscriptionQuote({
      activeStudentCount: sub.activeStudentCount,
      assignedRateInr: sub.assignedRateInr,
      durationMonths: duration,
    });
  }, [sub, duration]);

  const pendingOffline = useMemo(() => {
    return listOfflinePaymentSubmissions("verification_pending").find(
      (s) => s.instituteId === instituteId,
    );
  }, [instituteId, tick]);

  const pendingAdjustment = useMemo(() => {
    return getPendingBillingAdjustment(instituteId);
  }, [instituteId, tick]);

  const lifecycle = trialView?.lifecycleStatus ?? sub?.lifecycleStatus ?? null;
  const inTrial =
    lifecycle === "trial_active" || lifecycle === "trial_expiring";
  const trialEnded =
    lifecycle === "trial_expired" ||
    lifecycle === "grace_period" ||
    lifecycle === "read_only";
  const isActive = lifecycle === "active";
  const showQuote =
    !pendingOffline &&
    (!inTrial || showQuoteDuringTrial || trialEnded || isActive);

  const onSelectOnline = () => {
    setError(null);
    setMethod("online");
    if (!sub || !selectedQuote) {
      setOnlineMsg(getOnlinePaymentStatusMessage());
      return;
    }
    // Adapter only — never activates. Offline remains the working path.
    const result = beginOnlineCheckout({
      instituteId: sub.instituteId,
      instituteName: sub.instituteName,
      durationMonths: duration,
      payableAmountInr: selectedQuote.payableAmountInr,
      currency: "INR",
    });
    if (result instanceof Promise) {
      void result.then((r) =>
        setOnlineMsg(r.ok === false ? r.message : getOnlinePaymentStatusMessage()),
      );
      return;
    }
    setOnlineMsg(result.ok === false ? result.message : getOnlinePaymentStatusMessage());
  };

  const onPayOffline = () => {
    setError(null);
    setOnlineMsg(null);
    setMethod("offline");
    setStep("offline_instructions");
  };

  const onSubmitOffline = () => {
    setError(null);
    if (!sub) {
      setError("No subscription found for this institute.");
      return;
    }
    const ref = referenceId.trim();
    if (!ref) {
      setError("Enter your payment reference / UTR / receipt number.");
      return;
    }
    const beforeLifecycle = sub.lifecycleStatus;
    const submission = submitOfflinePayment({
      instituteId: sub.instituteId,
      durationMonths: duration,
      referenceId: ref,
      proofLabel: proofLabel.trim() || undefined,
    });
    if (!submission) {
      setError("Could not submit offline payment. Try again.");
      return;
    }
    if (submission.status !== "verification_pending") {
      setError("Unexpected payment status after submit.");
      return;
    }
    // Guard: submit must never activate.
    const after = getInstituteSubscription(sub.instituteId);
    if (after?.lifecycleStatus === "active" && beforeLifecycle !== "active") {
      setError("Safety check failed: subscription must not activate on submit.");
      return;
    }
    setStep("submitted");
    setMethod(null);
    setReferenceId("");
    setProofLabel("");
    refresh();
  };

  const onSubmitAdjustment = () => {
    setError(null);
    if (!pendingAdjustment || pendingAdjustment.status !== "pending") {
      setError("No pending seat adjustment to pay.");
      return;
    }
    const ref = referenceId.trim();
    if (!ref) {
      setError("Enter your payment reference / UTR / receipt number.");
      return;
    }
    const updated = submitBillingAdjustmentOffline({
      adjustmentId: pendingAdjustment.adjustmentId,
      referenceId: ref,
      proofLabel: proofLabel.trim() || undefined,
    });
    if (!updated || updated.status !== "verification_pending") {
      setError("Could not submit adjustment payment.");
      return;
    }
    setStep("quote");
    setReferenceId("");
    setProofLabel("");
    refresh();
  };

  if (!sub || !trialView || !selectedQuote) {
    return (
      <AppShell title={M.subscription} subtitle="Renewal and trial status">
        <Card className="p-6 text-sm text-muted-foreground">
          No subscription is bound to this Admin session yet. After Nexus approves your
          institute, trial and renewal details appear here.
          <div className="mt-4">
            <Link to="/">
              <Button>
                <ArrowLeft className="size-3.5" /> Home
              </Button>
            </Link>
          </div>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={M.subscription}
      subtitle="Trial · renewal quote · offline payment"
      actions={
        <Pill
          tone={
            isActive
              ? "success"
              : inTrial
                ? "info"
                : lifecycle === "read_only"
                  ? "danger"
                  : "warning"
          }
        >
          {labelSubscriptionLifecycle(lifecycle ?? "registered")}
        </Pill>
      }
    >
      {error ? (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}

      {pendingOffline ? <PendingSubmissionCard submission={pendingOffline} /> : null}

      {reminderView && !pendingOffline ? (
        <Card className="mb-4 border-sky-500/30 bg-sky-500/5">
          <CardHeader
            title="Renewal reminder"
            hint={labelRenewalReminder(reminderView.kind)}
            action={
              <Pill tone={reminderView.kind === "expired" ? "danger" : "warning"}>
                {reminderView.kind === "expired"
                  ? "Expired"
                  : `${reminderView.daysRemaining}d left`}
              </Pill>
            }
          />
          <div className="px-5 pb-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-md border border-border bg-background/60 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                  Current subscription
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {reminderView.currentSubscriptionLabel}
                </div>
              </div>
              <div className="rounded-md border border-border bg-background/60 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                  Expiry date
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {formatDate(reminderView.expiryAt)}
                </div>
              </div>
              <div className="rounded-md border border-border bg-background/60 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                  Days remaining
                </div>
                <div className="mt-1 text-sm font-semibold font-mono">
                  {reminderView.kind === "expired" || reminderView.daysRemaining <= 0
                    ? "Expired"
                    : `${reminderView.daysRemaining} day${reminderView.daysRemaining === 1 ? "" : "s"}`}
                </div>
              </div>
            </div>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              {reminderView.body}
            </p>
            <Button
              variant="primary"
              data-admin-allow-readonly
              onClick={() => {
                setShowQuoteDuringTrial(true);
                setStep("quote");
              }}
            >
              Renew subscription
            </Button>
          </div>
        </Card>
      ) : null}

      {pendingAdjustment && pendingAdjustment.payableAmountInr > 0 ? (
        <Card className="mb-4 border-sky-500/35 bg-sky-500/5">
          <CardHeader
            title="Additional subscription charge pending"
            hint="Students added after renewal · original purchase snapshot unchanged"
            action={
              <Pill tone={pendingAdjustment.status === "verification_pending" ? "warning" : "info"}>
                {pendingAdjustment.status === "verification_pending"
                  ? "VERIFICATION_PENDING"
                  : "PENDING"}
              </Pill>
            }
          />
          <div className="px-5 pb-5 space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="rounded-md border border-border bg-background/60 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                  Additional students
                </div>
                <div className="mt-1 font-semibold font-mono">
                  +{pendingAdjustment.additionalStudentCount}
                </div>
              </div>
              <div className="rounded-md border border-border bg-background/60 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                  Monthly equivalent
                </div>
                <div className="mt-1 font-semibold font-mono">
                  {formatInr(pendingAdjustment.additionalMonthlyInr)}
                </div>
              </div>
              <div className="rounded-md border border-border bg-background/60 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                  Remaining months
                </div>
                <div className="mt-1 font-semibold font-mono">
                  {pendingAdjustment.remainingMonths}
                </div>
              </div>
              <div className="rounded-md border border-border bg-background/60 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                  Amount due
                </div>
                <div className="mt-1 font-semibold font-mono">
                  {formatInr(pendingAdjustment.payableAmountInr)}
                </div>
              </div>
            </div>
            {pendingAdjustment.status === "pending" && step !== "adjustment_pay" ? (
              <Button
                variant="primary"
                data-admin-allow-readonly
                onClick={() => {
                  setStep("adjustment_pay");
                  setReferenceId("");
                  setProofLabel("");
                }}
              >
                Review &amp; Pay
              </Button>
            ) : null}
            {pendingAdjustment.status === "verification_pending" ? (
              <p className="text-[12px] text-muted-foreground">
                Payment submitted (ref {pendingAdjustment.referenceId}). Waiting for Nexus
                verification. Renewal snapshot was not modified.
              </p>
            ) : null}
          </div>
        </Card>
      ) : null}

      {step === "adjustment_pay" &&
      pendingAdjustment &&
      pendingAdjustment.status === "pending" ? (
        <Card className="mb-4">
          <CardHeader
            title="Pay seat adjustment (offline)"
            hint="Pay externally · submit reference · Nexus verifies"
            action={
              <Button size="sm" data-admin-allow-readonly onClick={() => setStep("quote")}>
                <ArrowLeft className="size-3.5" /> Back
              </Button>
            }
          />
          <div className="px-5 pb-5 space-y-4">
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              Amount {formatInr(pendingAdjustment.payableAmountInr)} · UPI lumenx@hdfcbank · same
              bank details as subscription offline pay. This is a separate charge — it does not
              rewrite the original renewal.
            </p>
            <Field label="Transaction / reference ID">
              <TextInput
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                placeholder="e.g. UTR for seat adjustment"
                data-admin-allow-readonly
              />
            </Field>
            <Field label="Payment proof (optional)">
              <TextInput
                value={proofLabel}
                onChange={(e) => setProofLabel(e.target.value)}
                placeholder="e.g. adjustment-receipt.pdf"
                data-admin-allow-readonly
              />
            </Field>
            <Button variant="primary" data-admin-allow-readonly onClick={onSubmitAdjustment}>
              Submit adjustment for verification
            </Button>
          </div>
        </Card>
      ) : null}

      {/* Trial status */}
      {inTrial && !pendingOffline && !reminderView ? (
        <Card className="mb-4">
          <CardHeader
            title="Free trial"
            hint="Full access · no payment required during trial"
            action={<Sparkles className="size-4 text-muted-foreground" />}
          />
          <div className="px-5 pb-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-md border border-border bg-background/40 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                  Trial status
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {labelSubscriptionLifecycle(lifecycle!)}
                </div>
              </div>
              <div className="rounded-md border border-border bg-background/40 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                  Days remaining
                </div>
                <div className="mt-1 text-sm font-semibold font-mono">
                  {trialView.trialDaysRemaining != null
                    ? `${trialView.trialDaysRemaining} day${trialView.trialDaysRemaining === 1 ? "" : "s"}`
                    : "—"}
                </div>
              </div>
              <div className="rounded-md border border-border bg-background/40 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                  Trial end date
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {formatDate(trialView.trialEndAt)}
                </div>
              </div>
            </div>
            <Button
              variant="primary"
              data-admin-allow-readonly
              onClick={() => setShowQuoteDuringTrial(true)}
            >
              Renew subscription
            </Button>
          </div>
        </Card>
      ) : null}

      {isActive && !pendingOffline && !reminderView ? (
        <Card className="mb-4">
          <CardHeader title="Current subscription" hint="Full write access" />
          <div className="px-5 pb-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-md border border-border bg-background/40 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                  Status
                </div>
                <div className="mt-1 text-sm font-semibold">Active</div>
              </div>
              <div className="rounded-md border border-border bg-background/40 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                  Expiry date
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {formatDate(sub.currentPeriod?.endAt)}
                </div>
              </div>
              <div className="rounded-md border border-border bg-background/40 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                  Days remaining
                </div>
                <div className="mt-1 text-sm font-semibold font-mono">
                  {sub.currentPeriod?.endAt
                    ? (() => {
                        const days = Math.max(
                          0,
                          daysRemainingUntil(sub.currentPeriod.endAt),
                        );
                        return `${days} day${days === 1 ? "" : "s"}`;
                      })()
                    : "—"}
                </div>
              </div>
            </div>
            <Button
              variant="primary"
              data-admin-allow-readonly
              onClick={() => setShowQuoteDuringTrial(true)}
            >
              Renew subscription
            </Button>
          </div>
        </Card>
      ) : null}

      {trialEnded && !pendingOffline ? (
        <div className="mb-4 rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 py-3">
          <div className="text-sm font-semibold text-orange-950 dark:text-orange-100">
            Your free trial has ended.
          </div>
          <p className="mt-1 text-[12px] text-muted-foreground leading-relaxed">
            {trialView.body}
          </p>
        </div>
      ) : null}

      {/* Quote + payment */}
      {showQuote && step === "quote" ? (
        <Card className="mb-4">
          <CardHeader
            title="Subscription quote"
            hint="Review amount · then Pay Offline · Nexus verifies"
          />
          <div className="px-5 pb-5 space-y-5">
            <MonthlyBreakdown quote={selectedQuote} />

            <div>
              <div className="text-xs font-semibold mb-2">1. Select duration</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {quotes.map((q) => {
                  const selected = q.durationMonths === duration;
                  return (
                    <button
                      key={q.durationMonths}
                      type="button"
                      data-admin-allow-readonly
                      onClick={() => {
                        setDuration(q.durationMonths);
                        setMethod(null);
                        setOnlineMsg(null);
                      }}
                      className={`rounded-lg border px-3 py-3 text-left transition-colors ${
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background/40 hover:bg-muted/30"
                      }`}
                    >
                      <div className="text-sm font-semibold">{q.durationLabel}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {q.freeMonths > 0
                          ? `${q.freeMonths} month${q.freeMonths === 1 ? "" : "s"} free`
                          : "No free months"}
                      </div>
                      <div className="mt-2 text-sm font-mono font-semibold tabular-nums">
                        {formatInr(q.payableAmountInr)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg border border-border px-4 py-3 space-y-2">
              <div className="text-xs font-semibold mb-1">2. Review amount</div>
              <div className="flex justify-between text-sm gap-3">
                <span className="text-muted-foreground">Regular amount</span>
                <span className="font-mono tabular-nums">
                  {formatInr(selectedQuote.regularAmountInr)}
                </span>
              </div>
              <div className="flex justify-between text-sm gap-3">
                <span className="text-muted-foreground">
                  Discount
                  {selectedQuote.freeMonths > 0
                    ? ` (${selectedQuote.freeMonths} mo free)`
                    : ""}
                </span>
                <span className="font-mono tabular-nums text-success">
                  −{formatInr(selectedQuote.discountAmountInr)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-semibold gap-3 border-t border-border pt-2">
                <span>Final payable amount</span>
                <span className="font-mono tabular-nums">
                  {formatInr(selectedQuote.payableAmountInr)}
                </span>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold mb-2">3. Payment method</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  data-admin-allow-readonly
                  onClick={onSelectOnline}
                  className={`rounded-lg border px-4 py-3 text-left ${
                    method === "online"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <CreditCard className="size-4" /> Pay Online
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {isOnlinePaymentAvailable()
                      ? "Redirects to payment provider"
                      : "Online payments are coming soon."}
                  </div>
                </button>
                <button
                  type="button"
                  data-admin-allow-readonly
                  onClick={onPayOffline}
                  className={`rounded-lg border px-4 py-3 text-left ${
                    method === "offline"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Landmark className="size-4" /> Pay Offline
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    UPI / bank instructions
                  </div>
                </button>
              </div>
              {onlineMsg ? (
                <div className="mt-3 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  {onlineMsg}
                </div>
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}

      {step === "offline_instructions" && selectedQuote && !pendingOffline ? (
        <Card className="mb-4">
          <CardHeader
            title="Pay Offline · UPI / bank instructions"
            hint="Complete payment externally, then enter your reference ID"
            action={
              <Button
                size="sm"
                data-admin-allow-readonly
                onClick={() => {
                  setStep("quote");
                  setMethod(null);
                }}
              >
                <ArrowLeft className="size-3.5" /> Back
              </Button>
            }
          />
          <div className="px-5 pb-5 space-y-4">
            <div className="rounded-lg border border-border bg-muted/15 px-4 py-3 space-y-3 text-sm">
              <div className="flex items-center gap-2 font-semibold">
                <Building2 className="size-4" /> LumenX Collections
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
                <div>
                  <span className="text-muted-foreground">UPI ID</span>
                  <div className="font-mono font-medium">lumenx@hdfcbank</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount to pay</span>
                  <div className="font-mono font-semibold">
                    {formatInr(selectedQuote.payableAmountInr)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Account name</span>
                  <div className="font-medium">LumenX Technologies Pvt Ltd</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Bank</span>
                  <div className="font-medium">HDFC Bank</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Account number</span>
                  <div className="font-mono">50200012345678</div>
                </div>
                <div>
                  <span className="text-muted-foreground">IFSC</span>
                  <div className="font-mono">HDFC0001234</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Duration</span>
                  <div className="font-medium">
                    {labelSubscriptionDuration(selectedQuote.durationMonths)}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Pay the amount externally via UPI or bank transfer. Then enter the transaction /
                reference ID below. Submitting does <strong>not</strong> activate your
                subscription — status becomes VERIFICATION_PENDING until Nexus verifies.
              </p>
            </div>

            <Field label="Transaction / reference ID" hint="UTR, UPI ref, or bank receipt number">
              <TextInput
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                placeholder="e.g. 123456789012 or UPIREF…"
                data-admin-allow-readonly
              />
            </Field>
            <Field
              label="Payment proof (optional)"
              hint="File name or note — no real upload in this demo"
            >
              <TextInput
                value={proofLabel}
                onChange={(e) => setProofLabel(e.target.value)}
                placeholder="e.g. bank-receipt.pdf"
                data-admin-allow-readonly
              />
            </Field>

            <Button variant="primary" data-admin-allow-readonly onClick={onSubmitOffline}>
              Submit payment for verification
            </Button>
          </div>
        </Card>
      ) : null}

      <AdminBillingHistoryPanel />
    </AppShell>
  );
}
