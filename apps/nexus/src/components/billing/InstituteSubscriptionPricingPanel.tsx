/**
 * Nexus subscription pricing assignment (per institute).
 * SoT: @lumenx/utils subscription quote + assigned rate.
 * Admin cannot edit the rate — Nexus only.
 * No Core / Plus / Max. No payment integration.
 */

import {
  Button,
  Card,
  CardHeader,
  Field,
  FormGrid,
  Pill,
  TextInput,
} from "@lumenx/ui-admin";
import { IndianRupee, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PER_STUDENT_RATE_INR,
  EXTENDED_PER_STUDENT_RATE_MAX_INR,
  MIN_MONTHLY_CHARGE_INR,
  NORMAL_PER_STUDENT_RATE_MAX_INR,
  NORMAL_PER_STUDENT_RATE_MIN_INR,
  getInstituteSubscription,
  isExtendedPerStudentRate,
  labelSubscriptionLifecycle,
  quoteAllDurations,
  setInstituteActiveStudentCount,
  setInstituteAssignedRate,
  startInstituteTrial,
  subscribeSubscriptions,
  type InstituteSubscription,
  type SubscriptionQuote,
} from "@lumenx/utils";
import { getPlatformInstitute } from "@/lib/institute-directory-store";

function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

function DetailCell({
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
    <div className="rounded-md border border-border bg-background/40 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        {label}
      </div>
      <div className={`mt-1 text-xs font-medium ${mono ? "font-mono" : ""}`}>{value || "—"}</div>
      {hint ? <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

/** Ensure subscription row exists for this institute (idempotent). */
function ensureSubscriptionForInstitute(
  instituteId: string,
): InstituteSubscription | null {
  const inst = getPlatformInstitute(instituteId);
  if (!inst) return null;

  const students = Math.max(0, Math.round(inst.studentCount ?? 0));
  const existing = getInstituteSubscription(instituteId);
  if (existing) return existing;

  return startInstituteTrial({
    instituteId,
    instituteName: inst.name,
    assignedRateInr: DEFAULT_PER_STUDENT_RATE_INR,
    activeStudentCount: students,
  });
}

function MonthlyPriceSummary({ quote }: { quote: SubscriptionQuote }) {
  if (quote.showAsBaseSubscription) {
    return (
      <div className="rounded-lg border border-border bg-muted/15 px-4 py-3 space-y-1">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
          Monthly price
        </div>
        <div className="text-sm font-semibold">Base subscription</div>
        <div className="text-lg font-semibold font-mono tabular-nums">
          {formatInr(quote.monthlyPriceInr)} / month
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Minimum monthly charge {formatInr(quote.minMonthlyChargeInr)} applies. Student headcount
          charge is below the floor, so the base subscription rate is used.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/15 px-4 py-3 space-y-1">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        Monthly price
      </div>
      <div className="text-sm font-medium">
        {quote.activeStudentCount.toLocaleString("en-IN")} active students
      </div>
      <div className="text-sm font-medium font-mono">
        {formatInr(quote.assignedRateInr)} / student
      </div>
      <div className="text-lg font-semibold font-mono tabular-nums">
        {formatInr(quote.monthlyPriceInr)} / month
      </div>
    </div>
  );
}

export function InstituteSubscriptionPricingPanel({
  instituteId,
}: {
  instituteId: string;
}) {
  const [tick, setTick] = useState(0);
  const [rateDraft, setRateDraft] = useState(String(DEFAULT_PER_STUDENT_RATE_INR));
  const [allowExtended, setAllowExtended] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeSubscriptions(() => setTick((t) => t + 1));
  }, [instituteId]);

  useEffect(() => {
    ensureSubscriptionForInstitute(instituteId);
    setTick((t) => t + 1);
  }, [instituteId]);

  void tick;
  const sub = getInstituteSubscription(instituteId);

  useEffect(() => {
    if (!sub) return;
    setRateDraft(String(sub.assignedRateInr));
    setAllowExtended(isExtendedPerStudentRate(sub.assignedRateInr));
  }, [sub?.instituteId, sub?.assignedRateInr]);

  // Keep directory student count mirrored into subscription quotes.
  useEffect(() => {
    const inst = getPlatformInstitute(instituteId);
    if (!inst || !sub) return;
    const students = Math.max(0, Math.round(inst.studentCount ?? 0));
    if (sub.activeStudentCount !== students) {
      setInstituteActiveStudentCount(instituteId, students);
    }
  }, [instituteId, sub?.activeStudentCount, tick]);

  const quotes = useMemo(() => {
    if (!sub) return [] as SubscriptionQuote[];
    return quoteAllDurations({
      activeStudentCount: sub.activeStudentCount,
      assignedRateInr: sub.assignedRateInr,
    });
  }, [sub]);

  const monthlyQuote = quotes.find((q) => q.durationMonths === 1) ?? null;

  const onSaveRate = () => {
    setError(null);
    if (!sub) {
      setError("Subscription not found for this institute.");
      return;
    }
    const parsed = Number(rateDraft);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter a valid per-student rate.");
      return;
    }
    const rounded = Math.round(parsed);
    if (rounded < NORMAL_PER_STUDENT_RATE_MIN_INR) {
      setError(`Per-student rate must be at least ₹${NORMAL_PER_STUDENT_RATE_MIN_INR}.`);
      return;
    }
    const maxAllowed = allowExtended
      ? EXTENDED_PER_STUDENT_RATE_MAX_INR
      : NORMAL_PER_STUDENT_RATE_MAX_INR;
    if (rounded > maxAllowed) {
      setError(
        allowExtended
          ? `Rate cannot exceed ₹${EXTENDED_PER_STUDENT_RATE_MAX_INR}.`
          : `Normal range is ₹${NORMAL_PER_STUDENT_RATE_MIN_INR}–₹${NORMAL_PER_STUDENT_RATE_MAX_INR}. Enable “Extend maximum” to go above ₹${NORMAL_PER_STUDENT_RATE_MAX_INR}.`,
      );
      return;
    }

    const next = setInstituteAssignedRate(instituteId, rounded);
    if (!next) {
      setError("Could not save rate.");
      return;
    }
    setFlash(`Assigned rate saved · ${formatInr(next.assignedRateInr)} / student`);
    window.setTimeout(() => setFlash(null), 2800);
    setTick((t) => t + 1);
  };

  if (!sub || !monthlyQuote) {
    return (
      <Card className="mb-4">
        <CardHeader title="Subscription pricing" hint="Per-student rate · ₹8,000 monthly floor" />
        <div className="px-5 pb-5 text-sm text-muted-foreground">
          Institute not found in directory.
        </div>
      </Card>
    );
  }

  const extended = isExtendedPerStudentRate(sub.assignedRateInr);

  return (
    <Card className="mb-4">
      <CardHeader
        title="Subscription pricing"
        hint="Nexus assigns per-student rate · Admin cannot edit · no plan tiers"
        action={
          <Pill tone={extended ? "warning" : "info"}>
            {labelSubscriptionLifecycle(sub.lifecycleStatus)}
          </Pill>
        }
      />
      <div className="px-5 pb-5 space-y-4">
        {flash ? (
          <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
            {flash}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <DetailCell
            label="Active students"
            value={sub.activeStudentCount.toLocaleString("en-IN")}
            mono
            hint="From institute directory"
          />
          <DetailCell
            label="Assigned rate"
            value={`${formatInr(sub.assignedRateInr)} / student`}
            mono
            hint={
              extended
                ? `Extended above ₹${NORMAL_PER_STUDENT_RATE_MAX_INR}`
                : `Normal ₹${NORMAL_PER_STUDENT_RATE_MIN_INR}–₹${NORMAL_PER_STUDENT_RATE_MAX_INR}`
            }
          />
          <DetailCell
            label="Minimum monthly"
            value={formatInr(MIN_MONTHLY_CHARGE_INR)}
            mono
            hint="Floor on every quote"
          />
          <DetailCell
            label="Calculated monthly"
            value={formatInr(monthlyQuote.monthlyPriceInr)}
            mono
            hint="MAX(8,000, students × rate)"
          />
          <DetailCell
            label="Default rate"
            value={formatInr(DEFAULT_PER_STUDENT_RATE_INR)}
            mono
            hint="Suggested starting point"
          />
        </div>

        <MonthlyPriceSummary quote={monthlyQuote} />

        <div className="rounded-lg border border-border p-4 space-y-3">
          <div className="text-xs font-semibold">Assign per-student rate</div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Default {formatInr(DEFAULT_PER_STUDENT_RATE_INR)}. Normal band{" "}
            {formatInr(NORMAL_PER_STUDENT_RATE_MIN_INR)}–{formatInr(NORMAL_PER_STUDENT_RATE_MAX_INR)}.
            Extend the maximum only when commercially necessary. Admin apps cannot change this
            rate.
          </p>
          <FormGrid>
            <Field
              label="Per-student rate (₹)"
              hint={
                allowExtended
                  ? `Up to ₹${EXTENDED_PER_STUDENT_RATE_MAX_INR.toLocaleString("en-IN")}`
                  : `₹${NORMAL_PER_STUDENT_RATE_MIN_INR}–₹${NORMAL_PER_STUDENT_RATE_MAX_INR}`
              }
            >
              <TextInput
                type="number"
                min={NORMAL_PER_STUDENT_RATE_MIN_INR}
                max={
                  allowExtended
                    ? EXTENDED_PER_STUDENT_RATE_MAX_INR
                    : NORMAL_PER_STUDENT_RATE_MAX_INR
                }
                step={1}
                value={rateDraft}
                onChange={(e) => setRateDraft(e.target.value)}
              />
            </Field>
            <Field label=" " hint=" ">
              <label className="flex items-start gap-2 text-xs pt-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={allowExtended}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setAllowExtended(on);
                    if (!on) {
                      const n = Number(rateDraft);
                      if (Number.isFinite(n) && n > NORMAL_PER_STUDENT_RATE_MAX_INR) {
                        setRateDraft(String(NORMAL_PER_STUDENT_RATE_MAX_INR));
                      }
                    }
                  }}
                />
                <span>
                  Extend maximum above ₹{NORMAL_PER_STUDENT_RATE_MAX_INR}
                  <span className="block text-[10px] text-muted-foreground mt-0.5">
                    Use only when a higher rate is required for this institute
                  </span>
                </span>
              </label>
            </Field>
          </FormGrid>
          <Button size="sm" variant="primary" onClick={onSaveRate}>
            <Save className="size-3.5" />
            <IndianRupee className="size-3.5" />
            Save assigned rate
          </Button>
        </div>

        <div>
          <div className="text-xs font-semibold mb-2">Available durations · expected payable</div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                  <th className="px-3 py-2 font-medium">Duration</th>
                  <th className="px-3 py-2 font-medium">Monthly</th>
                  <th className="px-3 py-2 font-medium">Free months</th>
                  <th className="px-3 py-2 font-medium">Billable</th>
                  <th className="px-3 py-2 font-medium text-right">Expected payable</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => (
                  <tr key={q.durationMonths} className="border-b border-border last:border-0">
                    <td className="px-3 py-2.5 font-medium">{q.durationLabel}</td>
                    <td className="px-3 py-2.5 font-mono tabular-nums">
                      {formatInr(q.monthlyPriceInr)}
                    </td>
                    <td className="px-3 py-2.5 font-mono tabular-nums">{q.freeMonths}</td>
                    <td className="px-3 py-2.5 font-mono tabular-nums">
                      {q.billableMonths} mo
                    </td>
                    <td className="px-3 py-2.5 font-mono tabular-nums text-right font-semibold">
                      {formatInr(q.payableAmountInr)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Payable = monthly price × (duration − free months). Pricing preview only — payment is
            not collected here.
          </p>
        </div>
      </div>
    </Card>
  );
}
