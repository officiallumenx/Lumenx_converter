import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { Section } from "@/components/layout/Section";
import { DemoExplorer } from "@/components/demos/DemoExplorer";
import { ConversionNav } from "@/components/conversion/ConversionNav";
import { GetStartedCTA } from "@/components/conversion/GetStartedCTA";
import { CTAButton } from "@/components/conversion/CTAButton";
import { SiteCard } from "@/components/SiteCard";
import { parseDemoSearch, contactSearch } from "@/lib/search";
import { DEMO_EXPLORE, isDemoExploreId, type DemoExploreId } from "@/content/demos";
import { PAGE_SEO, pageHead } from "@/lib/seo";

export const Route = createFileRoute("/demo")({
  validateSearch: parseDemoSearch,
  head: () => pageHead(PAGE_SEO.demo),
  component: DemoPage,
});

function resolveExploreProduct(product?: string, demo?: string): DemoExploreId {
  if (product && isDemoExploreId(product)) return product;
  const fromFlow = DEMO_EXPLORE.find((item) => item.flow === demo);
  return fromFlow?.id ?? "admin";
}

function DemoPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/demo" });
  const product = resolveExploreProduct(search.product, search.demo);

  return (
    <SiteShell>
      <Section
        headingAs="h1"
        eyebrow="Demo"
        title="Explore the products without an account."
        lede="Admin, Connect, Transport, Admissions, and Careers — mock screens and short walkthroughs. They are not the live apps, they do not save, and they do not take payment."
      >
        <ConversionNav active="/demo" />
        {search.product === "nexus" ? (
          <SiteCard quiet>
            <h2 className="text-xl font-semibold tracking-tight">Nexus is the service platform.</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Groups and operators use Nexus for licensing, support, institute feedback, and platform health — so the
              experience stays strong after go-live. A single campus lives in Admin. This demo page is for the school
              products.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <CTAButton asChild>
                <Link to="/products/$slug" params={{ slug: "nexus" }}>
                  Read about Nexus
                </Link>
              </CTAButton>
              <CTAButton asChild variant="secondary">
                <Link to="/contact" search={contactSearch("partner")}>
                  Talk to us
                </Link>
              </CTAButton>
            </div>
          </SiteCard>
        ) : (
          <DemoExplorer
            product={product}
            flow={search.demo}
            onProductChange={(id) => {
              navigate({ search: { product: id }, replace: true });
            }}
            onFlowChange={(id) => {
              navigate({ search: { product, demo: id }, replace: true });
            }}
          />
        )}
      </Section>
      <GetStartedCTA
        title="Want the real apps?"
        body="Get started when you’re ready. A 60-day trial begins after the institute is approved."
        primary={
          <CTAButton asChild variant="invert">
            <Link to="/get-started" search={{}}>
              Get started
            </Link>
          </CTAButton>
        }
      />
    </SiteShell>
  );
}
