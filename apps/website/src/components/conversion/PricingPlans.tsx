import { Link } from "@tanstack/react-router";
import {
  DEFAULT_PER_STUDENT_RATE_INR,
  DEFAULT_TRIAL_DAYS,
  MIN_MONTHLY_CHARGE_INR,
} from "@lumenx/utils/subscription/policy";
import { quoteAllDurations } from "@lumenx/utils/subscription/pricing";
import { formatCount, formatInr } from "@/lib/format";
import { contactSearch } from "@/lib/search";
import { SiteCard } from "../SiteCard";
import { PricingCard } from "../content/PricingCard";
import { CTAButton } from "./CTAButton";

export function PricingPlans({
  students,
  ratePerHead = DEFAULT_PER_STUDENT_RATE_INR,
}: {
  students: number;
  ratePerHead?: number;
}) {
  const quotes = quoteAllDurations({
    activeStudentCount: students,
    assignedRateInr: ratePerHead,
  });
  const monthly = quotes.find((q) => q.durationMonths === 1) ?? quotes[0];

  return (
    <div className="grid gap-6">
      <SiteCard className="border-[var(--border-brand)] bg-[color-mix(in_oklch,var(--site-brand-soft)_55%,var(--card))]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="site-kicker">Start here</p>
            <p className="mt-2 text-xl font-semibold tracking-tight">
              {DEFAULT_TRIAL_DAYS}-day trial for your institute
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Full access after approval. No payment on this website. See Admin, Connect, and the modules you enable
              before you commit.
            </p>
          </div>
          <CTAButton asChild className="w-full shrink-0 sm:w-auto">
            <Link to="/contact" search={contactSearch("trial")}>
              Start free trial
            </Link>
          </CTAButton>
        </div>
      </SiteCard>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--elevated)] px-5 py-4 sm:px-6">
        <p className="text-sm font-semibold tracking-tight">
          Estimate for {formatCount(students)} students
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          About{" "}
          <span className="font-medium text-foreground">{formatInr(ratePerHead)} per student / month</span>
          {monthly.showAsBaseSubscription
            ? ` · your campus monthly price is ${formatInr(monthly.monthlyPriceInr)} (campus minimum)`
            : ` · about ${formatInr(monthly.monthlyPriceInr)} / month for the institute`}
          . Your exact rate is confirmed when you join.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {quotes.map((q) => {
          const yearlyBest = q.durationMonths === 12;
          const savingsHint =
            q.freeMonths > 0
              ? `${q.freeMonths} month${q.freeMonths === 1 ? "" : "s"} free`
              : q.durationMonths === 6
                ? "Pay for 6 months"
                : "Flexible month to month";
          return (
            <PricingCard
              key={q.durationMonths}
              title={q.durationLabel}
              hint={savingsHint}
              badge={yearlyBest ? "Best value" : undefined}
              amount={formatInr(q.monthlyPriceInr)}
              amountNote="per month for the institute"
              secondaryAmount={formatInr(q.payableAmountInr)}
              secondaryNote={
                q.durationMonths === 1
                  ? "this month"
                  : `for ${q.billableMonths} paid months`
              }
              featured={yearlyBest}
            >
              <p className="mt-3 text-sm text-muted-foreground">
                {q.showAsBaseSubscription
                  ? `Campus minimum ${formatInr(MIN_MONTHLY_CHARGE_INR)}/month applies at this size.`
                  : `Based on ${formatInr(ratePerHead)}/student × ${formatCount(students)}.`}
              </p>
              <CTAButton asChild variant={yearlyBest ? "primary" : "secondary"} size="md" className="mt-4">
                <Link to="/contact" search={contactSearch("quote", students)}>
                  Request a quote
                </Link>
              </CTAButton>
            </PricingCard>
          );
        })}
      </div>
    </div>
  );
}
