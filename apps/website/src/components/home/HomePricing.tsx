import { Link } from "@tanstack/react-router";
import {
  DEFAULT_PER_STUDENT_RATE_INR,
  DEFAULT_TRIAL_DAYS,
  MIN_MONTHLY_CHARGE_INR,
  NORMAL_PER_STUDENT_RATE_MAX_INR,
  NORMAL_PER_STUDENT_RATE_MIN_INR,
} from "@lumenx/utils/subscription/policy";
import { Badge } from "@lumenx/ui";
import { Section } from "../layout/Section";
import { CTAButton } from "../conversion/CTAButton";
import { SiteCard } from "../SiteCard";
import { formatInr } from "@/lib/format";
import { contactSearch } from "@/lib/search";

/** Homepage pricing summary — must match `/pricing` and subscription policy. */
export function HomePricing() {
  return (
    <Section
      id="pricing"
      align="center"
      eyebrow="Pricing"
      title={`Monthly from ${formatInr(DEFAULT_PER_STUDENT_RATE_INR)} per student.`}
      lede={`Pay the higher of (students × your campus rate) or ${formatInr(MIN_MONTHLY_CHARGE_INR)} — never both. Typical rates ${formatInr(NORMAL_PER_STUDENT_RATE_MIN_INR)}–${formatInr(NORMAL_PER_STUDENT_RATE_MAX_INR)}. ${DEFAULT_TRIAL_DAYS}-day free trial after approval. Yearly billing includes 2 months free.`}
    >
      <div className="play-pricing-summary">
        <SiteCard quiet className="play-pricing-summary__card">
          <Badge variant="secondary">Per student</Badge>
          <p className="play-pricing-summary__value">
            From {formatInr(DEFAULT_PER_STUDENT_RATE_INR)}
          </p>
          <p className="play-pricing-summary__note">
            / student / month · campus rate usually {formatInr(NORMAL_PER_STUDENT_RATE_MIN_INR)}–
            {formatInr(NORMAL_PER_STUDENT_RATE_MAX_INR)}
          </p>
        </SiteCard>
        <SiteCard quiet className="play-pricing-summary__card">
          <Badge variant="secondary">Campus minimum</Badge>
          <p className="play-pricing-summary__value">{formatInr(MIN_MONTHLY_CHARGE_INR)}</p>
          <p className="play-pricing-summary__note">
            Monthly floor when students × rate is lower — not added on top
          </p>
        </SiteCard>
        <SiteCard quiet className="play-pricing-summary__card play-pricing-summary__card--accent">
          <Badge>Trial & yearly</Badge>
          <p className="play-pricing-summary__value">{DEFAULT_TRIAL_DAYS} days free</p>
          <p className="play-pricing-summary__note">
            Full trial after approval · yearly tenure includes 2 months free
          </p>
        </SiteCard>
      </div>
      <div className="site-cta-row mt-8 justify-center">
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
