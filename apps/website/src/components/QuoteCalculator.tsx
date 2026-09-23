import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  DEFAULT_PER_STUDENT_RATE_INR,
  EXTENDED_PER_STUDENT_RATE_MAX_INR,
  MIN_MONTHLY_CHARGE_INR,
  NORMAL_PER_STUDENT_RATE_MAX_INR,
  NORMAL_PER_STUDENT_RATE_MIN_INR,
  type SubscriptionDurationMonths,
} from "@lumenx/utils/subscription/policy";
import { calculateSubscriptionQuote, quoteAllDurations } from "@lumenx/utils/subscription/pricing";
import { formatCount, formatInr } from "@/lib/format";
import { contactSearch } from "@/lib/search";
import { SiteCard } from "./SiteCard";
import { CTAButton } from "./conversion/CTAButton";
import { cn } from "@lumenx/ui";

const TENURES: {
  months: SubscriptionDurationMonths;
  label: string;
  hint: string;
}[] = [
  { months: 1, label: "Monthly", hint: "Pay each month" },
  { months: 6, label: "6 months", hint: "Pay twice a year" },
  { months: 12, label: "Yearly", hint: "2 months free" },
];

const RATE_PRESETS = [
  NORMAL_PER_STUDENT_RATE_MIN_INR,
  13,
  14,
  NORMAL_PER_STUDENT_RATE_MAX_INR,
] as const;

function parsePositiveInt(raw: string, max: number): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < 1 || rounded > max) return null;
  return rounded;
}

export function QuoteCalculator({
  students: studentsProp,
  onStudentsChange,
  ratePerHead: rateProp,
  onRatePerHeadChange,
  initialStudents = 400,
}: {
  students?: number;
  onStudentsChange?: (count: number) => void;
  ratePerHead?: number;
  onRatePerHeadChange?: (rate: number) => void;
  initialStudents?: number;
}) {
  const [studentsDraft, setStudentsDraft] = useState(
    String(studentsProp && studentsProp > 0 ? studentsProp : initialStudents),
  );
  const [rateDraft, setRateDraft] = useState(String(rateProp ?? DEFAULT_PER_STUDENT_RATE_INR));
  const [tenure, setTenure] = useState<SubscriptionDurationMonths>(12);

  const students = parsePositiveInt(studentsDraft, 50000);
  const rate = parsePositiveInt(rateDraft, EXTENDED_PER_STUDENT_RATE_MAX_INR);
  const ready = students !== null && rate !== null;

  const quote = useMemo(() => {
    if (!ready || students === null || rate === null) return null;
    return calculateSubscriptionQuote({
      activeStudentCount: students,
      assignedRateInr: rate,
      durationMonths: tenure,
    });
  }, [ready, students, rate, tenure]);

  const allQuotes = useMemo(() => {
    if (!ready || students === null || rate === null) return null;
    return quoteAllDurations({
      activeStudentCount: students,
      assignedRateInr: rate,
    });
  }, [ready, students, rate]);

  const rawMonthly = ready && students !== null && rate !== null ? students * rate : null;
  const usingMinimum = quote?.showAsBaseSubscription ?? false;
  const periodTotal = quote?.payableAmountInr ?? null;
  const showPeriodQuote = tenure > 1;

  function commitStudents(raw: string) {
    setStudentsDraft(raw);
    const parsed = parsePositiveInt(raw, 50000);
    if (parsed !== null) onStudentsChange?.(parsed);
  }

  function commitRate(raw: string) {
    setRateDraft(raw);
    const parsed = parsePositiveInt(raw, EXTENDED_PER_STUDENT_RATE_MAX_INR);
    if (parsed !== null) onRatePerHeadChange?.(parsed);
  }

  return (
    <SiteCard className="mx-auto max-w-xl border-[var(--border-brand)]">
      <p className="text-sm font-semibold tracking-tight">Estimate your campus price</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Per-student rate is set for your institute. Try a rate below — one bill only: higher of
        (students × rate) or {formatInr(MIN_MONTHLY_CHARGE_INR)}.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium" htmlFor="student-count">
            Number of students
          </label>
          <input
            id="student-count"
            type="number"
            min={1}
            max={50000}
            inputMode="numeric"
            value={studentsDraft}
            placeholder="e.g. 400"
            onChange={(e) => commitStudents(e.target.value)}
            className="site-input mt-2 font-mono text-lg tabular-nums"
          />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="rate-per-student">
            Rate per student (₹)
          </label>
          <div className="site-input-group mt-2">
            <span className="site-input-group__prefix" aria-hidden="true">
              ₹
            </span>
            <input
              id="rate-per-student"
              type="number"
              min={1}
              max={EXTENDED_PER_STUDENT_RATE_MAX_INR}
              inputMode="numeric"
              value={rateDraft}
              placeholder="e.g. 12"
              onChange={(e) => commitRate(e.target.value)}
              className="site-input-group__field font-mono text-lg tabular-nums"
              aria-describedby="rate-hint"
            />
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Common rates">
        {RATE_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-pressed={rate === preset}
            onClick={() => commitRate(String(preset))}
            className={cn(
              "rounded-lg border px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors",
              rate === preset
                ? "border-[var(--border-brand)] bg-[color-mix(in_oklch,var(--site-brand-soft)_55%,var(--card))]"
                : "border-[var(--border)] text-muted-foreground hover:border-[var(--border-strong)]",
            )}
          >
            {formatInr(preset)}
          </button>
        ))}
      </div>
      <p id="rate-hint" className="mt-2 text-xs text-muted-foreground">
        Typical band {formatInr(NORMAL_PER_STUDENT_RATE_MIN_INR)}–
        {formatInr(NORMAL_PER_STUDENT_RATE_MAX_INR)}. Your confirmed rate is set for your campus.
      </p>

      <fieldset className="mt-6">
        <legend className="text-sm font-medium">How do you want to pay?</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {TENURES.map((opt) => {
            const active = tenure === opt.months;
            const optionQuote = allQuotes?.find((q) => q.durationMonths === opt.months);
            return (
              <button
                key={opt.months}
                type="button"
                aria-pressed={active}
                onClick={() => setTenure(opt.months)}
                className={cn(
                  "rounded-xl border px-3 py-3 text-left transition-colors",
                  active
                    ? "border-[var(--border-brand)] bg-[color-mix(in_oklch,var(--site-brand-soft)_55%,var(--card))]"
                    : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-strong)]",
                )}
              >
                <span className="block text-sm font-semibold">{opt.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{opt.hint}</span>
                {optionQuote ? (
                  <span className="mt-2 block font-mono text-sm font-semibold tabular-nums text-foreground">
                    {formatInr(optionQuote.payableAmountInr)}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      {opt.months === 1 ? "/mo" : " total"}
                    </span>
                  </span>
                ) : (
                  <span className="mt-2 block font-mono text-sm text-muted-foreground">—</span>
                )}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-6 rounded-2xl bg-[var(--muted)] px-5 py-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {showPeriodQuote
            ? tenure === 12
              ? "Yearly quote"
              : "6-month quote"
            : "Monthly quote"}
        </p>
        {quote && students !== null && rate !== null && rawMonthly !== null && periodTotal !== null ? (
          <>
            <p className="mt-2 font-mono text-4xl font-semibold tabular-nums tracking-tight">
              {formatInr(showPeriodQuote ? periodTotal : quote.monthlyPriceInr)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {showPeriodQuote
                ? tenure === 12
                  ? "total for 12 months (2 months free)"
                  : "total for 6 months"
                : "per month"}
            </p>
            {showPeriodQuote ? (
              <p className="mt-3 font-mono text-lg font-semibold tabular-nums text-foreground">
                {formatInr(quote.monthlyPriceInr)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">/ month</span>
              </p>
            ) : null}
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {usingMinimum ? (
                <>
                  {formatCount(students)} × {formatInr(rate)} = {formatInr(rawMonthly)}, so the{" "}
                  <span className="font-medium text-foreground">
                    {formatInr(MIN_MONTHLY_CHARGE_INR)} campus minimum
                  </span>{" "}
                  applies each month.
                </>
              ) : (
                <>
                  {formatCount(students)} students × {formatInr(rate)} ={" "}
                  <span className="font-medium text-foreground">
                    {formatInr(quote.monthlyPriceInr)}/month
                  </span>
                </>
              )}
              {showPeriodQuote && quote.freeMonths > 0
                ? ` · pay for ${quote.billableMonths} months, ${quote.freeMonths} free.`
                : showPeriodQuote
                  ? ` · ${tenure} × ${formatInr(quote.monthlyPriceInr)}.`
                  : null}
            </p>
          </>
        ) : (
          <>
            <p className="mt-2 font-mono text-4xl font-semibold tabular-nums tracking-tight text-muted-foreground">
              —
            </p>
            <p className="mt-1 text-sm text-muted-foreground">quote</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Enter students and rate to see an estimate.
            </p>
          </>
        )}
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <CTAButton asChild>
          <Link
            to="/contact"
            search={contactSearch("quote", students ?? undefined)}
          >
            Request this quote
          </Link>
        </CTAButton>
        <CTAButton asChild variant="secondary">
          <Link to="/contact" search={contactSearch("trial")}>
            Start free trial
          </Link>
        </CTAButton>
      </div>
    </SiteCard>
  );
}
