/**
 * Nexus Pending Payments — verify Admin offline submissions.
 * VIEW · APPROVE · REJECT inside Billing & Renewals.
 */

import {
  Button,
  Card,
  CardHeader,
  Field,
  Modal,
  Pill,
  TextInput,
} from "@lumenx/ui-admin";
import {
  Banknote,
  Check,
  Eye,
  Link2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  approveBillingAdjustment,
  approveOfflinePayment,
  getInstituteSubscription,
  labelOfflinePaymentStatus,
  labelSubscriptionDuration,
  labelSubscriptionLifecycle,
  listBillingAdjustments,
  listOfflinePaymentSubmissions,
  listPaymentRecords,
  listRenewalRecords,
  rejectBillingAdjustment,
  rejectOfflinePayment,
  shouldEnforceSubscriptionReadOnly,
  subscribeSubscriptions,
  type OfflinePaymentSubmission,
} from "@lumenx/utils";
import { isNexusApiMode } from "@/lib/auth-mode";
import { NexusOfflinePaymentsInboxApi } from "./NexusOfflinePaymentsInboxApi";

function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
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

function DetailGrid({ row }: { row: OfflinePaymentSubmission }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
      <Detail label="Institute" value={row.instituteName} hint={row.instituteId} />
      <Detail
        label="Active students at purchase"
        value={row.activeStudentCount.toLocaleString("en-IN")}
        mono
      />
      <Detail
        label="Assigned rate"
        value={`${formatInr(row.assignedRateInr)} / student`}
        mono
      />
      <Detail
        label="Duration"
        value={labelSubscriptionDuration(row.durationMonths)}
      />
      <Detail label="Regular amount" value={formatInr(row.regularAmountInr)} mono />
      <Detail
        label="Discount"
        value={
          row.discountAmountInr > 0
            ? `−${formatInr(row.discountAmountInr)}${row.freeMonths ? ` (${row.freeMonths} mo free)` : ""}`
            : formatInr(0)
        }
        mono
      />
      <Detail label="Final payable amount" value={formatInr(row.payableAmountInr)} mono />
      <Detail label="Payment method" value="OFFLINE" />
      <Detail label="Transaction / reference ID" value={row.referenceId} mono />
      <Detail
        label="Proof"
        value={row.proofLabel?.trim() ? row.proofLabel : "Not provided"}
      />
      <Detail label="Submission date" value={formatDateTime(row.submittedAt)} />
      <Detail
        label="Verification status"
        value={labelOfflinePaymentStatus(row.status)}
      />
    </div>
  );
}

function Detail({
  label,
  value,
  hint,
  mono,
}: {
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-background/60 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        {label}
      </div>
      <div className={`mt-1 text-sm font-medium break-all ${mono ? "font-mono" : ""}`}>
        {value || "—"}
      </div>
      {hint ? (
        <div className="mt-0.5 text-[10px] text-muted-foreground font-mono">{hint}</div>
      ) : null}
    </div>
  );
}

type DialogMode = "view" | "approve" | "reject" | null;

export function NexusOfflinePaymentsInbox() {
  if (isNexusApiMode()) {
    return <NexusOfflinePaymentsInboxApi />;
  }
  return <NexusOfflinePaymentsInboxDemo />;
}

function NexusOfflinePaymentsInboxDemo() {
  const [tick, setTick] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<DialogMode>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => subscribeSubscriptions(() => setTick((t) => t + 1)), []);

  const pending = useMemo(() => {
    void tick;
    return listOfflinePaymentSubmissions("verification_pending");
  }, [tick]);

  const pendingAdjustments = useMemo(() => {
    void tick;
    return listBillingAdjustments().filter((a) => a.status === "verification_pending");
  }, [tick]);

  const history = useMemo(() => {
    void tick;
    return listOfflinePaymentSubmissions("all")
      .filter((s) => s.status === "paid" || s.status === "rejected")
      .slice(0, 20);
  }, [tick]);

  const selected =
    pending.find((p) => p.submissionId === selectedId) ??
    history.find((p) => p.submissionId === selectedId) ??
    null;

  const closeDialog = () => {
    setMode(null);
    setSelectedId(null);
    setRejectReason("");
    setError(null);
  };

  const open = (row: OfflinePaymentSubmission, next: DialogMode) => {
    setError(null);
    setSelectedId(row.submissionId);
    setMode(next);
    setRejectReason("");
  };

  const onApprove = () => {
    if (!selected) return;
    setError(null);
    const beforePayments = listPaymentRecords(selected.instituteId).length;
    const beforeRenewals = listRenewalRecords(selected.instituteId).length;

    const next = approveOfflinePayment(selected.submissionId, {
      reviewedBy: "Nexus Operator",
    });
    if (!next) {
      setError("Could not approve this payment.");
      return;
    }
    if (next.lifecycleStatus !== "active") {
      setError("Approval failed: subscription did not become ACTIVE.");
      return;
    }
    if (shouldEnforceSubscriptionReadOnly(next.lifecycleStatus)) {
      setError("Approval failed: read-only should be cleared.");
      return;
    }
    if (!next.currentPeriod?.startAt || !next.currentPeriod?.endAt) {
      setError("Approval failed: subscription period not set.");
      return;
    }
    if (listRenewalRecords(selected.instituteId).length <= beforeRenewals) {
      setError("Approval failed: renewal record not created.");
      return;
    }
    if (listPaymentRecords(selected.instituteId).length < beforePayments) {
      setError("Approval failed: payment records must not be deleted.");
      return;
    }

    setFlash(
      `Approved · ${selected.instituteName} · subscription ACTIVE · ${formatInr(selected.payableAmountInr)}`,
    );
    window.setTimeout(() => setFlash(null), 4000);
    closeDialog();
    setTick((t) => t + 1);
  };

  const onReject = () => {
    if (!selected) return;
    setError(null);
    const reason = rejectReason.trim();
    if (!reason) {
      setError("Enter a rejection reason.");
      return;
    }
    const beforeLifecycle =
      getInstituteSubscription(selected.instituteId)?.lifecycleStatus ?? null;
    const beforePayments = listPaymentRecords(selected.instituteId).length;

    const updated = rejectOfflinePayment(selected.submissionId, {
      reason,
      reviewedBy: "Nexus Operator",
    });
    if (!updated || updated.status !== "rejected") {
      setError("Could not reject this payment.");
      return;
    }

    const after = getInstituteSubscription(selected.instituteId);
    if (after?.lifecycleStatus === "active" && beforeLifecycle !== "active") {
      setError("Reject must not activate the institute.");
      return;
    }
    if (listPaymentRecords(selected.instituteId).length < beforePayments) {
      setError("Rejection failed: payment records must not be deleted.");
      return;
    }

    setFlash(
      `Rejected · ${selected.instituteName} · ${labelSubscriptionLifecycle(after?.lifecycleStatus ?? "read_only")}`,
    );
    window.setTimeout(() => setFlash(null), 4000);
    closeDialog();
    setTick((t) => t + 1);
  };

  return (
    <>
      <Card className="mb-4">
        <CardHeader
          title="Pending Payments"
          hint="Admin offline submissions · VIEW · APPROVE · REJECT · history kept"
          action={
            <Pill tone={pending.length ? "warning" : "info"}>
              {pending.length} pending
            </Pill>
          }
        />
        <div className="px-5 pb-5 space-y-3">
          {flash ? (
            <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
              {flash}
            </div>
          ) : null}

          {pending.length === 0 ? (
            <div className="flex items-start gap-3 rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
              <Banknote className="size-4 mt-0.5 shrink-0" />
              <div>
                No pending payments. When an institute Admin submits Pay Offline, the request
                appears here for verification.
              </div>
            </div>
          ) : (
            pending.map((row) => (
              <div
                key={row.submissionId}
                className="rounded-lg border border-border bg-background/50 px-4 py-3 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{row.instituteName}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      {row.instituteId} · {formatInr(row.payableAmountInr)} ·{" "}
                      {labelSubscriptionDuration(row.durationMonths)}
                    </div>
                  </div>
                  <Pill tone="warning">{labelOfflinePaymentStatus(row.status)}</Pill>
                </div>
                <DetailGrid row={row} />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => open(row, "view")}>
                    <Eye className="size-3.5" /> VIEW
                  </Button>
                  <Button size="sm" variant="primary" onClick={() => open(row, "approve")}>
                    <Check className="size-3.5" /> APPROVE
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => open(row, "reject")}>
                    <X className="size-3.5" /> REJECT
                  </Button>
                  <Link to="/institutes/$id" params={{ id: row.instituteId }}>
                    <Button size="sm">
                      <Link2 className="size-3.5" /> Institute
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="mb-4">
        <CardHeader
          title="Seat adjustments · pending verification"
          hint="Post-renewal student adds · separate from renewal snapshot"
          action={
            <Pill tone={pendingAdjustments.length ? "warning" : "info"}>
              {pendingAdjustments.length} pending
            </Pill>
          }
        />
        <div className="px-5 pb-5 space-y-3">
          {pendingAdjustments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No seat-adjustment payments waiting. Consolidated charges appear here after Admin
              Review &amp; Pay.
            </p>
          ) : (
            pendingAdjustments.map((row) => (
              <div
                key={row.adjustmentId}
                className="rounded-lg border border-border bg-background/50 px-4 py-3 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">{row.instituteName}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      +{row.additionalStudentCount} students · {formatInr(row.payableAmountInr)} ·
                      ref {row.referenceId}
                    </div>
                  </div>
                  <Pill tone="warning">VERIFICATION_PENDING</Pill>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      const next = approveBillingAdjustment(row.adjustmentId, {
                        reviewedBy: "Nexus Operator",
                      });
                      if (next) {
                        setFlash(
                          `Seat adjustment approved · ${row.instituteName} · ${formatInr(row.payableAmountInr)}`,
                        );
                        window.setTimeout(() => setFlash(null), 4000);
                        setTick((t) => t + 1);
                      }
                    }}
                  >
                    <Check className="size-3.5" /> APPROVE
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      rejectBillingAdjustment(row.adjustmentId, {
                        reason: "Adjustment payment rejected",
                        reviewedBy: "Nexus Operator",
                      });
                      setFlash(`Seat adjustment rejected · ${row.instituteName}`);
                      window.setTimeout(() => setFlash(null), 4000);
                      setTick((t) => t + 1);
                    }}
                  >
                    <X className="size-3.5" /> REJECT
                  </Button>
                  <Link to="/institutes/$id" params={{ id: row.instituteId }}>
                    <Button size="sm">
                      <Link2 className="size-3.5" /> Institute
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="mb-4">
        <CardHeader
          title="Payment verification history"
          hint="Approvals and rejections are append-only · payment rows are never deleted"
        />
        <div className="px-5 pb-5 space-y-2">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No verified payments yet.</p>
          ) : (
            history.map((row) => (
              <div
                key={row.submissionId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{row.instituteName}</div>
                  <div className="text-muted-foreground font-mono">
                    {formatInr(row.payableAmountInr)} · {row.referenceId} ·{" "}
                    {formatDateTime(row.reviewedAt ?? row.submittedAt)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone={row.status === "paid" ? "success" : "danger"}>
                    {labelOfflinePaymentStatus(row.status)}
                  </Pill>
                  <Button size="sm" onClick={() => open(row, "view")}>
                    <Eye className="size-3.5" /> VIEW
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Modal
        open={mode != null && selected != null}
        onClose={closeDialog}
        title={
          mode === "approve"
            ? "Approve offline payment"
            : mode === "reject"
              ? "Reject offline payment"
              : "Payment details"
        }
        subtitle={selected ? `${selected.instituteName} · ${selected.referenceId}` : undefined}
        size="lg"
        footer={
          mode === "approve" ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button onClick={closeDialog}>Cancel</Button>
              <Button variant="primary" onClick={onApprove}>
                <Check className="size-3.5" /> Confirm APPROVE
              </Button>
            </div>
          ) : mode === "reject" ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button onClick={closeDialog}>Cancel</Button>
              <Button variant="primary" onClick={onReject}>
                <X className="size-3.5" /> Confirm REJECT
              </Button>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button onClick={closeDialog}>Close</Button>
            </div>
          )
        }
      >
        {selected ? (
          <div className="space-y-4">
            {error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            ) : null}
            <DetailGrid row={selected} />
            {mode === "approve" ? (
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                Approving sets payment to <strong>PAID</strong>, subscription to{" "}
                <strong>ACTIVE</strong>, creates an immutable renewal record, sets start/end
                dates, and clears Admin read-only. Payment history is kept.
              </p>
            ) : null}
            {mode === "reject" ? (
              <div className="space-y-3">
                <p className="text-[12px] text-muted-foreground leading-relaxed">
                  Rejecting sets payment to <strong>REJECTED</strong>. The institute stays
                  expired / grace / read-only and is <strong>not</strong> activated.
                </p>
                <Field label="Rejection reason">
                  <TextInput
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. Reference not found in bank statement"
                  />
                </Field>
              </div>
            ) : null}
            {selected.rejectionReason ? (
              <p className="text-[12px] text-destructive">
                Rejection reason: {selected.rejectionReason}
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </>
  );
}
