/**
 * Nexus pending offline payments — API auth mode.
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
import { Banknote, Check, Eye, Link2, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { labelSubscriptionDuration } from "@lumenx/utils";
import { loadPendingOfflinePayments } from "@/lib/billing/load-pending";
import {
  performRejectPayment,
  performVerifyPayment,
} from "@/lib/billing/review-actions";
import type { OfflinePaymentSubmissionDto } from "@/lib/billing/api-types";

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

function DetailGrid({ row }: { row: OfflinePaymentSubmissionDto }) {
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
      <Detail label="Duration" value={labelSubscriptionDuration(row.durationMonths)} />
      <Detail label="Final payable amount" value={formatInr(row.payableAmountInr)} mono />
      <Detail label="Reference ID" value={row.referenceId} mono />
      <Detail
        label="Proof"
        value={row.proofLabel?.trim() ? row.proofLabel : "Not provided"}
      />
      <Detail label="Submitted" value={formatDateTime(row.submittedAt)} />
      <Detail label="Status" value="VERIFICATION_PENDING" />
    </div>
  );
}

type DialogMode = "view" | "approve" | "reject" | null;

export function NexusOfflinePaymentsInboxApi() {
  const [pending, setPending] = useState<OfflinePaymentSubmissionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<DialogMode>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const state = await loadPendingOfflinePayments();
    setPending(state.pending);
    setLoadError(state.errorMessage);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const selected = pending.find((p) => p.paymentId === selectedId) ?? null;

  const closeDialog = () => {
    setMode(null);
    setSelectedId(null);
    setRejectReason("");
    setError(null);
  };

  const open = (row: OfflinePaymentSubmissionDto, next: DialogMode) => {
    setError(null);
    setSelectedId(row.paymentId);
    setMode(next);
    setRejectReason("");
  };

  const onApprove = async () => {
    if (!selected) return;
    setActing(true);
    setError(null);
    const result = await performVerifyPayment(selected);
    setActing(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setFlash(
      `Approved · ${selected.instituteName} · ${formatInr(selected.payableAmountInr)}`,
    );
    window.setTimeout(() => setFlash(null), 4000);
    closeDialog();
    void reload();
  };

  const onReject = async () => {
    if (!selected) return;
    setActing(true);
    setError(null);
    const result = await performRejectPayment(selected, rejectReason);
    setActing(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setFlash(`Rejected · ${selected.instituteName}`);
    window.setTimeout(() => setFlash(null), 4000);
    closeDialog();
    void reload();
  };

  return (
    <>
      <Card className="mb-4">
        <CardHeader
          title="Pending Payments"
          hint="Admin offline submissions · verify via API"
          action={
            <Pill tone={pending.length ? "warning" : "info"}>
              {loading ? "…" : `${pending.length} pending`}
            </Pill>
          }
        />
        <div className="px-5 pb-5 space-y-3">
          {flash ? (
            <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
              {flash}
            </div>
          ) : null}
          {loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : null}
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="size-4 animate-spin" /> Loading pending payments…
            </div>
          ) : pending.length === 0 ? (
            <div className="flex items-start gap-3 rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
              <Banknote className="size-4 mt-0.5 shrink-0" />
              <div>No pending offline payments.</div>
            </div>
          ) : (
            pending.map((row) => (
              <div
                key={row.paymentId}
                className="rounded-lg border border-border bg-background/50 px-4 py-3 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{row.instituteName}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      {formatInr(row.payableAmountInr)} ·{" "}
                      {labelSubscriptionDuration(row.durationMonths)}
                    </div>
                  </div>
                  <Pill tone="warning">VERIFICATION_PENDING</Pill>
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

      <Modal
        open={mode !== null && selected !== null}
        onClose={closeDialog}
        title={
          mode === "approve"
            ? "Approve offline payment"
            : mode === "reject"
              ? "Reject offline payment"
              : "Payment details"
        }
      >
        {selected ? (
          <div className="space-y-4">
            <DetailGrid row={selected} />
            {mode === "reject" ? (
              <Field label="Rejection reason">
                <TextInput
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Required"
                />
              </Field>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {mode === "approve" ? (
              <Button variant="primary" disabled={acting} onClick={() => void onApprove()}>
                {acting ? <Loader2 className="size-4 animate-spin" /> : null}
                Confirm approval
              </Button>
            ) : null}
            {mode === "reject" ? (
              <Button variant="outline" disabled={acting} onClick={() => void onReject()}>
                {acting ? <Loader2 className="size-4 animate-spin" /> : null}
                Confirm rejection
              </Button>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </>
  );
}
