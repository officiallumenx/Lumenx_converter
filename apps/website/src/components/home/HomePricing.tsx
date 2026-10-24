import { Link } from "@tanstack/react-router";
import {
  DEFAULT_PER_STUDENT_RATE_INR,
  DEFAULT_TRIAL_DAYS,
} from "@lumenx/utils/subscription/policy";
import { Badge } from "@lumenx/ui";
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
      title={`Starts from ${formatInr(DEFAULT_PER_STUDENT_RATE_INR)} / month.`}
      lede={`First ${DEFAULT_TRIAL_DAYS} days free on your first use. Choose an annual plan and get another ${DEFAULT_TRIAL_DAYS} days free.`}
    >
      <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
        <SiteCard quiet className="text-center">
          <Badge variant="secondary" className="mx-auto">
            First use
          </Badge>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {DEFAULT_TRIAL_DAYS} days free
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Full trial when your institute starts — then from {formatInr(DEFAULT_PER_STUDENT_RATE_INR)} / month
          </p>
        </SiteCard>
        <SiteCard quiet className="text-center border-[var(--border-brand)]">
          <Badge className="mx-auto">Annual plan</Badge>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {DEFAULT_TRIAL_DAYS} days free
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Extra free period on yearly billing — best value for the campus
          </p>
        </SiteCard>
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
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
      </div>
    </Section>
  );
}
