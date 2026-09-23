import { Link } from "@tanstack/react-router";
import type { ProductPageContent } from "@/content/product-pages";
import { relatedProductPages } from "@/content/product-pages";
import { contactSearch } from "@/lib/search";
import { isDemoExploreId } from "@/content/demos";
import { PRODUCT_FAMILY_LIST } from "@/theme/products";
import { SiteShell } from "../SiteShell";
import { Container } from "../layout/Container";
import { Section } from "../layout/Section";
import { Grid } from "../layout/Grid";
import { Breadcrumbs } from "../navigation/Breadcrumbs";
import { ProductNavigation } from "../navigation/ProductNavigation";
import { FeatureCard } from "../content/FeatureCard";
import { ProductCard } from "../content/ProductCard";
import { ProductHero } from "./ProductHero";
import { ProductWorkflow } from "./ProductWorkflow";
import { ProductCTA } from "./ProductCTA";
import { ProductPreview } from "./ProductPreview";
import { ProductRoles } from "./ProductRoles";
import { ProductConnections } from "./ProductConnections";
import { ProductSurfaceGallery } from "./ProductSurfaceGallery";
import { CTAButton } from "../conversion/CTAButton";
import { DemoCTA } from "../conversion/DemoCTA";
import { DownloadProduct } from "../conversion/DownloadProduct";

function deliveryEyebrow(content: ProductPageContent) {
  if (content.delivery === "connect-portal") return "Connect portal";
  if (content.delivery === "platform") return "Platform";
  return "Product";
}

function ProductDownload({ content }: { content: ProductPageContent }) {
  return <DownloadProduct id={content.id} compact />;
}

export function ProductPage({ content }: { content: ProductPageContent }) {
  const showRelated = content.id !== "admin";
  const related = showRelated
    ? relatedProductPages(content.id).filter((page) => page.id !== "nexus")
    : [];
  const navProducts = showRelated
    ? PRODUCT_FAMILY_LIST.filter((p) => p.id !== "nexus").map((p) => ({
        id: p.id,
        label: p.shortName,
      }))
    : [];

  return (
    <SiteShell>
      <Container className="pt-8">
        <Breadcrumbs
          items={[
            { label: "Home", to: "/" },
            { label: "Platform", to: "/platform" },
            { label: content.shortName },
          ]}
        />
      </Container>

      <ProductHero
        product={content.id}
        eyebrow={deliveryEyebrow(content)}
        title={content.name}
        tagline={content.tagline}
        audience={content.audience}
        actions={
          <>
            <CTAButton asChild>
              <Link to="/contact" search={contactSearch("demo")}>
                Book a Demo
              </Link>
            </CTAButton>
            {isDemoExploreId(content.id) ? (
              <DemoCTA product={content.id} variant="secondary">
                Book a Demo
              </DemoCTA>
            ) : null}
          </>
        }
        visual={
          <ProductPreview
            product={content.id}
            tabs={content.previewTabs.slice(0, 3)}
            device={content.device === "browser" ? "tablet" : content.device}
            interactiveChild={content.id === "connect"}
            compact
          />
        }
      />

      <Section
        id="purpose"
        eyebrow="Purpose"
        title={`What ${content.shortName} is for.`}
        lede={content.purpose}
      >
        <p className="max-w-2xl text-sm text-muted-foreground">
          Replaces {content.replaces.toLowerCase()}. Does not replace {content.doesNotReplace.toLowerCase()}.
        </p>
      </Section>

      <Section
        id="capabilities"
        eyebrow="Capabilities"
        title="What it actually does."
        lede="Only surfaces that exist in the product — not a catalogue of hoped-for modules."
        tone="muted"
      >
        <Grid columns={3} stagger>
          {content.capabilities.map((item) => (
            <FeatureCard key={item.title} product={content.id} title={item.title}>
              {item.points?.length ? (
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {item.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              ) : (
                item.body
              )}
            </FeatureCard>
          ))}
        </Grid>
      </Section>

      <Section
        id="preview"
        eyebrow="Preview"
        title="Use it without an account."
        lede="Sample screens for exploration. Not live institute data, and not a real account login."
      >
        <ProductPreview
          product={content.id}
          tabs={content.previewTabs}
          device={content.device}
          interactiveChild={content.id === "connect"}
        />
      </Section>

      <Section
        id="workflows"
        eyebrow="Workflows"
        title="How the work actually moves."
        lede={
          content.id === "admin"
            ? "Set up once, run the day from one console, then hand each role their own door."
            : "These steps match the product — they are not invented hops."
        }
        tone="muted"
      >
        <ProductWorkflow steps={content.workflows} />
      </Section>

      <Section id="roles" eyebrow="Who uses it" title="The same records. The right door.">
        <ProductRoles product={content.id} roles={content.roles} />
      </Section>

      <Section
        id="ecosystem"
        eyebrow="Ecosystem"
        title="How it connects to the rest of LumenX."
        lede={
          content.id === "admin"
            ? "Admin at the centre. Every other app reads and writes through the same institute record."
            : "Separate products. Shared records. Not another role’s navigation."
        }
        tone="muted"
      >
        <ProductConnections items={content.connections} hub={content.id === "admin" ? "admin" : undefined} />
      </Section>

      {content.id !== "admin" ? (
        <Section id="highlights" eyebrow="Highlights" title="What to remember.">
          <Grid columns={3} stagger>
            {content.highlights.map((item) => (
              <FeatureCard key={item.title} product={content.id} title={item.title}>
                {item.body}
              </FeatureCard>
            ))}
          </Grid>
        </Section>
      ) : null}

      <Section
        id="screens"
        eyebrow="Look"
        title="More of the surface."
        lede={
          content.id === "admin"
            ? "One screen at a time — use the arrows to move through Admin surfaces."
            : "One screen at a time — use the arrows to browse the surface."
        }
        tone="muted"
      >
        <ProductSurfaceGallery
          product={content.id}
          shots={content.shots}
          defaultDevice={content.device}
        />
      </Section>

      {content.id !== "nexus" ? (
        <Section
          id="download"
          eyebrow="Get started"
          title="Open what exists. Do not wait on a fake store listing."
        >
          <ProductDownload content={content} />
          <p className="mt-6">
            <CTAButton asChild variant="ghost" className="px-0">
              <Link to="/resources/downloads" search={{ product: content.id }}>
                All download details
              </Link>
            </CTAButton>
          </p>
        </Section>
      ) : (
        <Section
          id="download"
          eyebrow="Access"
          title="Nexus is for groups and operators — not a public download."
        >
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            A single campus usually works in Admin and Connect. If you need Nexus for a group or trust, talk to us.
          </p>
          <div className="mt-6">
            <CTAButton asChild>
              <Link to="/contact" search={contactSearch("partner")}>
                Talk to us
              </Link>
            </CTAButton>
          </div>
        </Section>
      )}

      {showRelated ? (
        <Section
          id="related"
          eyebrow="Related"
          title="The rest of the family."
          tone="muted"
        >
          <ProductNavigation
            products={navProducts}
            active={content.id}
          />
          <div className="mt-8">
            <Grid columns={3} stagger>
              {related.slice(0, 3).map((page) => (
                <ProductCard
                  key={page.id}
                  product={page.id}
                  name={page.shortName}
                  tagline={page.tagline}
                  points={page.capabilities.slice(0, 2).map((item) => item.title)}
                />
              ))}
            </Grid>
          </div>
        </Section>
      ) : null}

      <ProductCTA product={content.id} title={content.getStarted.title} body={content.getStarted.body} />
    </SiteShell>
  );
}
