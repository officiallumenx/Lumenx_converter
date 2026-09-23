import { Link } from "@tanstack/react-router";
import {
  DEFAULT_PER_STUDENT_RATE_INR,
  DEFAULT_TRIAL_DAYS,
  MIN_MONTHLY_CHARGE_INR,
  NORMAL_PER_STUDENT_RATE_MAX_INR,
  NORMAL_PER_STUDENT_RATE_MIN_INR,
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
      title="One monthly bill — not two."
      lede={`Per-student rate is set for your campus (often ${formatInr(NORMAL_PER_STUDENT_RATE_MIN_INR)}–${formatInr(NORMAL_PER_STUDENT_RATE_MAX_INR)}). You pay that × students, or ${formatInr(MIN_MONTHLY_CHARGE_INR)} — whichever is higher. ${DEFAULT_TRIAL_DAYS}-day free trial.`}
    >
      <SiteCard quiet className="mx-auto max-w-2xl">
        <p className="text-center text-sm leading-relaxed text-muted-foreground sm:text-base">
          {formatInr(DEFAULT_PER_STUDENT_RATE_INR)} on this site is only a starting estimate — not the only
          rate. Example at {formatInr(DEFAULT_PER_STUDENT_RATE_INR)}: 400 students →{" "}
          <span className="font-medium text-foreground">{formatInr(MIN_MONTHLY_CHARGE_INR)}</span>{" "}
          minimum; 1,000 students →{" "}
          <span className="font-medium text-foreground">
            {formatInr(1000 * DEFAULT_PER_STUDENT_RATE_INR)}
          </span>
          .
        </p>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          Admin and Connect included. No payment on this website.
        </p>
      </SiteCard>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <CTAButton asChild>
          <Link to="/pricing" search={{}}>
            Estimate your price
          </Link>
        </CTAButton>
        <CTAButton asChild variant="secondary">
          <Link to="/contact" search={contactSearch("trial")}>
            Start free trial
          </Link>
        </CTAButton>
      </div>
    </Section>
  );
}
