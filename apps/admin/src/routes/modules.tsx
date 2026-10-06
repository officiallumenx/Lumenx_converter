import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ModuleHero } from "@/components/module-shell";
import { useAdminToast } from "@/components/AdminActionToast";
import { useAuth } from "@/auth/AuthContext";
import { PinInput } from "@/auth/components/PinInput";
import { mockVerifyAppPin, PIN_LENGTH, MAX_PIN_ATTEMPTS } from "@/auth/app-lock-store";
import {
  Card,
  CardHeader,
  Pill,
  Button,
  Modal,
  Field,
  Select,
} from "@lumenx/ui-admin";
import { CreditCard, FileText, Lock, Download } from "lucide-react";
import { ADMIN_MODULE_LABELS as M, adminPageTitle } from "@/lib/admin-module-labels";
import { isApiAuthMode } from "@/auth/auth-mode";
import { ModulesApiSubscriptionPanel } from "@/components/modules/ModulesApiSubscriptionPanel";
import { ModulesCatalogPanel } from "@/components/modules/ModulesCatalogPanel";
import { useState } from "react";
import { useAdminWriteAccess } from "@/components/admin-write/AdminWriteAccessContext";
import { getBoundSubscriptionTrialView } from "@/lib/sync-admin-subscription-access";
import { labelSubscriptionLifecycle } from "@lumenx/utils";
import {
  BILLING_TERMS_TEXT,
  BILLING_TERMS_VERSION,
  completeSecurePayment,
  downloadInvoice,
  formatDateTime,
  formatInr,
  getLatestInvoice,
  gstOnAmount,
  loadInstituteBilling,
  markPlanPending,
  nextRenewalDate,
  type BillingInvoice,
  type InstituteBillingPlan,
  type PaymentMethod,
} from "@/lib/institute-billing-store";

export const Route = createFileRoute("/modules")({
  head: () => ({ meta: [{ title: adminPageTitle("/modules") }] }),
  component: ModulesPage,
});

type PayStep = "review" | "pin" | "processing" | "invoice";

function ModulesDemoPage() {
  const notify = useAdminToast();
  const { guardWriteAction, writesAllowed, reason } = useAdminWriteAccess();
  const { user } = useAuth();
  const [billing, setBilling] = useState<InstituteBillingPlan>(() => loadInstituteBilling());
  const [payOpen, setPayOpen] = useState(false);
  const [payStep, setPayStep] = useState<PayStep>("review");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("upi");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinAttempts, setPinAttempts] = useState(0);
  const [invoice, setInvoice] = useState<BillingInvoice | null>(null);

  const renewal = nextRenewalDate(billing);
  const subView = getBoundSubscriptionTrialView();
  const inFreeTrial =
    subView?.lifecycleStatus === "trial_active" ||
    subView?.lifecycleStatus === "trial_expiring";
  const subscriptionActive = subView?.lifecycleStatus === "active";
  // During free trial: no payment due / do not surface post-renewal charges.
  const needsPay =
    !inFreeTrial &&
    !subscriptionActive &&
    (subView
      ? subView.showRenewalCta
      : billing.paymentStatus !== "paid");
  const { gstInr, totalInr } = gstOnAmount(billing.amountInr);
  const latestInvoice = getLatestInvoice(billing);

  const resetPayFlow = () => {
    setPayStep("review");
    setAcceptedTerms(false);
    setPin("");
    setPinError("");
    setPinAttempts(0);
    setInvoice(null);
  };

  const openPay = () => {
    resetPayFlow();
    setPayOpen(true);
  };

  const openInvoice = (inv: BillingInvoice) => {
    setInvoice(inv);
    setPayStep("invoice");
    setPayOpen(true);
  };

  const closePay = () => {
    if (payStep === "processing") return;
    setPayOpen(false);
    resetPayFlow();
  };

  const goToPin = () => {
    if (!acceptedTerms) {
      notify("Accept Terms & Conditions to continue");
      return;
    }
    setPin("");
    setPinError("");
    setPayStep("pin");
  };

  const submitPinPayment = async () => {
    if (pin.length !== PIN_LENGTH) {
      setPinError("Enter your 6-digit security PIN");
      return;
    }
    const userId = user?.id ?? "demo";
    setPayStep("processing");
    setBilling(markPlanPending(billing));

    const ok = await mockVerifyAppPin(userId, pin);
    if (!ok) {
      const nextAttempts = pinAttempts + 1;
      setPinAttempts(nextAttempts);
      setPin("");
      setPayStep("pin");
      setPinError(
        nextAttempts >= 5
          ? "Too many incorrect PIN attempts. Try again later or reset PIN."
          : `Incorrect PIN. ${5 - nextAttempts} attempt${5 - nextAttempts === 1 ? "" : "s"} left.`,
      );
      setBilling(loadInstituteBilling());
      return;
    }

    await new Promise((r) => setTimeout(r, 700));
    const termsAcceptedAt = new Date().toISOString().slice(0, 16);
    const result = completeSecurePayment(loadInstituteBilling(), payMethod, termsAcceptedAt);
    setBilling(result.plan);
    setInvoice(result.invoice);
    setPayStep("invoice");
    notify(`Payment secured · Invoice ${result.invoice.invoiceId} generated`);
  };

  return (
    <AppShell
      title={M.modules}
      subtitle="Enable or disable modules for this Admin app"
      actions={
        inFreeTrial ? (
          <Pill tone="info">
            Free trial
            {subView?.trialDaysRemaining != null
              ? ` · ${subView.trialDaysRemaining}d left`
              : ""}
          </Pill>
        ) : needsPay ? (
          <Link to="/subscription">
            <Button variant="primary" data-admin-allow-readonly>
              <Lock className="size-3.5" /> Renew on Subscription
            </Button>
          </Link>
        ) : latestInvoice ? (
          <Button onClick={() => openInvoice(latestInvoice)}>
            <FileText className="size-3.5" /> View invoice
          </Button>
        ) : (
          <Pill tone="success">{subscriptionActive ? "Subscription active" : "Plan paid"}</Pill>
        )
      }
    >
      <ModuleHero
        compact
        eyebrow="Operations"
        title={M.modules}
        subtitle="Enable or disable modules for this Admin app"
      />
      <Card className="mb-6">
        <CardHeader
          title="Institute plan"
          hint={
            inFreeTrial
              ? "60-day free trial after Nexus approval · full access · no payment required"
              : "Toggle modules below · renew on Subscription"
          }
        />
        <div className="px-5 pb-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-8 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-semibold">{billing.instituteName}</div>
                {subView ? (
                  <Pill
                    tone={
                      inFreeTrial
                        ? "info"
                        : subscriptionActive
                          ? "success"
                          : subView.lifecycleStatus === "read_only"
                            ? "danger"
                            : "warning"
                    }
                  >
                    {labelSubscriptionLifecycle(subView.lifecycleStatus)}
                  </Pill>
                ) : null}
                {!inFreeTrial && billing.paymentStatus === "paid" && (
                  <Pill tone="success">Paid</Pill>
                )}
                {!inFreeTrial && !subView && billing.paymentStatus === "pending" && (
                  <Pill tone="warning">Payment pending</Pill>
                )}
                {!inFreeTrial && needsPay && <Pill tone="danger">Renewal due</Pill>}
                <Pill tone="info">
                  <Lock className="size-2.5 inline mr-1" />
                  PIN protected
                </Pill>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Plan
                  </div>
                  <div className="mt-1 text-sm font-semibold">
                    {inFreeTrial
                      ? "Free trial"
                      : billing.cadence === "monthly"
                        ? "Month"
                        : "Annual"}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {inFreeTrial ? "Trial" : "Amount + GST"}
                  </div>
                  <div className="mt-1 text-sm font-semibold">
                    {inFreeTrial
                      ? subView?.trialDaysRemaining != null
                        ? `${subView.trialDaysRemaining} days left`
                        : "Active"
                      : formatInr(totalInr)}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Students
                  </div>
                  <div className="mt-1 text-sm font-semibold">
                    {billing.studentCount.toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {inFreeTrial ? "Trial ends" : "Next renewal"}
                  </div>
                  <div className="mt-1 text-sm font-semibold">
                    {inFreeTrial && subView?.trialEndAt
                      ? formatDateTime(subView.trialEndAt)
                      : renewal
                        ? formatDateTime(renewal)
                        : "—"}
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground">
                {inFreeTrial
                  ? "60-day free trial · full access · no subscription payment required"
                  : `Plan start · ${formatDateTime(billing.startAt)}`}
                {!inFreeTrial && billing.lastInvoiceId ? ` · Invoice ${billing.lastInvoiceId}` : null}
                {!inFreeTrial && billing.lastPaidAt
                  ? ` · Paid ${formatDateTime(billing.lastPaidAt)}`
                  : null}
              </div>
            </div>
            <div className="lg:col-span-4 flex flex-col justify-center gap-2 rounded-lg border border-border bg-background/60 p-4">
              <p className="text-[11px] text-muted-foreground">
                {inFreeTrial
                  ? "You are on a free trial. Institute setup continues normally. Subscription charges apply only after the trial (and grace) end."
                  : "Subscription checkout lives on the Subscription page — not here."}
              </p>
              {inFreeTrial ? (
                <div className="text-xs font-medium text-success">No payment due during trial</div>
              ) : needsPay ? (
                <Link to="/subscription">
                  <Button variant="primary" data-admin-allow-readonly>
                    <CreditCard className="size-3.5" /> Open Subscription
                  </Button>
                </Link>
              ) : latestInvoice ? (
                <Button onClick={() => openInvoice(latestInvoice)}>
                  <FileText className="size-3.5" /> Open invoice
                </Button>
              ) : (
                <div className="text-xs font-medium text-success">No payment due</div>
              )}
            </div>
          </div>
        </div>
      </Card>

      <ModulesCatalogPanel />

      <Modal
        open={payOpen}
        onClose={closePay}
        title={
          payStep === "invoice"
            ? "Tax invoice"
            : payStep === "pin"
              ? "Confirm with security PIN"
              : payStep === "processing"
                ? "Securing payment"
                : "Secure checkout"
        }
        subtitle={
          payStep === "invoice"
            ? invoice?.invoiceId
            : `${billing.instituteName} · ${billing.cadence}`
        }
        size="lg"
        footer={
          payStep === "review" ? (
            <>
              <Button onClick={closePay}>Cancel</Button>
              <Button
                variant="primary"
                data-admin-write
                disabled={!acceptedTerms}
                onClick={() => guardWriteAction(goToPin)}
              >
                <Lock className="size-3.5" /> Continue to PIN
              </Button>
            </>
          ) : payStep === "pin" ? (
            <>
              <Button onClick={() => setPayStep("review")}>Back</Button>
              <Button
                variant="primary"
                disabled={pin.length !== PIN_LENGTH || pinAttempts >= MAX_PIN_ATTEMPTS}
                onClick={() => guardWriteAction(() => void submitPinPayment())}
              >
                <CreditCard className="size-3.5" /> Authorise {formatInr(totalInr)}
              </Button>
            </>
          ) : payStep === "processing" ? null : (
            <>
              <Button
                onClick={() => {
                  if (invoice) downloadInvoice(invoice);
                }}
              >
                <Download className="size-3.5" /> Download invoice
              </Button>
              <Button variant="primary" onClick={closePay}>
                Done
              </Button>
            </>
          )
        }
      >
        {payStep === "review" ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <ShieldCheck className="size-3.5 text-success" />
              Encrypted checkout · PIN required · invoice only after success
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs space-y-1.5">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Subscription</span>
                <span className="font-medium">{formatInr(billing.amountInr)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">GST (18%)</span>
                <span className="font-medium">{formatInr(gstInr)}</span>
              </div>
              <div className="flex justify-between gap-2 border-t border-border pt-1.5">
                <span className="font-semibold">Total due</span>
                <span className="font-semibold">{formatInr(totalInr)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Billing</span>
                <span className="font-medium capitalize">{billing.cadence}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Students</span>
                <span className="font-medium">
                  {billing.studentCount.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <Field label="Payment method" required>
              <Select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
              >
                <option value="upi">UPI</option>
                <option value="card">Debit / Credit card</option>
                <option value="netbanking">Net banking</option>
              </Select>
            </Field>

            <Field label={`Terms & Conditions (v${BILLING_TERMS_VERSION})`} required>
              <div className="max-h-40 overflow-y-auto rounded-md border border-border bg-background p-3 text-[11px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
                {BILLING_TERMS_TEXT}
              </div>
            </Field>

            <label className="flex items-start gap-2.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-[var(--primary)]"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
              />
              <span>
                I have read and agree to the Terms & Conditions. I am authorised to pay for this
                institute.
              </span>
            </label>
          </div>
        ) : null}

        {payStep === "pin" ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-[11px] text-muted-foreground">
              For your security, confirm this {formatInr(totalInr)} payment with your 6-digit
              Admin security PIN. Never share your PIN.
            </div>
            <PinInput
              label="Security PIN"
              value={pin}
              onChange={(v) => {
                setPin(v);
                setPinError("");
              }}
              error={pinError}
              required
              autoFocus
            />
            <div className="text-[11px] text-muted-foreground">
              Method · {payMethod.toUpperCase()} · Terms v{BILLING_TERMS_VERSION} accepted
            </div>
          </div>
        ) : null}

        {payStep === "processing" ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <div className="size-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            <div className="text-sm font-semibold">Verifying PIN & processing payment</div>
            <div className="text-[11px] text-muted-foreground">
              Do not close this window. Invoice will generate on success.
            </div>
          </div>
        ) : null}

        {payStep === "invoice" && invoice ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="success">Paid</Pill>
              <Pill tone="info">Invoice generated</Pill>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-4 font-mono text-[11px] space-y-1">
              <div className="text-sm font-semibold font-sans tracking-tight mb-2">
                LumenX Tax Invoice
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Invoice</span>
                <span>{invoice.invoiceId}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Payment ref</span>
                <span>{invoice.paymentRef}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Issued</span>
                <span>{formatDateTime(invoice.issuedAt)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Institute</span>
                <span className="text-right">{invoice.instituteName}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Period</span>
                <span className="text-right">
                  {formatDateTime(invoice.periodStart)} → {formatDateTime(invoice.periodEnd)}
                </span>
              </div>
              <div className="border-t border-border my-2" />
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Subscription</span>
                <span>{formatInr(invoice.amountInr)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">GST (18%)</span>
                <span>{formatInr(invoice.gstInr)}</span>
              </div>
              <div className="flex justify-between gap-2 font-semibold">
                <span>Total</span>
                <span>{formatInr(invoice.totalInr)}</span>
              </div>
              <div className="border-t border-border my-2" />
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Method</span>
                <span className="uppercase">{invoice.method}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Terms accepted</span>
                <span>{formatDateTime(invoice.termsAcceptedAt)}</span>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </AppShell>
  );
}

function ModulesPage() {
  if (isApiAuthMode()) {
    return (
      <AppShell
        title={adminPageTitle("/modules")}
        subtitle="Enable or disable modules for this Admin app"
      >
        <ModuleHero
          compact
          eyebrow="Operations"
          title={adminPageTitle("/modules")}
          subtitle="Enable or disable modules for this Admin app"
        />
        <div className="space-y-4">
          <ModulesApiSubscriptionPanel />
          <ModulesCatalogPanel />
        </div>
      </AppShell>
    );
  }
  return <ModulesDemoPage />;
}
