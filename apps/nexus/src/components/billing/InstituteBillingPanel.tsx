import {
  Button,
  Card,
  CardHeader,
  Field,
  FormGrid,
  Modal,
  Pill,
  TextInput,
} from "@lumenx/ui-admin";
import { FilePlus2, FileText, IndianRupee, Pencil, RefreshCw, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { InstituteBillingHistoryPanel } from "@/components/billing/InstituteBillingHistoryPanel";
import {
  billingPaymentTone,
  calculatePlanBillStrict,
  formatBillingDateTime,
  formatBillingMoney,
  formatPeriodLabel,
  getInstituteBillingView,
  invoiceStatusTone,
  issueInvoice,
  labelBillingLifecycleStatus,
  labelBillingPaymentStatus,
  labelInvoiceStatus,
  labelPlanTenure,
  labelRateQuotePeriod,
  labelRenewalStatus,
  listInvoicesForInstitute,
  maxFreeMonthsForPlan,
  processMonthlyRenewal,
  renewalStatusTone,
  resolveBillingLifecycleStatus,
  resolvePaymentStatus,
  setAutoRenew,
  subscribeInstituteBilling,
  updateBillingPlan,
  validateBillingInputs,
  type DiscountKind,
  type PlanTenureMonths,
  type RateQuotePeriod,
  type IssuedInvoice,
} from "@/lib/institute-billing-store";

function DetailCell({
  label,
  value,
  mono,
  hint,
}: {
  label: string;
  value: string;
  mono?: boolean;
  hint?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-background/40 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{label}</div>
      <div className={`mt-1 text-xs font-medium ${mono ? "font-mono" : ""}`}>{value || "—"}</div>
      {hint ? <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

export function InstituteBillingPanel({ instituteId }: { instituteId: string }) {
  const [tick, setTick] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [renewalError, setRenewalError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeInstituteBilling(() => setTick((t) => t + 1));
  }, [instituteId]);

  void tick;
  const view = getInstituteBillingView(instituteId);
  const { calc, config, currentInvoice, renewal } = view;
  const invoices = listInvoicesForInstitute(instituteId);
  const viewing =
    invoices.find((i) => i.id === viewInvoiceId) ?? currentInvoice ?? invoices[0] ?? null;

  const onIssue = () => {
    setIssueError(null);
    const result = issueInvoice(instituteId);
    if (!result.ok) {
      if (result.reason === "period_already_invoiced") {
        setIssueError("An invoice already exists for the current billing period.");
      } else {
        setIssueError("Institute not found.");
      }
      return;
    }
    setFlash(`Invoice ${result.invoice.invoiceNumber} issued (immutable snapshot).`);
    setViewInvoiceId(result.invoice.id);
    window.setTimeout(() => setFlash(null), 3200);
    setTick((t) => t + 1);
  };

  const onRenew = (force: boolean) => {
    setRenewalError(null);
    const beforeIds = new Set(invoices.map((i) => i.id));
    const result = processMonthlyRenewal(instituteId, { force });
    if (!result.ok) {
      if (result.reason === "not_due") {
        setRenewalError(
          "Renewal is not due yet. Use “Process renewal now” to simulate the next period (demo).",
        );
      } else if (result.reason === "period_already_invoiced") {
        setRenewalError("An invoice already exists for the next billing period.");
      } else {
        setRenewalError("Institute not found.");
      }
      return;
    }
    const stillThere = [...beforeIds].every((id) =>
      listInvoicesForInstitute(instituteId).some((i) => i.id === id),
    );
    if (!stillThere) {
      setRenewalError("Renewal aborted: previous invoices must remain unchanged.");
      return;
    }
    setFlash(
      `Renewal issued ${result.invoice.invoiceNumber}. ${result.preservedInvoiceCount} prior invoice(s) unchanged. Institute was not suspended.`,
    );
    setViewInvoiceId(result.invoice.id);
    window.setTimeout(() => setFlash(null), 4000);
    setTick((t) => t + 1);
  };

  return (
    <>
      <Card className="mb-4">
        <CardHeader
          title="Invoices & renewals"
          hint="Issue invoices and simulate renewals · rate assignment is in Subscription pricing above"
          action={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="size-3.5" /> Edit legacy plan
              </Button>
              <Button size="sm" variant="primary" onClick={onIssue}>
                <FilePlus2 className="size-3.5" /> Generate Invoice
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setViewInvoiceId(currentInvoice?.id ?? invoices[0]?.id ?? null);
                  setInvoiceOpen(true);
                }}
                disabled={invoices.length === 0}
                title={invoices.length ? undefined : "No invoice issued yet"}
              >
                <FileText className="size-3.5" /> View Invoice
              </Button>
            </div>
          }
        />
        <div className="px-5 pb-5 space-y-4">
          {flash && (
            <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
              {flash}
            </div>
          )}
          {issueError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {issueError}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <DetailCell
              label="Rate quote"
              value={`${formatBillingMoney(config.quotedRateInr)} / ${labelRateQuotePeriod(config.rateQuotePeriod).toLowerCase()}`}
              mono
              hint={
                config.rateQuotePeriod === "yearly"
                  ? `≈ ${formatBillingMoney(calc.monthlyRateInr)} per student / month`
                  : "Per student / month"
              }
            />
            <DetailCell
              label="Plan"
              value={labelPlanTenure(config.planTenureMonths)}
              hint={`${config.planTenureMonths} × monthly rate × students`}
            />
            <DetailCell
              label="Active students"
              value={calc.activeStudentCount.toLocaleString("en-IN")}
              mono
            />
            <DetailCell
              label="Total amount"
              value={formatBillingMoney(calc.estimateInr)}
              mono
              hint={`${formatBillingMoney(calc.monthlyRateInr)} × ${config.planTenureMonths} × ${calc.activeStudentCount.toLocaleString("en-IN")}`}
            />
            <DetailCell
              label="Discount amount"
              value={formatBillingMoney(calc.discountAmountInr)}
              mono
              hint={
                calc.discountKind === "percent"
                  ? `${calc.discountPercent}% off`
                  : calc.discountKind === "free_months"
                    ? `${calc.freeMonths} free month${calc.freeMonths === 1 ? "" : "s"}`
                    : "No discount"
              }
            />
            <DetailCell
              label="Payable amount"
              value={formatBillingMoney(calc.finalAmountInr)}
              mono
              hint="Total − discount"
            />
            <DetailCell label="Billing period" value={view.billingPeriodLabel} />
            <DetailCell label="Invoice status" value={labelInvoiceStatus(view.invoiceStatus)} />
            <DetailCell
              label="Payment status"
              value={labelBillingPaymentStatus(view.paymentStatus)}
            />
            <DetailCell
              label="Next renewal"
              value={formatBillingDateTime(view.nextRenewalAt)}
              mono
            />
            <DetailCell
              label="Outstanding"
              value={formatBillingMoney(view.outstandingAmountInr)}
              mono
              hint={currentInvoice ? `On ${currentInvoice.invoiceNumber}` : "No open invoice"}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={invoiceStatusTone(view.invoiceStatus)}>
              Invoice · {labelInvoiceStatus(view.invoiceStatus)}
            </Pill>
            <Pill tone={billingPaymentTone(view.paymentStatus)}>
              Payment · {labelBillingPaymentStatus(view.paymentStatus)}
            </Pill>
            {currentInvoice ? (
              <span className="text-[10px] font-mono text-muted-foreground">
                {currentInvoice.invoiceNumber}
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground">
                Generate an invoice to create an immutable snapshot for this period.
              </span>
            )}
          </div>

          {invoices.length > 0 && (
            <div className="rounded-md border border-border overflow-hidden">
              <div className="px-3 py-2 border-b border-border text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                Issued invoices ({invoices.length}) · snapshots do not change with later edits
              </div>
              <div className="divide-y divide-border">
                {invoices.map((inv) => {
                  const life = resolveBillingLifecycleStatus(inv);
                  const pay = resolvePaymentStatus(inv);
                  return (
                    <button
                      key={inv.id}
                      type="button"
                      className="w-full px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 text-left hover:bg-surface-hover"
                      onClick={() => {
                        setViewInvoiceId(inv.id);
                        setInvoiceOpen(true);
                      }}
                    >
                      <div>
                        <div className="text-xs font-mono font-medium">{inv.invoiceNumber}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatPeriodLabel(inv.billingPeriodStart, inv.billingPeriodEnd)} ·{" "}
                          {formatBillingMoney(inv.finalAmountInr)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Pill tone={invoiceStatusTone(life)}>
                          {labelBillingLifecycleStatus(life)}
                        </Pill>
                        <Pill tone={billingPaymentTone(pay)}>
                          {labelBillingLifecycleStatus(pay)}
                        </Pill>
                        <FileText className="size-3.5 text-muted-foreground" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card className="mb-4">
        <CardHeader
          title="Renewals"
          hint="Monthly · new period → new invoice · prior invoices stay frozen · overdue never auto-suspends"
          action={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="primary" onClick={() => onRenew(true)}>
                <RefreshCw className="size-3.5" /> Process renewal now
              </Button>
            </div>
          }
        />
        <div className="px-5 pb-5 space-y-4">
          {renewalError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {renewalError}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <DetailCell label="Current billing period" value={renewal.currentBillingPeriodLabel} />
            <DetailCell
              label="Next billing date"
              value={formatBillingDateTime(renewal.nextBillingDate)}
              mono
            />
            <DetailCell
              label="Next renewal date"
              value={formatBillingDateTime(renewal.nextRenewalDate)}
              mono
            />
            <DetailCell
              label="Renewal status"
              value={labelRenewalStatus(renewal.renewalStatus)}
            />
            <DetailCell
              label="Auto-renew"
              value={renewal.autoRenew ? "On" : "Off"}
              hint="When on, due periods can be processed automatically in-app"
            />
            <DetailCell
              label="Last invoice"
              value={renewal.lastInvoice?.invoiceNumber ?? "—"}
              mono
              hint={
                renewal.lastInvoice
                  ? formatBillingMoney(renewal.lastInvoice.finalAmountInr)
                  : undefined
              }
            />
            <DetailCell
              label="Last payment"
              value={
                renewal.lastPayment
                  ? formatBillingMoney(renewal.lastPayment.amountInr)
                  : "—"
              }
              mono
              hint={
                renewal.lastPayment
                  ? `${renewal.lastPayment.invoiceNumber} · ${formatBillingDateTime(renewal.lastPayment.recordedAt)}`
                  : "No payment recorded"
              }
            />
            <DetailCell
              label="Outstanding amount"
              value={formatBillingMoney(renewal.outstandingAmountInr)}
              mono
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Pill tone={renewalStatusTone(renewal.renewalStatus)}>
              {labelRenewalStatus(renewal.renewalStatus)}
            </Pill>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={renewal.autoRenew}
                onChange={(e) => {
                  setAutoRenew(instituteId, e.target.checked);
                  setFlash(
                    e.target.checked
                      ? "Auto-renew enabled. Overdue invoices still will not suspend the institute."
                      : "Auto-renew disabled.",
                  );
                  window.setTimeout(() => setFlash(null), 2800);
                  setTick((t) => t + 1);
                }}
              />
              Auto-renew monthly
            </label>
            <span className="text-[10px] text-muted-foreground">
              Process renewal reads live student count + rate, issues a new invoice, and never
              suspends the institute.
            </span>
          </div>
        </div>
      </Card>

      <InstituteBillingHistoryPanel
        instituteId={instituteId}
        onChanged={() => setTick((t) => t + 1)}
      />

      <EditBillingPlanModal
        open={editOpen}
        instituteId={instituteId}
        initialQuotedRate={config.quotedRateInr}
        initialQuotePeriod={config.rateQuotePeriod}
        initialPlanMonths={config.planTenureMonths}
        initialDiscountKind={config.discountKind}
        initialDiscountPercent={config.discountPercent}
        initialFreeMonths={config.freeMonths}
        activeStudentCount={calc.activeStudentCount}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false);
          setFlash("Plan updated. Existing invoices were not changed.");
          window.setTimeout(() => setFlash(null), 2800);
          setTick((t) => t + 1);
        }}
      />

      <ViewInvoiceModal
        open={invoiceOpen}
        invoice={viewing}
        invoices={invoices}
        onSelect={(id) => setViewInvoiceId(id)}
        onClose={() => setInvoiceOpen(false)}
      />
    </>
  );
}

function EditBillingPlanModal({
  open,
  instituteId,
  initialQuotedRate,
  initialQuotePeriod,
  initialPlanMonths,
  initialDiscountKind,
  initialDiscountPercent,
  initialFreeMonths,
  activeStudentCount,
  onClose,
  onSaved,
}: {
  open: boolean;
  instituteId: string;
  initialQuotedRate: number;
  initialQuotePeriod: RateQuotePeriod;
  initialPlanMonths: PlanTenureMonths;
  initialDiscountKind: DiscountKind;
  initialDiscountPercent: number;
  initialFreeMonths: number;
  activeStudentCount: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [quotedRate, setQuotedRate] = useState(String(initialQuotedRate));
  const [quotePeriod, setQuotePeriod] = useState<RateQuotePeriod>(initialQuotePeriod);
  const [planMonths, setPlanMonths] = useState<PlanTenureMonths>(initialPlanMonths);
  const [discountKind, setDiscountKind] = useState<DiscountKind>(initialDiscountKind);
  const [discountPercent, setDiscountPercent] = useState(String(initialDiscountPercent));
  const [freeMonths, setFreeMonths] = useState(String(initialFreeMonths));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuotedRate(String(initialQuotedRate));
    setQuotePeriod(initialQuotePeriod);
    setPlanMonths(initialPlanMonths);
    setDiscountKind(initialDiscountKind);
    setDiscountPercent(String(initialDiscountPercent));
    setFreeMonths(String(initialFreeMonths));
    setError(null);
  }, [
    open,
    initialQuotedRate,
    initialQuotePeriod,
    initialPlanMonths,
    initialDiscountKind,
    initialDiscountPercent,
    initialFreeMonths,
    instituteId,
  ]);

  const maxFree = maxFreeMonthsForPlan(planMonths);

  const preview = calculatePlanBillStrict({
    activeStudentCount,
    quotedRateInr: quotedRate,
    rateQuotePeriod: quotePeriod,
    planTenureMonths: planMonths,
    discountKind,
    discountPercent,
    freeMonths,
  });
  const previewOk = preview.ok ? preview.result : null;

  const save = () => {
    const validation = validateBillingInputs({
      activeStudentCount,
      quotedRateInr: quotedRate,
      rateQuotePeriod: quotePeriod,
      planTenureMonths: planMonths,
      discountKind,
      discountPercent,
      freeMonths,
    });
    if (!validation.ok) {
      setError(validation.issues[0]?.message ?? "Invalid billing values.");
      return;
    }
    const saved = updateBillingPlan(instituteId, {
      quotedRateInr: validation.normalized.quotedRateInr,
      rateQuotePeriod: validation.normalized.rateQuotePeriod,
      planTenureMonths: validation.normalized.planTenureMonths,
      discountKind: validation.normalized.discountKind,
      discountPercent: validation.normalized.discountPercent,
      freeMonths: validation.normalized.freeMonths,
    });
    if (!saved) {
      setError("Could not save. Check the values and try again.");
      return;
    }
    onSaved();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit billing plan"
      subtitle="Per-student rate · choose quote period, plan length, and one discount"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save}>
            <Save className="size-3.5" /> Save plan
          </Button>
        </>
      }
    >
      <FormGrid cols={1}>
        <Field label="Per student rate (₹)" required>
          <TextInput
            type="number"
            min={1}
            step={1}
            leadingIcon={<IndianRupee />}
            value={quotedRate}
            onChange={(e) => {
              setQuotedRate(e.target.value);
              setError(null);
            }}
          />
        </Field>

        <Field label="Rate quoted as" required>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: "monthly" as const, label: "Monthly", hint: "₹ per student / month" },
                { id: "yearly" as const, label: "Yearly", hint: "÷ 12 → monthly rate" },
              ] as const
            ).map((opt) => {
              const active = quotePeriod === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`rounded-md border px-3 py-2.5 text-left transition-colors ${
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background hover:bg-surface-hover"
                  }`}
                  onClick={() => {
                    setQuotePeriod(opt.id);
                    setError(null);
                  }}
                >
                  <div className="text-xs font-semibold">{opt.label}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">{opt.hint}</div>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Plan length" required>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 1 as const, label: "1 month" },
                { id: 6 as const, label: "6 months" },
                { id: 12 as const, label: "1 year" },
              ] as const
            ).map((opt) => {
              const active = planMonths === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`rounded-md border px-3 py-2.5 text-center transition-colors ${
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background hover:bg-surface-hover"
                  }`}
                  onClick={() => {
                    setPlanMonths(opt.id);
                    if (opt.id === 1 && discountKind === "free_months") {
                      setDiscountKind("none");
                      setFreeMonths("0");
                    } else if (
                      discountKind === "free_months" &&
                      Number(freeMonths) > maxFreeMonthsForPlan(opt.id)
                    ) {
                      setFreeMonths(String(maxFreeMonthsForPlan(opt.id)));
                    }
                    setError(null);
                  }}
                >
                  <div className="text-xs font-semibold">{opt.label}</div>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Discount (choose one)" required>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: "none" as const, label: "None" },
                { id: "percent" as const, label: "% off" },
                { id: "free_months" as const, label: "Free months" },
              ] as const
            ).map((opt) => {
              const disabled = opt.id === "free_months" && maxFree === 0;
              const active = discountKind === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={disabled}
                  className={`rounded-md border px-3 py-2.5 text-center transition-colors disabled:opacity-40 ${
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background hover:bg-surface-hover"
                  }`}
                  onClick={() => {
                    setDiscountKind(opt.id);
                    setError(null);
                  }}
                >
                  <div className="text-xs font-semibold">{opt.label}</div>
                </button>
              );
            })}
          </div>
        </Field>

        {discountKind === "percent" ? (
          <Field label="Discount percent" required hint="e.g. 12 = 12% off the estimate">
            <TextInput
              type="number"
              min={0}
              max={100}
              step={1}
              value={discountPercent}
              onChange={(e) => {
                setDiscountPercent(e.target.value);
                setError(null);
              }}
            />
          </Field>
        ) : null}

        {discountKind === "free_months" ? (
          <Field
            label="Free months"
            required
            hint={`Max ${maxFree} for ${labelPlanTenure(planMonths)}`}
          >
            <TextInput
              type="number"
              min={0}
              max={maxFree}
              step={1}
              value={freeMonths}
              onChange={(e) => {
                setFreeMonths(e.target.value);
                setError(null);
              }}
            />
          </Field>
        ) : null}

        <div className="rounded-md border border-border bg-muted/20 px-3 py-2.5 text-[11px] space-y-2">
          <div className="font-mono space-y-1">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Total amount</span>
              <span>{previewOk ? formatBillingMoney(previewOk.estimateInr) : "—"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Discount amount</span>
              <span className="text-success">
                {previewOk
                  ? previewOk.discountAmountInr > 0
                    ? `− ${formatBillingMoney(previewOk.discountAmountInr)}`
                    : formatBillingMoney(0)
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between gap-3 border-t border-border/60 pt-1.5 font-semibold text-foreground">
              <span>Payable amount</span>
              <span>{previewOk ? formatBillingMoney(previewOk.finalAmountInr) : "—"}</span>
            </div>
          </div>
          {previewOk ? (
            <div className="text-[10px] text-muted-foreground font-mono">
              {formatBillingMoney(previewOk.monthlyRateInr)} × {previewOk.planTenureMonths} mo ×{" "}
              {activeStudentCount.toLocaleString("en-IN")} students
              {previewOk.discountKind === "percent"
                ? ` · ${previewOk.discountPercent}% off`
                : previewOk.discountKind === "free_months"
                  ? ` · ${previewOk.freeMonths} free mo (bill ${previewOk.billableMonths})`
                  : ""}
            </div>
          ) : null}
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        <p className="text-[11px] text-muted-foreground">
          Saving does not rewrite issued invoices. Prior periods stay frozen.
        </p>
      </FormGrid>
    </Modal>
  );
}

function ViewInvoiceModal({
  open,
  invoice,
  invoices,
  onSelect,
  onClose,
}: {
  open: boolean;
  invoice: IssuedInvoice | null;
  invoices: IssuedInvoice[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const life = invoice ? resolveBillingLifecycleStatus(invoice) : null;
  const pay = invoice ? resolvePaymentStatus(invoice) : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={invoice ? invoice.invoiceNumber : "Invoice"}
      subtitle={invoice ? "Immutable snapshot at issue · pricing changes do not rewrite this record" : undefined}
      footer={<Button onClick={onClose}>Close</Button>}
    >
      {!invoice ? (
        <p className="text-sm text-muted-foreground">No invoice has been issued for this institute yet.</p>
      ) : (
        <div className="space-y-3 text-xs">
          {invoices.length > 1 && (
            <Field label="Select invoice">
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs"
                value={invoice.id}
                onChange={(e) => onSelect(e.target.value)}
              >
                {invoices.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.invoiceNumber} · {formatBillingMoney(i.finalAmountInr)}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <div className="flex flex-wrap gap-2">
            {life && (
              <Pill tone={invoiceStatusTone(life)}>{labelBillingLifecycleStatus(life)}</Pill>
            )}
            {pay && (
              <Pill tone={billingPaymentTone(pay)}>
                Payment · {labelBillingLifecycleStatus(pay)}
              </Pill>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <DetailCell label="Invoice number" value={invoice.invoiceNumber} mono />
            <DetailCell label="Institute" value={invoice.instituteName} />
            <DetailCell
              label="Billing period"
              value={formatPeriodLabel(invoice.billingPeriodStart, invoice.billingPeriodEnd)}
            />
            <DetailCell
              label="Active student count"
              value={invoice.activeStudentCount.toLocaleString("en-IN")}
              mono
            />
            <DetailCell
              label="Per-student rate (monthly)"
              value={formatBillingMoney(invoice.perStudentRateInr)}
              mono
              hint={
                invoice.rateQuotePeriod === "yearly"
                  ? `Quoted ${formatBillingMoney(invoice.quotedRateInr)} / year`
                  : `Quoted ${formatBillingMoney(invoice.quotedRateInr)} / month`
              }
            />
            <DetailCell
              label="Plan"
              value={labelPlanTenure(invoice.planTenureMonths)}
              mono
            />
            <DetailCell
              label="Total amount"
              value={formatBillingMoney(invoice.estimateInr)}
              mono
            />
            <DetailCell
              label="Discount amount"
              value={formatBillingMoney(invoice.discountAmountInr)}
              mono
              hint={
                invoice.discountKind === "percent"
                  ? `${invoice.discountPercent}%`
                  : invoice.discountKind === "free_months"
                    ? `${invoice.freeMonths} free mo`
                    : "None"
              }
            />
            <DetailCell
              label="Payable amount"
              value={formatBillingMoney(invoice.finalAmountInr)}
              mono
              hint={`Billable ${invoice.billableMonths} month(s)`}
            />
            <DetailCell label="Issue date" value={formatBillingDateTime(invoice.issueDate)} mono />
            <DetailCell label="Due date" value={formatBillingDateTime(invoice.dueDate)} mono />
            <DetailCell
              label="Payment status"
              value={pay ? labelBillingLifecycleStatus(pay) : "—"}
            />
            <DetailCell
              label="Outstanding"
              value={formatBillingMoney(
                Math.max(0, invoice.finalAmountInr - invoice.amountPaidInr),
              )}
              mono
            />
          </div>
        </div>
      )}
    </Modal>
  );
}
