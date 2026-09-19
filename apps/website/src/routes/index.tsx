import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { GetStartedCTA } from "@/components/conversion/GetStartedCTA";
import { CTAButton } from "@/components/conversion/CTAButton";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeProblem } from "@/components/home/HomeProblem";
import { HomeEcosystem } from "@/components/home/HomeEcosystem";
import { HomeShowcase } from "@/components/home/HomeShowcase";
import { HomeFlows } from "@/components/home/HomeFlows";
import { HomeFeatures } from "@/components/home/HomeFeatures";
import { HomeRoles } from "@/components/home/HomeRoles";
import { HomeDemos } from "@/components/home/HomeDemos";
import { HomePricing } from "@/components/home/HomePricing";
import { HomeFaq } from "@/components/home/HomeFaq";
import { HOME_FAQ } from "@/content/home";
import { PAGE_SEO, faqJsonLd, organizationJsonLd, pageHead, websiteJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { contactSearch } from "@/lib/search";

export const Route = createFileRoute("/")({
  head: () => pageHead(PAGE_SEO.home),
  component: HomePage,
});

function HomePage() {
  return (
    <SiteShell>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />
      <JsonLd data={faqJsonLd(HOME_FAQ)} />
      <HomeHero />
      <HomeProblem />
      <HomeEcosystem />
      <HomeShowcase />
      <HomeRoles />
      <HomeFeatures />
      <HomeFlows />
      <HomeDemos />
      <HomePricing />
      <HomeFaq />
      <GetStartedCTA
        title="Put the whole institute on one platform."
        body="Book a demo or start a 60-day trial after approval. This site does not collect payment."
        primary={
          <CTAButton asChild variant="invert">
            <Link to="/contact" search={contactSearch("demo")}>
              Book a Demo
            </Link>
          </CTAButton>
        }
        secondary={
          <CTAButton asChild variant="on-ink">
            <Link to="/platform">Explore Platform</Link>
          </CTAButton>
        }
      />
    </SiteShell>
  );
}
