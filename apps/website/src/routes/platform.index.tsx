import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@lumenx/ui";
import { SiteShell } from "@/components/SiteShell";
import { Section } from "@/components/layout/Section";
import { Container } from "@/components/layout/Container";
import { Grid } from "@/components/layout/Grid";
import { SiteCard } from "@/components/SiteCard";
import { ProductMark } from "@/components/product/ProductMark";
import { GetStartedCTA } from "@/components/conversion/GetStartedCTA";
import { CTAButton } from "@/components/conversion/CTAButton";
import { PLATFORM_CONNECTIONS, PLATFORM_HERO, PLATFORM_PRODUCTS } from "@/content/platform";
import { contactSearch } from "@/lib/search";
import { PAGE_SEO, pageHead } from "@/lib/seo";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/platform/")({
  head: () => pageHead(PAGE_SEO.platform),
  component: PlatformIndexPage,
});

function PlatformIndexPage() {
  return (
    <SiteShell>
      <section className="site-section pt-10 md:pt-14 pb-6 md:pb-10">
        <Container>
          <div className="platform-hero-split">
            <div className="platform-hero__copy">
              <p className="site-kicker">{PLATFORM_HERO.eyebrow}</p>
              <h1 className="platform-hero__title mt-3">{PLATFORM_HERO.title}</h1>
              <p className="site-lede platform-hero__lede">{PLATFORM_HERO.lede}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <CTAButton asChild>
                  <Link to="/contact" search={contactSearch("demo")}>
                    Book a Demo
                  </Link>
                </CTAButton>
                <CTAButton asChild variant="secondary">
                  <Link to="/modules">Explore modules</Link>
                </CTAButton>
              </div>
            </div>

            <div className="platform-hero__media">
              <img
                src="/brand/lumenx-platform-hub.jpg"
                alt="LumenX Admin at the center, connected to Connect, Transport, Admissions, Careers, and related modules"
                width={1024}
                height={576}
                decoding="async"
                fetchPriority="high"
                className="platform-hero__img"
              />
            </div>
          </div>
        </Container>
      </section>

      <Section
        eyebrow="Products"
        title="Five surfaces. One institute record."
        lede="Each product has a job. Together they manage the institution."
        tone="muted"
      >
        <Grid columns={3} stagger>
          {PLATFORM_PRODUCTS.map((product) => (
            <SiteCard key={product.id} product={product.id}>
              <ProductMark product={product.id} />
              <h3 className="mt-4 text-base font-semibold tracking-tight">{product.name}</h3>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {product.role}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{product.body}</p>
              <Button asChild variant="ghost" className="mt-4 h-auto justify-start px-0 text-foreground">
                <Link to="/platform/$slug" params={{ slug: product.id }}>
                  Explore {product.name}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </SiteCard>
          ))}
        </Grid>
      </Section>

      <Section
        eyebrow="Connected"
        title="How the platform holds together."
        lede="Separate apps. Shared campus. Role-appropriate doors."
      >
        <Grid columns={3} stagger>
          {PLATFORM_CONNECTIONS.map((item) => (
            <SiteCard key={item.title} quiet>
              <h3 className="text-base font-semibold tracking-tight">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </SiteCard>
          ))}
        </Grid>
      </Section>

      <GetStartedCTA />
    </SiteShell>
  );
}
