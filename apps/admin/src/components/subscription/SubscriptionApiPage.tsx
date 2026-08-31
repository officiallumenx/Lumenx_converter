/**
 * Admin subscription checkout — API auth mode (offline bank transfer only).
 */

import { Link } from "@tanstack/react-router";
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
  Loader2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInstituteContext } from "@/lib/institutes";
import {
  getSubscriptionQuotes,
  loadSubscriptionDetail,
  performOfflinePaymentSubmit,
  type InstituteSubscriptionDetailDto,
  type OfflinePaymentSubmissionDto,
  type SubscriptionQuoteDto,
} from "@/lib/subscriptions";
import {
  labelSubscriptionDuration,
} from "@lumenx/utils";

function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
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

type Step = "quote" | "offline_instructions" | "submitted";
type PayMethod = "online" | "offline";

function PendingSubmissionCard({ submission }: { submission: OfflinePaymentSubmissionDto }) {
  return (
    <Card className="mb-4 border-amber-500/35 bg-amber-500/5">
      <CardHeader
        title="Payment submitted. Waiting for verification."
        hint="Subscription is not active yet · Nexus must verify this payment"
        action={<Pill tone="warning">VERIFICATION_PENDING</Pill>}
      />
      <div className="px-5 pb-5 grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Detail label="Amount" value={formatInr(submission.payableAmountInr)} mono />
        <Detail
          label="Duration"
          value={labelSubscriptionDuration(submission.durationMonths)}
        />
        <Detail label="Reference ID" value={submission.referenceId} mono />
        <Detail label="Submitted" value={formatDateTime(submission.submittedAt)} />
        {submission.proofLabel ? (
          <Detail label="Proof" value={submission.proofLabel} />
        ) : null}
      </div>
    </Card>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-background/60 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        {label}
      </div>
      <div className={`mt-1 text-sm font-medium break-all ${mono ? "font-mono" : ""}`}>
        {value}
      </div>
    </div>
  );
}

export function SubscriptionApiPage() {
  const instituteCtx = useInstituteContext();
  const [detail, setDetail] = useState<InstituteSubscriptionDetailDto | null>(null);
  const [quotes, setQuotes] = useState<SubscriptionQuoteDto[]>([]);
  const [loadStatus, setLoadStatus] = useState<string>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [duration, setDuration] = useState<1 | 6 | 12>(1);
  const [method, setMethod] = useState<PayMethod | null>(null);
  const [step, setStep] = useState<Step>("quote");
  const [referenceId, setReferenceId] = useState("");
  const [proofLabel, setProofLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const reload = useCallback(async (instituteId: string) => {
    setLoadStatus("loading");
    setLoadError(null);
    try {
      const [detailState, quoteRows] = await Promise.all([
        loadSubscriptionDetail(instituteId),
        getSubscriptionQuotes(instituteId),
      ]);
      if (activeInstituteIdRef.current !== instituteId) return;
      setDetail(detailState.detail);
      setQuotes(quoteRows);
      setLoadStatus(detailState.status);
      setLoadError(detailState.errorMessage);
    } catch (err) {
      if (activeInstituteIdRef.current !== instituteId) return;
      setLoadError(err instanceof Error ? err.message : "Failed to load");
      setLoadStatus("error");
    }
  }, []);

  useEffect(() => {
    if (
      instituteCtx.status !== "ready" ||
      !instituteCtx.activeInstituteId
    ) {
      setDetail(null);
      setQuotes([]);
      setLoadStatus(
        instituteCtx.status === "loading"
          ? "loading"
          : instituteCtx.status === "needs_selection" || instituteCtx.status === "empty"
            ? "needs_institute"
            : instituteCtx.status,
      );
      return;
    }
    void reload(instituteCtx.activeInstituteId);
  }, [instituteCtx.status, instituteCtx.activeInstituteId, reload]);

  const selectedQuote = useMemo(
    () => quotes.find((q) => q.durationMonths === duration) ?? null,
    [quotes, duration],
  );

  const pending = detail?.pendingOfflinePayment ?? null;

  const onSubmitOffline = async () => {
    if (!instituteCtx.activeInstituteId || !selectedQuote) return;
    setSubmitting(true);
    setError(null);
    const result = await performOfflinePaymentSubmit({
      instituteId: instituteCtx.activeInstituteId,
      durationMonths: selectedQuote.durationMonths,
      referenceId,
      proofLabel: proofLabel.trim() || undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setStep("submitted");
    void reload(instituteCtx.activeInstituteId);
  };

  if (loadStatus === "loading") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground px-1 py-8">
        <Loader2 className="size-4 animate-spin" /> Loading subscription…
      </div>
    );
  }

  if (loadStatus === "needs_institute") {
    return (
      <Card>
        <CardHeader title="Select an institute" hint="Subscription billing is institute-scoped" />
        <p className="px-5 pb-5 text-sm text-muted-foreground">
          Choose an institute from the header to view quotes and submit offline payments.
        </p>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card>
        <CardHeader title="Could not load subscription" />
        <p className="px-5 pb-5 text-sm text-destructive">{loadError}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {detail ? (
        <Card>
          <CardHeader
            title={detail.instituteName}
            hint={`Lifecycle · ${detail.lifecycleStatus.replace(/_/g, " ")}`}
            action={<Pill tone="neutral">API mode</Pill>}
          />
          <div className="px-5 pb-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Detail
              label="Active students"
              value={detail.activeStudentCount.toLocaleString("en-IN")}
            />
            <Detail
              label="Assigned rate"
              value={`${formatInr(detail.assignedRateInr)} / student`}
            />
            {detail.currentPeriod ? (
              <Detail
                label="Current period ends"
                value={formatDateTime(detail.currentPeriod.endsAt)}
              />
            ) : (
              <Detail label="Current period" value="None" />
            )}
            <Detail label="Status" value={detail.lifecycleStatus.replace(/_/g, " ")} />
          </div>
        </Card>
      ) : null}

      {pending ? <PendingSubmissionCard submission={pending} /> : null}

      {step === "submitted" && !pending ? (
        <Card className="border-emerald-500/35 bg-emerald-500/5">
          <CardHeader
            title="Submission recorded"
            hint="Nexus will verify your offline payment before activating the subscription"
          />
        </Card>
      ) : null}

      {!pending && step !== "submitted" ? (
        <>
          {step === "quote" ? (
            <Card>
              <CardHeader
                title="Choose subscription duration"
                hint="Offline bank / UPI only · online payments coming soon"
                action={
                  <Link to="/modules">
                    <Button size="sm" variant="ghost">
                      <ArrowLeft className="size-3.5" /> Modules
                    </Button>
                  </Link>
                }
              />
              <div className="px-5 pb-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {quotes.map((q) => (
                    <button
                      key={q.durationMonths}
                      type="button"
                      onClick={() => setDuration(q.durationMonths)}
                      className={`rounded-lg border px-4 py-3 text-left ${
                        duration === q.durationMonths
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/30"
                      }`}
                    >
                      <div className="text-sm font-semibold">{q.durationLabel}</div>
                      <div className="mt-1 font-mono text-lg font-semibold">
                        {formatInr(q.payableAmountInr)}
                      </div>
                      {q.discountAmountInr > 0 ? (
                        <div className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-300">
                          Includes {q.freeMonths} free month{q.freeMonths === 1 ? "" : "s"}
                        </div>
                      ) : null}
                    </button>
                  ))}
                </div>

                {selectedQuote ? (
                  <div className="rounded-lg border border-border bg-muted/15 px-4 py-3 text-sm space-y-1">
                    <div className="font-semibold">Payable amount</div>
                    <div className="text-xl font-mono font-semibold">
                      {formatInr(selectedQuote.payableAmountInr)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {selectedQuote.activeStudentCount} students ×{" "}
                      {formatInr(selectedQuote.assignedRateInr)} · monthly floor{" "}
                      {formatInr(selectedQuote.minMonthlyChargeInr)}
                    </div>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled
                    className="rounded-lg border border-border px-4 py-3 text-left opacity-60 cursor-not-allowed"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <CreditCard className="size-4" /> Pay Online
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">Coming soon</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMethod("offline");
                      setStep("offline_instructions");
                    }}
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
              </div>
            </Card>
          ) : null}

          {step === "offline_instructions" && selectedQuote ? (
            <Card>
              <CardHeader
                title="Pay Offline · UPI / bank instructions"
                hint="Complete payment externally, then enter your reference ID"
                action={
                  <Button
                    size="sm"
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
                  </div>
                </div>

                <Field label="Transaction / reference ID">
                  <TextInput
                    value={referenceId}
                    onChange={(e) => setReferenceId(e.target.value)}
                    placeholder="UPI ref, NEFT UTR, etc."
                  />
                </Field>
                <Field label="Payment proof (optional)" hint="Screenshot filename or note">
                  <TextInput
                    value={proofLabel}
                    onChange={(e) => setProofLabel(e.target.value)}
                    placeholder="Optional"
                  />
                </Field>

                {error ? (
                  <p className="text-sm text-destructive">{error}</p>
                ) : null}

                <Button
                  disabled={!referenceId.trim() || submitting}
                  onClick={() => void onSubmitOffline()}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Submitting…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" /> Submit for verification
                    </>
                  )}
                </Button>

                <p className="text-[12px] text-muted-foreground">
                  Your subscription will not become active until Nexus verifies this payment.
                </p>
              </div>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
