import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { Section } from "@/components/layout/Section";
import { FAQItem } from "@/components/content/FAQItem";
import { GetStartedCTA } from "@/components/conversion/GetStartedCTA";
import { HOME_FAQ } from "@/content/home";
import { PAGE_SEO, faqJsonLd, pageHead } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";

export const Route = createFileRoute("/resources/faq")({
  head: () => pageHead(PAGE_SEO.faq),
  component: ResourcesFaqPage,
});

function ResourcesFaqPage() {
  return (
    <SiteShell>
      <JsonLd data={faqJsonLd(HOME_FAQ)} />
      <Section
        headingAs="h1"
        eyebrow="FAQs"
        title="Plain answers about LumenX."
        lede="Products, pricing, trial, transport status, and getting started — without invented metrics."
      >
        <div className="space-y-3">
          {HOME_FAQ.map((item) => (
            <FAQItem key={item.q} question={item.q}>
              {item.a}
            </FAQItem>
          ))}
        </div>
      </Section>
      <GetStartedCTA />
    </SiteShell>
  );
}
