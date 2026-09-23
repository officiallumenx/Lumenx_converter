import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { Container } from "@/components/layout/Container";
import { GetStartedCTA } from "@/components/conversion/GetStartedCTA";
import { CTAButton } from "@/components/conversion/CTAButton";
import {
  ModulesCatalog,
  type ModulesCatalogTab,
} from "@/components/explore/ModulesCatalog";
import { isModuleSectionId } from "@/content/modules";
import { PAGE_SEO, pageHead } from "@/lib/seo";
import { parseModulesSearch } from "@/lib/search";
import { contactSearch } from "@/lib/search";

export const Route = createFileRoute("/modules/")({
  validateSearch: parseModulesSearch,
  head: () => pageHead(PAGE_SEO.modules),
  component: ModulesIndexPage,
});

function ModulesIndexPage() {
  const navigate = useNavigate({ from: "/modules/" });
  const search = Route.useSearch();
  const [query, setQuery] = useState("");
  const [section, setSection] = useState<ModulesCatalogTab>(search.section ?? "all");

  useEffect(() => {
    const next = search.section ?? "all";
    setSection(next);
    if (next !== "all") {
      const id = window.setTimeout(() => {
        document.getElementById(`module-${next}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
      return () => window.clearTimeout(id);
    }
  }, [search.section]);

  function onSectionChange(id: ModulesCatalogTab) {
    setSection(id);
    void navigate({
      search: id === "all" || !isModuleSectionId(id) ? {} : { section: id },
      replace: true,
    });
  }

  return (
    <SiteShell>
      <section className="site-section site-section--flush">
        <Container>
          <h1 className="sr-only">LumenX modules — Admin, Connect, Transport, Admissions, and Careers</h1>
          <ModulesCatalog
            section={section}
            onSectionChange={onSectionChange}
            query={query}
            onQueryChange={setQuery}
          />
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
