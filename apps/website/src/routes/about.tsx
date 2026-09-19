import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { Section } from "@/components/layout/Section";
import { Grid } from "@/components/layout/Grid";
import { SiteCard } from "@/components/SiteCard";
import { ProductMark } from "@/components/product/ProductMark";
import { GetStartedCTA } from "@/components/conversion/GetStartedCTA";
import { CTAButton } from "@/components/conversion/CTAButton";
import {
  ABOUT_APPROACH,
  ABOUT_BUILDING,
  ABOUT_HERO,
  ABOUT_PRINCIPLES,
  ABOUT_PROBLEM,
  ABOUT_WHY,
} from "@/content/about";
import { contactSearch } from "@/lib/search";
import { PAGE_SEO, pageHead } from "@/lib/seo";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => pageHead(PAGE_SEO.about),
  component: AboutPage,
});

function AboutPage() {
  return (
    <SiteShell>
      <Section headingAs="h1" eyebrow={ABOUT_HERO.eyebrow} title={ABOUT_HERO.title} lede={ABOUT_HERO.lede}>
        <CTAButton asChild>
          <Link to="/contact" search={contactSearch("demo")}>
            Book a Demo
          </Link>
        </CTAButton>
      </Section>

      <Section title={ABOUT_WHY.title} tone="muted">
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{ABOUT_WHY.body}</p>
      </Section>

      <Section title={ABOUT_PROBLEM.title}>
        <ul className="max-w-2xl space-y-3 text-sm leading-relaxed text-muted-foreground">
          {ABOUT_PROBLEM.points.map((point) => (
            <li key={point} className="flex gap-2">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-foreground/35" aria-hidden />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={ABOUT_APPROACH.title} tone="muted">
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{ABOUT_APPROACH.body}</p>
      </Section>

      <Section
        eyebrow="What we build"
        title="Admin, Connect, Transport, Admissions, and Careers."
        lede="Five public surfaces for the campus day — one connected platform for managing your institution."
      >
        <Grid columns={3} stagger>
          {ABOUT_BUILDING.map((item) => (
            <SiteCard key={item.id} product={item.id}>
              <ProductMark product={item.id} />
              <h2 className="mt-4 text-base font-semibold tracking-tight">{item.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
              <Link
                to="/platform/$slug"
                params={{ slug: item.id }}
                className="site-btn site-btn--ghost mt-4 h-auto justify-start px-0 text-foreground"
              >
                Explore {item.name}
                <ArrowRight className="size-4" />
              </Link>
            </SiteCard>
          ))}
        </Grid>
      </Section>

      <Section eyebrow="Principles" title="How we try to show up." tone="muted">
        <Grid columns={3} stagger>
          {ABOUT_PRINCIPLES.map((item) => (
            <SiteCard key={item.title} quiet>
              <h2 className="text-base font-semibold tracking-tight">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </SiteCard>
          ))}
        </Grid>
      </Section>

      <GetStartedCTA />
    </SiteShell>
  );
}
