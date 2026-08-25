import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { Container } from "@/components/layout/Container";
import { Grid } from "@/components/layout/Grid";
import { StatCard } from "@/components/content/StatCard";
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
import { HomeDownloads } from "@/components/home/HomeDownloads";
import { HomePricing } from "@/components/home/HomePricing";
import { HomeFaq } from "@/components/home/HomeFaq";
import { HomeLeaveMessage } from "@/components/home/HomeLeaveMessage";
import { MIN_MONTHLY_CHARGE_INR } from "@lumenx/utils/subscription/policy";
import { HOME_FAQ } from "@/content/home";
import { PAGE_SEO, faqJsonLd, organizationJsonLd, pageHead, websiteJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { formatInr } from "@/lib/format";
import { Reveal } from "@/motion/Reveal";
import { StatCounter } from "@/motion/StatCounter";

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

      <section className="border-y bg-muted/80">
        <Container>
          <Reveal>
            <Grid columns={4} stagger className="py-8">
              <StatCard
                srValue="60 days"
                value={
                  <>
                    <StatCounter to={60} /> days
                  </>
                }
                label="Full access after approval"
              />
              <StatCard
                srValue={formatInr(MIN_MONTHLY_CHARGE_INR)}
                value={<StatCounter to={MIN_MONTHLY_CHARGE_INR} format={formatInr} />}
                label="Campus from — then per student"
              />
              <StatCard value="1 · 6 · 12" label="Monthly, half-year, yearly tenure" />
              <StatCard
                srValue="Six products"
                value={
                  <>
                    <StatCounter to={6} /> products
                  </>
                }
                label="One connected ecosystem"
              />
            </Grid>
          </Reveal>
        </Container>
      </section>

      <HomeProblem />
      <HomeEcosystem />
      <HomeShowcase />
      <HomeFlows />
      <HomeFeatures />
      <HomeRoles />
      <HomeDemos />
      <HomeDownloads />
      <HomePricing />
      <HomeFaq />
      <HomeLeaveMessage />
      <GetStartedCTA
        title="Put the whole institute on one platform."
        body="Register the institute, complete verification, and run a full 60-day trial. This site does not collect payment."
        secondary={
          <CTAButton asChild variant="on-ink">
            <Link to="/products">Explore products</Link>
          </CTAButton>
        }
      />
    </SiteShell>
  );
}
