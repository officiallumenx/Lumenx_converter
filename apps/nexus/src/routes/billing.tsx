import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Button,
  Card,
  CardHeader,
  DataTable,
  Field,
  FormGrid,
  Kpi,
  Pill,
  TextInput,
  Th,
  Td,
  Tr,
} from "@lumenx/ui-admin";
import { CreditCard, IndianRupee, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NexusOfflinePaymentsInbox } from "@/components/billing/NexusOfflinePaymentsInbox";
import {
  listPlatformInstitutes,
  subscribeInstituteDirectory,
} from "@/lib/institute-directory-store";
import {
  calculatePlanBill,
  formatBillingMoney,
  getBillingConfig,
  getInstituteBillingView,
  labelBillingPlanSummary,
  labelPlanTenure,
  labelRateQuotePeriod,
  maxFreeMonthsForPlan,
  subscribeInstituteBilling,
  updateBillingPlan,
  validateBillingInputs,
  type DiscountKind,
  type PlanTenureMonths,
  type RateQuotePeriod,
} from "@/lib/institute-billing-store";
import { subscribeSubscriptions } from "@lumenx/utils";

export const Route = createFileRoute("/billing")({
  head: () => ({ meta: [{ title: "Billing & Renewals — LumenX Nexus" }] }),
  component: BillingPage,
});

type PortfolioRow = {
  instituteId: string;
  instituteName: string;
  city: string;
  studentCount: number;
  planLabel: string;
  quoteLabel: string;
  tenureLabel: string;
  estimateInr: number;
  discountAmountInr: number;
  payableInr: number;
  outstandingInr: number;
  discountLabel: string;
};

function BillingPage() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const a = subscribeInstituteBilling(() => setTick((t) => t + 1));
    const b = subscribeInstituteDirectory(() => setTick((t) => t + 1));
    const c = subscribeSubscriptions(() => setTick((t) => t + 1));
    return () => {
      a();
      b();
      c();
    };
  }, []);

  const rows = useMemo((): PortfolioRow[] => {
    void tick;
    return listPlatformInstitutes()
      .filter((i) => i.status !== "archived")
      .map((i) => {
        const view = getInstituteBillingView(i.id);
        const cfg = view.config;
        const calc = view.calc;
        return {
          instituteId: i.id,
          instituteName: i.name,
          city: i.city,
          studentCount: i.studentCount,
          planLabel: labelBillingPlanSummary(cfg),
          quoteLabel: `${formatBillingMoney(cfg.quotedRateInr)} / ${labelRateQuotePeriod(cfg.rateQuotePeriod).toLowerCase()}`,
          tenureLabel: labelPlanTenure(cfg.planTenureMonths),
          estimateInr: calc.estimateInr,
          discountAmountInr: calc.discountAmountInr,
          payableInr: calc.finalAmountInr,
          outstandingInr: view.outstandingAmountInr,
          discountLabel:
            calc.discountKind === "percent"
              ? `${calc.discountPercent}%`
              : calc.discountKind === "free_months"
                ? `${calc.freeMonths} free mo`
                : "None",
        };
      });
  }, [tick]);

  const stats = useMemo(() => {
    const billed = rows.reduce((s, r) => s + r.payableInr, 0);
    const outstanding = rows.reduce((s, r) => s + r.outstandingInr, 0);
    return {
      institutes: rows.length,
      billed,
      outstanding,
      withDiscount: rows.filter((r) => r.discountLabel !== "None").length,
    };
  }, [rows]);

  const [selectedId, setSelectedId] = useState<string | null>(rows[0]?.instituteId ?? null);
  const selected = rows.find((r) => r.instituteId === selectedId) ?? rows[0] ?? null;

  useEffect(() => {
    if (selected && !rows.some((r) => r.instituteId === selected.instituteId)) {
      setSelectedId(rows[0]?.instituteId ?? null);
    }
  }, [rows, selected]);

  return (
    <AppShell
      title="Billing & Renewals"
      subtitle="Offline payment verification · per-student quotes · renewals"
    >
      <NexusOfflinePaymentsInbox />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Kpi label="Institutes" value={String(stats.institutes)} icon={<CreditCard className="size-3.5" />} />
        <Kpi label="Plan payable (all)" value={formatBillingMoney(stats.billed)} />
        <Kpi
          label="Outstanding invoices"
          value={formatBillingMoney(stats.outstanding)}
          tone={stats.outstanding ? "down" : "up"}
        />
        <Kpi label="With discount" value={String(stats.withDiscount)} />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 xl:col-span-7 overflow-hidden">
          <CardHeader
            title="Institute billing"
            hint="Rate × plan months × students · pick one discount"
          />
          <div className="overflow-x-auto">
            <DataTable>
              <thead>
                <tr className="border-b border-border bg-background/40">
                  <Th>Institute</Th>
                  <Th>Rate quote</Th>
                  <Th>Plan</Th>
                  <Th>Students</Th>
                  <Th>Total</Th>
                  <Th>Discount</Th>
                  <Th>Payable</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const active = selected?.instituteId === r.instituteId;
                  return (
                    <Tr key={r.instituteId} className={active ? "bg-primary/5" : ""}>
                      <Td>
                        <button
                          type="button"
                          className="text-left w-full"
                          onClick={() => setSelectedId(r.instituteId)}
                        >
                          <div className="text-xs font-medium">{r.instituteName}</div>
                          <div className="text-[10px] text-muted-foreground">{r.city}</div>
                        </button>
                      </Td>
                      <Td mono>{r.quoteLabel}</Td>
                      <Td>{r.tenureLabel}</Td>
                      <Td mono>{r.studentCount.toLocaleString("en-IN")}</Td>
                      <Td mono>{formatBillingMoney(r.estimateInr)}</Td>
                      <Td mono>
                        {r.discountAmountInr > 0
                          ? `− ${formatBillingMoney(r.discountAmountInr)}`
                          : formatBillingMoney(0)}
                        <div className="text-[10px] text-muted-foreground font-sans">{r.discountLabel}</div>
                      </Td>
                      <Td mono>{formatBillingMoney(r.payableInr)}</Td>
                    </Tr>
                  );
                })}
              </tbody>
            </DataTable>
          </div>
          {rows.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              No institutes yet.
            </div>
          )}
        </Card>

        <div className="col-span-12 xl:col-span-5 space-y-4">
          {selected ? (
            <BillingPlanEditor
              instituteId={selected.instituteId}
              instituteName={selected.instituteName}
              city={selected.city}
              studentCount={selected.studentCount}
              onChanged={() => setTick((t) => t + 1)}
            />
          ) : (
            <Card className="p-8 text-sm text-muted-foreground text-center">Select an institute</Card>
          )}
        </div>
      </div>

      <p className="mt-6 text-[11px] text-muted-foreground font-mono">
        Example: ₹12 / month × 100 students × 6 months = ₹7,200 estimate. Apply either % off or free
        months (not both). Full invoices live on each institute detail page.
      </p>
    </AppShell>
  );
}

function BillingPlanEditor({
  instituteId,
  instituteName,
  city,
  studentCount,
  onChanged,
}: {
  instituteId: string;
  instituteName: string;
  city: string;
  studentCount: number;
  onChanged: () => void;
}) {
  const cfg = getBillingConfig(instituteId);
  const [quotedRate, setQuotedRate] = useState(String(cfg.quotedRateInr));
  const [quotePeriod, setQuotePeriod] = useState<RateQuotePeriod>(cfg.rateQuotePeriod);
  const [planMonths, setPlanMonths] = useState<PlanTenureMonths>(cfg.planTenureMonths);
  const [discountKind, setDiscountKind] = useState<DiscountKind>(cfg.discountKind);
  const [discountPercent, setDiscountPercent] = useState(String(cfg.discountPercent));
  const [freeMonths, setFreeMonths] = useState(String(cfg.freeMonths));
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const next = getBillingConfig(instituteId);
    setQuotedRate(String(next.quotedRateInr));
    setQuotePeriod(next.rateQuotePeriod);
    setPlanMonths(next.planTenureMonths);
    setDiscountKind(next.discountKind);
    setDiscountPercent(String(next.discountPercent));
    setFreeMonths(String(next.freeMonths));
    setFlash(null);
    setError(null);
  }, [instituteId]);

  const maxFree = maxFreeMonthsForPlan(planMonths);
  const preview = calculatePlanBill({
    activeStudentCount: studentCount,
    quotedRateInr: Number(quotedRate) || 0,
    rateQuotePeriod: quotePeriod,
    planTenureMonths: planMonths,
    discountKind,
    discountPercent: Number(discountPercent) || 0,
    freeMonths: Number(freeMonths) || 0,
  });

  const save = () => {
    const validation = validateBillingInputs({
      activeStudentCount: studentCount,
      quotedRateInr: quotedRate,
      rateQuotePeriod: quotePeriod,
      planTenureMonths: planMonths,
      discountKind,
      discountPercent,
      freeMonths,
    });
    if (!validation.ok) {
      setError(validation.issues[0]?.message ?? "Invalid values");
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
      setError("Could not save plan");
      return;
    }
    setError(null);
    setFlash("Plan saved · invoices already issued stay frozen");
    onChanged();
  };

  return (
    <Card>
      <CardHeader
        title={instituteName}
        hint={`${city} · ${studentCount.toLocaleString("en-IN")} students`}
        action={
          <Link to="/institutes/$id" params={{ id: instituteId }}>
            <Button size="sm" variant="outline">
              Open institute
            </Button>
          </Link>
        }
      />
      <div className="px-5 pb-5 space-y-3">
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

        <Field label="Per student rate (₹)" required>
          <TextInput
            type="number"
            min={1}
            step={1}
            leadingIcon={<IndianRupee />}
            value={quotedRate}
            onChange={(e) => setQuotedRate(e.target.value)}
          />
        </Field>

        <Field label="Rate quoted as" required>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: "monthly" as const, label: "Monthly" },
                { id: "yearly" as const, label: "Yearly" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`rounded-md border px-3 py-2 text-xs font-semibold ${
                  quotePeriod === opt.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:bg-surface-hover"
                }`}
                onClick={() => setQuotePeriod(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Plan length" required>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 1 as const, label: "1 mo" },
                { id: 6 as const, label: "6 mo" },
                { id: 12 as const, label: "1 yr" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`rounded-md border px-2 py-2 text-xs font-semibold ${
                  planMonths === opt.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:bg-surface-hover"
                }`}
                onClick={() => {
                  setPlanMonths(opt.id);
                  if (opt.id === 1 && discountKind === "free_months") {
                    setDiscountKind("none");
                    setFreeMonths("0");
                  }
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Discount (one only)" required>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: "none" as const, label: "None" },
                { id: "percent" as const, label: "% off" },
                { id: "free_months" as const, label: "Free mo" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={opt.id === "free_months" && maxFree === 0}
                className={`rounded-md border px-2 py-2 text-xs font-semibold disabled:opacity-40 ${
                  discountKind === opt.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:bg-surface-hover"
                }`}
                onClick={() => setDiscountKind(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>

        {discountKind === "percent" ? (
          <Field label="Percent off" hint="e.g. 12 = 12% less">
            <TextInput
              type="number"
              min={0}
              max={100}
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
            />
          </Field>
        ) : null}

        {discountKind === "free_months" ? (
          <Field label="Free months" hint={`Max ${maxFree} for ${labelPlanTenure(planMonths)}`}>
            <TextInput
              type="number"
              min={0}
              max={maxFree}
              value={freeMonths}
              onChange={(e) => setFreeMonths(e.target.value)}
            />
          </Field>
        ) : null}

        <div className="rounded-md border border-border bg-muted/20 px-3 py-2.5 text-[11px] space-y-2">
          <div className="font-mono space-y-1">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Total amount</span>
              <span>{formatBillingMoney(preview.estimateInr)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Discount amount</span>
              <span className="text-success">
                {preview.discountAmountInr > 0
                  ? `− ${formatBillingMoney(preview.discountAmountInr)}`
                  : formatBillingMoney(0)}
              </span>
            </div>
            <div className="flex justify-between gap-3 border-t border-border/60 pt-1.5 font-semibold text-foreground">
              <span>Payable amount</span>
              <span>{formatBillingMoney(preview.finalAmountInr)}</span>
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground font-mono">
            {formatBillingMoney(preview.monthlyRateInr)} × {planMonths} mo ×{" "}
            {studentCount.toLocaleString("en-IN")}
            {quotePeriod === "yearly" ? " · yearly÷12" : ""}
            {preview.discountKind === "percent"
              ? ` · ${preview.discountPercent}% off`
              : preview.discountKind === "free_months"
                ? ` · ${preview.freeMonths} free mo`
                : ""}
          </div>
        </div>

        <Button variant="primary" onClick={save}>
          <Save className="size-3.5" /> Save plan
        </Button>
      </div>
    </Card>
  );
}
