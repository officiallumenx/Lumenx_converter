import {
  Button,
  Card,
  CardHeader,
  Field,
  FormGrid,
  Modal,
  Pill,
  Select,
  TextInput,
} from "@lumenx/ui-admin";
import { IndianRupee, Wallet } from "lucide-react";
import { useState } from "react";
import {
  BILLING_LIFECYCLE_STATUSES,
  billingLifecycleTone,
  billingPaymentTone,
  cancelInvoice,
  formatBillingDateTime,
  formatBillingMoney,
  formatPeriodLabel,
  labelBillingLifecycleStatus,
  labelPaymentMethod,
  listBillingHistory,
  listInvoiceHistory,
  listPaymentsForInstitute,
  recordMockPayment,
  type BillingLifecycleStatus,
  type BillingPaymentMethod,
} from "@/lib/institute-billing-store";

type Tab = "invoices" | "payments" | "billing";

export function InstituteBillingHistoryPanel({
  instituteId,
  onChanged,
}: {
  instituteId: string;
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<Tab>("invoices");
  const [payOpen, setPayOpen] = useState(false);
  const [payInvoiceId, setPayInvoiceId] = useState<string>("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<BillingPaymentMethod>("bank_transfer");
  const [payNote, setPayNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const invoices = listInvoiceHistory(instituteId);
  const payments = listPaymentsForInstitute(instituteId);
  const billingEvents = listBillingHistory(instituteId);
  const outstandingTotal = invoices.reduce((s, r) => s + r.outstandingInr, 0);
  const payable = invoices.filter(
    (r) =>
      r.outstandingInr > 0 &&
      r.lifecycleStatus !== "cancelled" &&
      r.lifecycleStatus !== "draft",
  );

  const openPay = (invoiceId?: string) => {
    const target = invoiceId
      ? payable.find((r) => r.invoice.id === invoiceId)
      : payable[0];
    if (!target) {
      setError("No open invoice with outstanding balance.");
      return;
    }
    setError(null);
    setPayInvoiceId(target.invoice.id);
    setPayAmount(String(target.outstandingInr));
    setPayMethod("bank_transfer");
    setPayNote("");
    setPayOpen(true);
  };

  const submitPay = () => {
    const result = recordMockPayment({
      invoiceId: payInvoiceId,
      amountInr: Number(payAmount) || 0,
      method: payMethod,
      note: payNote || "Mock payment — no gateway",
    });
    if (!result.ok) {
      if (result.reason === "invalid_amount") setError("Enter a valid payment amount.");
      else if (result.reason === "already_paid") setError("Invoice is already paid.");
      else if (result.reason === "cancelled") setError("Cannot pay a cancelled invoice.");
      else if (result.reason === "draft") setError("Cannot pay a draft invoice.");
      else setError("Invoice not found.");
      return;
    }
    setPayOpen(false);
    setFlash(
      `Mock payment ${formatBillingMoney(result.payment.amountInr)} recorded on ${result.payment.invoiceNumber}. No gateway was used.`,
    );
    window.setTimeout(() => setFlash(null), 3500);
    onChanged();
  };

  const onCancel = (invoiceId: string) => {
    const result = cancelInvoice(invoiceId, "Cancelled by operator");
    if (!result.ok) {
      setError(
        result.reason === "already_cancelled"
          ? "Invoice is already cancelled."
          : "Invoice not found.",
      );
      return;
    }
    setFlash(`${result.invoice.invoiceNumber} marked Cancelled.`);
    window.setTimeout(() => setFlash(null), 2800);
    onChanged();
  };

  return (
    <>
      <Card className="mb-4">
        <CardHeader
          title="History & balances"
          hint="Payment · Invoice · Billing history · mock ledger only (no gateway)"
          action={
            <Button size="sm" onClick={() => openPay()} disabled={payable.length === 0}>
              <Wallet className="size-3.5" /> Record mock payment
            </Button>
          }
        />
        <div className="px-5 pb-5 space-y-4">
          {flash && (
            <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
              {flash}
            </div>
          )}
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat
              label="Outstanding (all open)"
              value={formatBillingMoney(outstandingTotal)}
            />
            <Stat label="Invoices" value={String(invoices.length)} />
            <Stat label="Payments (mock)" value={String(payments.length)} />
            <Stat
              label="Statuses"
              value="Draft · Issued · Pending · Paid · Overdue · Cancelled"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                ["invoices", "Invoice history"],
                ["payments", "Payment history"],
                ["billing", "Billing history"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-md border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                  tab === id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-surface-hover"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {BILLING_LIFECYCLE_STATUSES.map((s) => (
              <Pill key={s} tone={billingLifecycleTone(s)}>
                {labelBillingLifecycleStatus(s)}
              </Pill>
            ))}
          </div>

          {tab === "invoices" && (
            <div className="rounded-md border border-border overflow-hidden">
              <div className="px-3 py-2 border-b border-border text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                Invoice history
              </div>
              {invoices.length === 0 ? (
                <div className="px-3 py-6 text-xs text-muted-foreground">No invoices yet.</div>
              ) : (
                <div className="divide-y divide-border">
                  {invoices.map((row) => (
                    <div
                      key={row.invoice.id}
                      className="px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-mono font-medium">{row.invoice.invoiceNumber}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatPeriodLabel(
                            row.invoice.billingPeriodStart,
                            row.invoice.billingPeriodEnd,
                          )}{" "}
                          · Final {formatBillingMoney(row.invoice.finalAmountInr)}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Pill tone={billingLifecycleTone(row.lifecycleStatus)}>
                          {labelBillingLifecycleStatus(row.lifecycleStatus)}
                        </Pill>
                        <Pill tone={billingPaymentTone(row.paymentStatus)}>
                          Pay · {labelBillingLifecycleStatus(row.paymentStatus)}
                        </Pill>
                        <span className="font-mono text-[11px]">
                          Due {formatBillingMoney(row.outstandingInr)}
                        </span>
                        {row.outstandingInr > 0 && row.lifecycleStatus !== "cancelled" && (
                          <Button size="sm" variant="outline" onClick={() => openPay(row.invoice.id)}>
                            Pay
                          </Button>
                        )}
                        {row.lifecycleStatus !== "cancelled" &&
                          row.lifecycleStatus !== "paid" && (
                            <Button size="sm" variant="outline" onClick={() => onCancel(row.invoice.id)}>
                              Cancel
                            </Button>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "payments" && (
            <div className="rounded-md border border-border overflow-hidden">
              <div className="px-3 py-2 border-b border-border text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                Payment history (mock ledger · no gateway)
              </div>
              {payments.length === 0 ? (
                <div className="px-3 py-6 text-xs text-muted-foreground">No payments recorded.</div>
              ) : (
                <div className="divide-y divide-border">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <div className="font-mono font-medium">{formatBillingMoney(p.amountInr)}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {p.invoiceNumber} · {labelPaymentMethod(p.method)} ·{" "}
                          {formatBillingDateTime(p.recordedAt)}
                        </div>
                        {p.note ? (
                          <div className="text-[10px] text-muted-foreground mt-0.5">{p.note}</div>
                        ) : null}
                      </div>
                      <Pill tone="success">Recorded</Pill>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "billing" && (
            <div className="rounded-md border border-border overflow-hidden">
              <div className="px-3 py-2 border-b border-border text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                Billing history
              </div>
              {billingEvents.length === 0 ? (
                <div className="px-3 py-6 text-xs text-muted-foreground">No billing events yet.</div>
              ) : (
                <div className="divide-y divide-border">
                  {billingEvents.map((e) => (
                    <div
                      key={e.id}
                      className="px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-medium">{e.title}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatBillingDateTime(e.at)} · {e.detail}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {e.amountInr !== undefined && (
                          <span className="font-mono text-[11px]">
                            {formatBillingMoney(e.amountInr)}
                          </span>
                        )}
                        {e.status && (
                          <Pill tone={billingLifecycleTone(e.status)}>
                            {labelBillingLifecycleStatus(e.status)}
                          </Pill>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Record mock payment"
        subtitle="Local ledger only — no payment gateway · no real charge"
        footer={
          <>
            <Button onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={submitPay}>
              Save mock payment
            </Button>
          </>
        }
      >
        <FormGrid cols={1}>
          <Field label="Invoice" required>
            <Select value={payInvoiceId} onChange={(e) => setPayInvoiceId(e.target.value)}>
              {payable.map((r) => (
                <option key={r.invoice.id} value={r.invoice.id}>
                  {r.invoice.invoiceNumber} · outstanding{" "}
                  {formatBillingMoney(r.outstandingInr)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Amount (₹)" required>
            <TextInput
              type="number"
              min={1}
              leadingIcon={<IndianRupee />}
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
          </Field>
          <Field label="Method">
            <Select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as BillingPaymentMethod)}
            >
              <option value="bank_transfer">Bank transfer</option>
              <option value="upi">UPI</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          <Field label="Note">
            <TextInput
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              placeholder="Mock payment — no gateway"
            />
          </Field>
        </FormGrid>
      </Modal>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/40 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        {label}
      </div>
      <div className="mt-1 text-xs font-medium">{value}</div>
    </div>
  );
}
