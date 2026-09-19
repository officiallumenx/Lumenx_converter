import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { Section } from "@/components/layout/Section";
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
      <Section
        headingAs="h1"
        eyebrow={PLATFORM_HERO.eyebrow}
        title={PLATFORM_HERO.title}
        lede={PLATFORM_HERO.lede}
      >
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
      </Section>

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
              <Link
                to="/platform/$slug"
                params={{ slug: product.id }}
                className="site-btn site-btn--ghost mt-4 h-auto justify-start px-0 text-foreground"
              >
                Explore {product.name}
                <ArrowRight className="size-4" />
              </Link>
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
