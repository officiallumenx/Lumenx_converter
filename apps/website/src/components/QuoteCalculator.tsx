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
import {
  calculateSubscriptionQuote,
  normalizeAssignedRate,
  quoteAllDurations,
} from "@lumenx/utils/subscription/pricing";
import { formatCount, formatInr } from "@/lib/format";
import { contactSearch } from "@/lib/search";
import { PricingCard } from "./content/PricingCard";
import { SiteCard } from "./SiteCard";
import { Grid } from "./layout/Grid";
import { CTAButton } from "./conversion/CTAButton";

const TENURE_OPTIONS: {
  months: SubscriptionDurationMonths;
  label: string;
  hint: string;
}[] = [
  { months: 1, label: "Monthly", hint: "Pay as you go" },
  { months: 6, label: "6 months", hint: "No free months" },
  { months: 12, label: "Yearly", hint: "2 months free" },
];

function clampStudents(n: number): number {
  return Math.min(50000, Math.max(1, Math.round(n)));
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
  const [internalStudents, setInternalStudents] = useState(initialStudents);
  const [internalRate, setInternalRate] = useState(DEFAULT_PER_STUDENT_RATE_INR);
  const [tenure, setTenure] = useState<SubscriptionDurationMonths>(12);

  const students = studentsProp ?? internalStudents;
  const setStudents = onStudentsChange ?? setInternalStudents;
  const ratePerHead = rateProp ?? internalRate;
  const setRatePerHead = onRatePerHeadChange ?? setInternalRate;

  const quote = useMemo(
    () =>
      calculateSubscriptionQuote({
        activeStudentCount: students,
        assignedRateInr: ratePerHead,
        durationMonths: tenure,
      }),
    [students, ratePerHead, tenure],
  );

  const quotes = useMemo(
    () =>
      quoteAllDurations({
        activeStudentCount: students,
        assignedRateInr: ratePerHead,
      }),
    [students, ratePerHead],
  );

  return (
    <div>
      <SiteCard quiet className="max-w-2xl">
        <p className="text-sm font-semibold tracking-tight">Your institute estimate</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
              value={students}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isFinite(n)) return;
                setStudents(clampStudents(n));
              }}
              className="site-input mt-2 font-mono tabular-nums"
            />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="cost-per-head">
              Cost per head
            </label>
            <div className="site-input-group mt-2">
              <span className="site-input-group__prefix" aria-hidden="true">
                ₹
              </span>
              <input
                id="cost-per-head"
                type="number"
                min={1}
                max={EXTENDED_PER_STUDENT_RATE_MAX_INR}
                inputMode="numeric"
                aria-describedby="quote-rate-hint"
                value={ratePerHead}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isFinite(n)) return;
                  setRatePerHead(normalizeAssignedRate(n));
                }}
                className="site-input-group__field font-mono tabular-nums"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="tenure">
              Tenure
            </label>
            <select
              id="tenure"
              value={tenure}
              onChange={(e) => setTenure(Number(e.target.value) as SubscriptionDurationMonths)}
              className="site-input mt-2"
            >
              {TENURE_OPTIONS.map((opt) => (
                <option key={opt.months} value={opt.months}>
                  {opt.label} — {opt.hint}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="total-cost">
              Total cost
            </label>
            <input
              id="total-cost"
              type="text"
              readOnly
              value={formatInr(quote.payableAmountInr)}
              className="site-input mt-2 font-mono tabular-nums"
              aria-describedby="total-cost-hint"
            />
          </div>
        </div>
        <p id="quote-rate-hint" className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Many institutes land around {formatInr(NORMAL_PER_STUDENT_RATE_MIN_INR)}–
          {formatInr(NORMAL_PER_STUDENT_RATE_MAX_INR)} per student — enter any rate you were quoted.
          Monthly campus price starts from {formatInr(MIN_MONTHLY_CHARGE_INR)}. Total is for the selected
          tenure
          {quote.freeMonths > 0
            ? ` (${quote.freeMonths} months free · ${quote.billableMonths} paid).`
            : "."}
        </p>
        <p id="total-cost-hint" className="mt-2 text-sm text-muted-foreground">
          Campus monthly price:{" "}
          <span className="font-medium text-foreground">{formatInr(quote.monthlyPriceInr)}/month</span>
          {quote.showAsBaseSubscription
            ? ` (campus minimum at ${formatCount(students)} students).`
            : ` (${formatCount(students)} × ${formatInr(ratePerHead)}).`}
        </p>
        <CTAButton asChild className="mt-5">
          <Link to="/contact" search={contactSearch("quote", students)}>
            Request this quote
          </Link>
        </CTAButton>
      </SiteCard>

      <Grid columns={3} className="mt-6">
        {quotes.map((q) => (
          <PricingCard
            key={q.durationMonths}
            title={q.durationLabel}
            hint={TENURE_OPTIONS.find((t) => t.months === q.durationMonths)?.hint}
            badge={q.durationMonths === 12 ? "Best value" : undefined}
            amount={formatInr(q.monthlyPriceInr)}
            amountNote="per month for the institute"
            secondaryAmount={formatInr(q.payableAmountInr)}
            secondaryNote={
              q.durationMonths === 1 ? "this month" : `across ${q.billableMonths} paid months`
            }
            featured={q.durationMonths === 12}
          >
            <p className="mt-3 text-sm text-muted-foreground">
              {q.showAsBaseSubscription
                ? `At ${formatCount(students)} students, the campus minimum keeps you at ${formatInr(q.monthlyPriceInr)}/month.`
                : `${formatCount(students)} students × ${formatInr(q.assignedRateInr)} = ${formatInr(q.studentChargeInr)}/month before tenure.`}
            </p>
            <CTAButton
              asChild
              variant={q.durationMonths === 12 ? "primary" : "secondary"}
              size="md"
              className="mt-4"
            >
              <Link to="/contact" search={contactSearch("quote", q.activeStudentCount)}>
                Request this quote
              </Link>
            </CTAButton>
          </PricingCard>
        ))}
      </Grid>
    </div>
  );
}
