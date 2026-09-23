import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { DEFAULT_TRIAL_DAYS } from "@lumenx/utils/subscription/policy";
import { SiteShell } from "@/components/SiteShell";
import { Section } from "@/components/layout/Section";
import { QuoteCalculator } from "@/components/QuoteCalculator";
import { ConversionNav } from "@/components/conversion/ConversionNav";
import { GetStartedCTA } from "@/components/conversion/GetStartedCTA";
import { CTAButton } from "@/components/conversion/CTAButton";
import { FAQItem } from "@/components/content/FAQItem";
import { SiteCard } from "@/components/SiteCard";
import { contactSearch, parsePricingSearch } from "@/lib/search";
import {
  PRICING_FAQ,
  PRICING_FORMULA,
  PRICING_HERO,
  PRICING_INCLUDED,
  PRICING_RULE,
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
  const [students, setStudents] = useState(
    search.students && search.students > 0 ? search.students : 400,
  );

  return (
    <SiteShell>
      <JsonLd data={faqJsonLd(PRICING_FAQ)} />

      <Section headingAs="h1" eyebrow={PRICING_HERO.eyebrow} title={PRICING_HERO.title} lede={PRICING_HERO.lede}>
        <ConversionNav active="/pricing" />

        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          {PRICING_FORMULA.map((tile) => (
            <SiteCard key={tile.note} quiet className="text-center sm:text-left">
              <p className="font-mono text-2xl font-semibold tabular-nums tracking-tight">{tile.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{tile.note}</p>
            </SiteCard>
          ))}
        </div>

        <SiteCard quiet className="mb-10">
          <p className="text-sm font-semibold tracking-tight">{PRICING_RULE.title}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{PRICING_RULE.body}</p>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted-foreground">
            {PRICING_RULE.examples.map((ex) => (
              <li key={ex.label}>
                <span className="font-medium text-foreground">{ex.label}: </span>
                {ex.detail}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">{PRICING_RULE.note}</p>
        </SiteCard>

        <QuoteCalculator students={students} onStudentsChange={setStudents} />
      </Section>

      <Section
        title="What you get"
        lede="One campus subscription. Turn on extra modules when you need them."
        tone="muted"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {PRICING_INCLUDED.map((group) => (
            <SiteCard key={group.title} quiet>
              <p className="text-sm font-semibold tracking-tight">{group.title}</p>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </SiteCard>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <CTAButton asChild>
            <Link to="/contact" search={contactSearch("trial")}>
              Start {DEFAULT_TRIAL_DAYS}-day trial
            </Link>
          </CTAButton>
          <CTAButton asChild variant="secondary">
            <Link to="/contact" search={contactSearch("quote", students)}>
              Request a quote
            </Link>
          </CTAButton>
        </div>
      </Section>

      <Section title="Common questions" narrow>
        {PRICING_FAQ.map((item, i) => (
          <FAQItem key={item.q} question={item.q} defaultOpen={i === 0}>
            {item.a}
          </FAQItem>
        ))}
      </Section>

      <GetStartedCTA
        title="Ready when your institute is"
        body="Start a free trial after verification, or ask us to confirm a quote. No payment on this website."
      />
    </SiteShell>
  );
}
