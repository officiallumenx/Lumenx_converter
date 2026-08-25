import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { Section } from "@/components/layout/Section";
import { Grid } from "@/components/layout/Grid";
import { ProductCard } from "@/components/content/ProductCard";
import { ProductFamily } from "@/components/ProductIdentity";
import { ProductComparison } from "@/components/product/ProductComparison";
import { GetStartedCTA } from "@/components/conversion/GetStartedCTA";
import { CTAButton } from "@/components/conversion/CTAButton";
import { PRODUCT_PAGE_LIST } from "@/content/product-pages";
import { PAGE_SEO, pageHead } from "@/lib/seo";

export const Route = createFileRoute("/products/")({
  head: () => pageHead(PAGE_SEO.products),
  component: ProductsIndexPage,
});

function ProductsIndexPage() {
  return (
    <SiteShell>
      <Section
        eyebrow="Products"
        title="Six products. One platform."
        lede="Each product has a job. Together they manage the institution. Admissions and Careers are first-class products, delivered as Connect portals."
        headingAs="h1"
      >
        <Grid columns={3} stagger>
          {PRODUCT_PAGE_LIST.map((p) => (
            <ProductCard
              key={p.id}
              product={p.id}
              name={p.shortName}
              tagline={p.tagline}
              points={p.capabilities.slice(0, 3).map((item) => item.title)}
            />
          ))}
        </Grid>
      </Section>

      <Section
        eyebrow="Family"
        title="Independent products. One visual language."
        lede="The same card, type, and mark system. Accents stay inside the LumenX blue family."
        tone="muted"
      >
        <ProductFamily />
      </Section>

      <Section title="What each one replaces">
        <ProductComparison
          caption="Product scope"
          columns={["Product", "Replaces", "Does not replace"]}
          rows={PRODUCT_PAGE_LIST.map((p) => ({
            id: p.id,
            cells: [p.shortName, p.replaces, p.doesNotReplace],
          }))}
        />
        <CTAButton asChild variant="secondary" className="mt-6">
          <Link to="/solutions">View by role</Link>
        </CTAButton>
      </Section>
      <GetStartedCTA />
    </SiteShell>
  );
}
