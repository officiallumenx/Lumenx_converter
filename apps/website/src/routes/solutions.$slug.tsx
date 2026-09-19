import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { Section } from "@/components/layout/Section";
import { Container } from "@/components/layout/Container";
import { Grid } from "@/components/layout/Grid";
import { SiteCard } from "@/components/SiteCard";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { GetStartedCTA } from "@/components/conversion/GetStartedCTA";
import { CTAButton } from "@/components/conversion/CTAButton";
import { SOLUTIONS } from "@/content/solutions";
import { isPublicSolutionId, SOLUTION_PAGES } from "@/content/solution-pages";
import { contactSearch } from "@/lib/search";
import { breadcrumbJsonLd, pageHead } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";

export const Route = createFileRoute("/solutions/$slug")({
  beforeLoad: ({ params }) => {
    if (!isPublicSolutionId(params.slug)) throw notFound();
  },
  head: ({ params }) => {
    if (!isPublicSolutionId(params.slug)) {
      return pageHead({
        title: "Solutions — LumenX",
        description: "LumenX solutions by audience.",
        path: "/solutions",
      });
    }
    const view = SOLUTIONS.find((item) => item.id === params.slug)!;
    const page = SOLUTION_PAGES[params.slug];
    return pageHead({
      path: `/solutions/${params.slug}`,
      title: `${view.title} — LumenX Solutions`,
      description: page.headline,
    });
  },
  component: SolutionDetailPage,
});

function SolutionDetailPage() {
  const { slug } = Route.useParams();
  if (!isPublicSolutionId(slug)) return null;
  const view = SOLUTIONS.find((item) => item.id === slug)!;
  const page = SOLUTION_PAGES[slug];
  const Icon = view.icon;

  return (
    <SiteShell>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Solutions", path: "/solutions" },
          { name: view.title, path: `/solutions/${slug}` },
        ])}
      />
      <Container className="pt-8">
        <Breadcrumbs
          items={[
            { label: "Home", to: "/" },
            { label: "Solutions", to: "/solutions" },
            { label: view.title },
          ]}
        />
      </Container>

      <Section
        headingAs="h1"
        eyebrow="Solutions"
        title={page.headline}
        lede={view.narrative}
      >
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <Icon className="size-6 text-foreground/70" aria-hidden />
          <p className="text-sm text-muted-foreground">{view.outcome}</p>
        </div>
        <CTAButton asChild>
          <Link to="/contact" search={contactSearch("demo")}>
            Book a Demo
          </Link>
        </CTAButton>
      </Section>

      <Section eyebrow="Workflow" title="How the work moves." tone="muted">
        <Grid columns={3} stagger>
          {page.workflow.map((step) => (
            <SiteCard key={step.title} quiet>
              <h2 className="text-base font-semibold tracking-tight">{step.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </SiteCard>
          ))}
        </Grid>
      </Section>

      <Section eyebrow="Capabilities" title="What this audience actually uses.">
        <ul className="grid gap-2 sm:grid-cols-2">
          {page.capabilities.map((item) => (
            <li key={item} className="flex gap-2 text-sm text-muted-foreground">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-foreground/35" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <ul className="mt-8 space-y-2 text-sm text-muted-foreground">
          {view.points.map((point) => (
            <li key={point} className="flex gap-2">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-foreground/35" aria-hidden />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </Section>

      <GetStartedCTA />
    </SiteShell>
  );
}
