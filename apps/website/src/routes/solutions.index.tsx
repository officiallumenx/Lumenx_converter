import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { Container } from "@/components/layout/Container";
import { GetStartedCTA } from "@/components/conversion/GetStartedCTA";
import { CTAButton } from "@/components/conversion/CTAButton";
import {
  SolutionsExplorer,
  type SolutionsCatalogTab,
} from "@/components/explore/SolutionsExplorer";
import { isPublicSolutionId } from "@/content/solution-pages";
import { contactSearch, parseSolutionsSearch } from "@/lib/search";
import { PAGE_SEO, pageHead } from "@/lib/seo";

export const Route = createFileRoute("/solutions/")({
  validateSearch: parseSolutionsSearch,
  head: () => pageHead(PAGE_SEO.solutions),
  component: SolutionsIndexPage,
});

function SolutionsIndexPage() {
  const navigate = useNavigate({ from: "/solutions/" });
  const search = Route.useSearch();
  const initial: SolutionsCatalogTab =
    search.role && isPublicSolutionId(search.role) ? search.role : "all";
  const [role, setRole] = useState<SolutionsCatalogTab>(initial);

  useEffect(() => {
    const next: SolutionsCatalogTab =
      search.role && isPublicSolutionId(search.role) ? search.role : "all";
    setRole(next);
    if (next !== "all") {
      const id = window.setTimeout(() => {
        document.getElementById(`solution-${next}`)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 50);
      return () => window.clearTimeout(id);
    }
  }, [search.role]);

  function onRoleChange(id: SolutionsCatalogTab) {
    setRole(id);
    void navigate({
      search: id === "all" || !isPublicSolutionId(id) ? {} : { role: id },
      replace: true,
    });
  }

  return (
    <SiteShell>
      <section className="site-section site-section--flush">
        <Container>
          <h1 className="sr-only">
            LumenX solutions — institutions, administrators, teachers, parents, students, and drivers
          </h1>
          <SolutionsExplorer role={role} onRoleChange={onRoleChange} />
          <div className="mt-8 flex flex-wrap gap-3">
            <CTAButton asChild>
              <Link to="/contact" search={contactSearch("demo")}>
                Book a Demo
              </Link>
            </CTAButton>
          </div>
        </Container>
      </section>
      <GetStartedCTA />
    </SiteShell>
  );
}
