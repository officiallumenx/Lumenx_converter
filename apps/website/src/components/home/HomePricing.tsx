import { Link } from "@tanstack/react-router";
import {
  DEFAULT_PER_STUDENT_RATE_INR,
  DEFAULT_TRIAL_DAYS,
  MIN_MONTHLY_CHARGE_INR,
  NORMAL_PER_STUDENT_RATE_MAX_INR,
} from "@lumenx/utils/subscription/policy";
import { Section } from "../layout/Section";
import { CTAButton } from "../conversion/CTAButton";
import { SiteCard } from "../SiteCard";
import { formatInr } from "@/lib/format";
import { contactSearch } from "@/lib/search";

export function HomePricing() {
  return (
    <Section
      id="pricing"
      eyebrow="Pricing"
      title={`Simple for institutes — about ${formatInr(DEFAULT_PER_STUDENT_RATE_INR)} per student each month.`}
      lede={`One campus plan. Free trial for ${DEFAULT_TRIAL_DAYS} days after approval. No payment on this website.`}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <SiteCard quiet>
          <p className="text-sm font-semibold tracking-tight">Per student</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums tracking-tight">
            {formatInr(DEFAULT_PER_STUDENT_RATE_INR)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Typical band {formatInr(DEFAULT_PER_STUDENT_RATE_INR)}–{formatInr(NORMAL_PER_STUDENT_RATE_MAX_INR)} / month
          </p>
        </SiteCard>
        <SiteCard quiet>
          <p className="text-sm font-semibold tracking-tight">Campus from</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums tracking-tight">
            {formatInr(MIN_MONTHLY_CHARGE_INR)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Whole institute / month</p>
        </SiteCard>
        <SiteCard quiet>
          <p className="text-sm font-semibold tracking-tight">Trial</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums tracking-tight">
            {DEFAULT_TRIAL_DAYS} days
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Full access after approval</p>
        </SiteCard>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <CTAButton asChild>
          <Link to="/pricing" search={{}}>
            See full pricing
          </Link>
        </CTAButton>
        <CTAButton asChild variant="secondary">
          <Link to="/contact" search={contactSearch("trial")}>
            Start free trial
          </Link>
        </CTAButton>
        <CTAButton asChild variant="ghost">
          <Link to="/contact" search={contactSearch("quote")}>
            Request a quote
          </Link>
        </CTAButton>
      </div>
    </Section>
  );
}
