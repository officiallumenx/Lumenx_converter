import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { Section } from "@/components/layout/Section";
import { Container } from "@/components/layout/Container";
import { SiteCard } from "@/components/SiteCard";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { GetStartedCTA } from "@/components/conversion/GetStartedCTA";
import { CTAButton } from "@/components/conversion/CTAButton";
import {
  isModuleCategoryId,
  MODULE_CATEGORIES,
} from "@/content/module-categories";
import { pageHead } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";

export const Route = createFileRoute("/modules/$category")({
  beforeLoad: ({ params }) => {
    if (!isModuleCategoryId(params.category)) throw notFound();
  },
  head: ({ params }) => {
    if (!isModuleCategoryId(params.category)) {
      return pageHead({
        title: "Modules — LumenX",
        description: "LumenX module directory.",
        path: "/modules",
      });
    }
    const category = MODULE_CATEGORIES[params.category];
    return pageHead({
      path: category.path,
      title: `${category.title} — LumenX Modules`,
      description: category.lede,
    });
  },
  component: ModuleCategoryPage,
});

function ModuleCategoryPage() {
  const { category: categoryId } = Route.useParams();
  if (!isModuleCategoryId(categoryId)) return null;
  const category = MODULE_CATEGORIES[categoryId];

  return (
    <SiteShell>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Modules", path: "/modules" },
          { name: category.title, path: category.path },
        ])}
      />
      <Container className="pt-8">
        <Breadcrumbs
          items={[
            { label: "Home", to: "/" },
            { label: "Modules", to: "/modules" },
            { label: category.title },
          ]}
        />
      </Container>

      <Section headingAs="h1" eyebrow="Modules" title={category.title} lede={category.lede}>
        <div className="grid gap-4">
          {category.items.map((item) => (
            <SiteCard key={item.name} quiet>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold tracking-tight">{item.name}</h2>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {item.surfaces}
                </p>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.blurb}</p>
            </SiteCard>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <CTAButton asChild variant="secondary">
            <Link to="/modules">All categories</Link>
          </CTAButton>
          <CTAButton asChild>
            <Link to="/resources/demo">Open demo</Link>
          </CTAButton>
        </div>
      </Section>
      <GetStartedCTA />
    </SiteShell>
  );
}
