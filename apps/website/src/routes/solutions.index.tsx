import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { Section } from "@/components/layout/Section";
import { Grid } from "@/components/layout/Grid";
import { SiteCard } from "@/components/SiteCard";
import { GetStartedCTA } from "@/components/conversion/GetStartedCTA";
import { CTAButton } from "@/components/conversion/CTAButton";
import { SOLUTIONS } from "@/content/solutions";
import {
  isPublicSolutionId,
  PUBLIC_SOLUTION_IDS,
  SOLUTION_PAGES,
} from "@/content/solution-pages";
import { contactSearch, parseSolutionsSearch } from "@/lib/search";
import { PAGE_SEO, pageHead } from "@/lib/seo";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/solutions/")({
  validateSearch: parseSolutionsSearch,
  beforeLoad: ({ search }) => {
    if (search.role && isPublicSolutionId(search.role)) {
      throw redirect({
        to: "/solutions/$slug",
        params: { slug: search.role },
      });
    }
  },
  head: () => pageHead(PAGE_SEO.solutions),
  component: SolutionsIndexPage,
});

function SolutionsIndexPage() {
  const publicSolutions = PUBLIC_SOLUTION_IDS.map((id) => {
    const view = SOLUTIONS.find((item) => item.id === id)!;
    const page = SOLUTION_PAGES[id];
    return { view, page };
  });

  return (
    <SiteShell>
      <Section
        headingAs="h1"
        eyebrow="Solutions"
        title="What LumenX does — for each person who uses it."
        lede="Pick the audience that matches your day. Each page stays honest about which product they open and what they see."
      >
        <div className="mb-8">
          <CTAButton asChild>
            <Link to="/contact" search={contactSearch("demo")}>
              Book a Demo
            </Link>
          </CTAButton>
        </div>
        <Grid columns={3} stagger>
          {publicSolutions.map(({ view, page }) => {
            const Icon = view.icon;
            return (
              <SiteCard key={view.id} product={view.product}>
                <Icon className="size-5 text-foreground/70" aria-hidden />
                <h2 className="mt-4 text-base font-semibold tracking-tight">{view.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{page.headline}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{view.outcome}</p>
                <Link
                  to="/solutions/$slug"
                  params={{ slug: view.id }}
                  className="site-btn site-btn--ghost mt-4 h-auto justify-start px-0 text-foreground"
                >
                  View solution
                  <ArrowRight className="size-4" />
                </Link>
              </SiteCard>
            );
          })}
        </Grid>
      </Section>
      <GetStartedCTA />
    </SiteShell>
  );
}
