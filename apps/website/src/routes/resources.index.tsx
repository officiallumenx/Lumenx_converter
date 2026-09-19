import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { Section } from "@/components/layout/Section";
import { Grid } from "@/components/layout/Grid";
import { SiteCard } from "@/components/SiteCard";
import { GetStartedCTA } from "@/components/conversion/GetStartedCTA";
import { RESOURCE_CARDS, RESOURCES_HERO } from "@/content/resources";
import { PAGE_SEO, pageHead } from "@/lib/seo";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/resources/")({
  head: () => pageHead(PAGE_SEO.resources),
  component: ResourcesIndexPage,
});

function ResourcesIndexPage() {
  return (
    <SiteShell>
      <Section
        headingAs="h1"
        eyebrow={RESOURCES_HERO.eyebrow}
        title={RESOURCES_HERO.title}
        lede={RESOURCES_HERO.lede}
      >
        <Grid columns={3} stagger>
          {RESOURCE_CARDS.map((card) => (
            <SiteCard key={card.to} quiet>
              <h2 className="text-base font-semibold tracking-tight">{card.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{card.body}</p>
              <Link
                to={card.to}
                className="site-btn site-btn--ghost mt-4 h-auto justify-start px-0 text-foreground"
              >
                Open {card.title}
                <ArrowRight className="size-4" />
              </Link>
            </SiteCard>
          ))}
        </Grid>
      </Section>
      <GetStartedCTA />
    </SiteShell>
  );
}
