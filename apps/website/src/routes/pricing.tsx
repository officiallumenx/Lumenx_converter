import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  DEFAULT_PER_STUDENT_RATE_INR,
  DEFAULT_TRIAL_DAYS,
  MIN_MONTHLY_CHARGE_INR,
} from "@lumenx/utils/subscription/policy";
import { calculateSubscriptionQuote } from "@lumenx/utils/subscription/pricing";
import { SiteShell } from "@/components/SiteShell";
import { Section } from "@/components/layout/Section";
import { QuoteCalculator } from "@/components/QuoteCalculator";
import { PricingPlans } from "@/components/conversion/PricingPlans";
import { ConversionNav } from "@/components/conversion/ConversionNav";
import { GetStartedCTA } from "@/components/conversion/GetStartedCTA";
import { CTAButton } from "@/components/conversion/CTAButton";
import { FAQItem } from "@/components/content/FAQItem";
import { ProductComparison } from "@/components/product/ProductComparison";
import { SiteCard } from "@/components/SiteCard";
import { formatInr } from "@/lib/format";
import { contactSearch, parsePricingSearch } from "@/lib/search";
import {
  PRICING_FAQ,
  PRICING_HERO,
  PRICING_HOW_IT_WORKS,
  PRICING_INCLUSION,
  PRICING_PILLARS,
} from "@/content/pricing";
import { PAGE_SEO, faqJsonLd, pageHead } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";

export const Route = createFileRoute("/pricing")({
  validateSearch: parsePricingSearch,
  head: () => pageHead(PAGE_SEO.pricing),
  component: PricingPage,
});

function PricingPage() {
  const search = Route.useSearch();
  const [students, setStudents] = useState(search.students && search.students > 0 ? search.students : 400);
  const [ratePerHead, setRatePerHead] = useState(DEFAULT_PER_STUDENT_RATE_INR);
  const example = calculateSubscriptionQuote({
    activeStudentCount: 400,
    assignedRateInr: DEFAULT_PER_STUDENT_RATE_INR,
    durationMonths: 12,
  });

  return (
    <SiteShell>
      <JsonLd data={faqJsonLd(PRICING_FAQ)} />
      <Section headingAs="h1" eyebrow={PRICING_HERO.eyebrow} title={PRICING_HERO.title} lede={PRICING_HERO.lede}>
        <ConversionNav active="/pricing" />

        <div className="mb-10 grid gap-4 sm:grid-cols-3">
          {PRICING_PILLARS.map((pillar) => (
            <SiteCard key={pillar.title} quiet>
              <p className="text-sm font-semibold tracking-tight">{pillar.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{pillar.body}</p>
            </SiteCard>
          ))}
        </div>

        <PricingPlans students={students} ratePerHead={ratePerHead} />
      </Section>

      <Section
        title="See it for your student count"
        lede="Enter students, cost per head, and tenure. We show monthly campus price and total cost for the period."
      >
        <QuoteCalculator
          students={students}
          onStudentsChange={setStudents}
          ratePerHead={ratePerHead}
          onRatePerHeadChange={setRatePerHead}
        />
      </Section>

      <Section
        title="How institute pricing works"
        lede="Three simple steps. One campus plan. Optional modules when you need them."
        tone="muted"
      >
        <ol className="grid gap-4 md:grid-cols-3">
          {PRICING_HOW_IT_WORKS.map((step, index) => (
            <li key={step.title} className="site-card site-card--quiet">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Step {index + 1}
              </p>
              <p className="mt-2 text-sm font-semibold tracking-tight">{step.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        title="What your institute gets"
        lede="One subscription for the campus. Turn on Transport, Admissions, or Careers when you are ready."
      >
        <ProductComparison
          caption="Included with the institute subscription"
          columns={["Product", "Access", "What it means"]}
          rows={PRICING_INCLUSION.map((row) => ({
            id: row.id,
            cells: [row.name, row.access, row.note],
          }))}
        />
      </Section>

      <Section
        title="Example · mid-size campus"
        lede={`At 400 students, the estimate is ${formatInr(example.monthlyPriceInr)}/month for the whole institute (${formatInr(MIN_MONTHLY_CHARGE_INR)} campus minimum). Yearly with 2 months free is ${formatInr(example.payableAmountInr)} for the period — still the same monthly campus price.`}
        narrow
      >
        <div className="flex flex-wrap gap-3">
          <CTAButton asChild>
            <Link to="/contact" search={contactSearch("quote", 400)}>
              Request a quote for 400 students
            </Link>
          </CTAButton>
          <CTAButton asChild variant="secondary">
            <Link to="/contact" search={contactSearch("trial")}>
              Start {DEFAULT_TRIAL_DAYS}-day trial
            </Link>
          </CTAButton>
        </div>
      </Section>

      <Section title="Questions institutes ask" narrow>
        {PRICING_FAQ.map((item, i) => (
          <FAQItem key={item.q} question={item.q} defaultOpen={i === 0}>
            {item.a}
          </FAQItem>
        ))}
      </Section>
      <GetStartedCTA
        title="Ready when your institute is"
        body="Start a free trial after verification, or ask us to confirm a quote for your student count. No payment on this website."
      />
    </SiteShell>
  );
}
