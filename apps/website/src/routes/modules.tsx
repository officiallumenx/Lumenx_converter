import { useEffect, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { Section } from "@/components/layout/Section";
import { ExploreNav } from "@/components/explore/ExploreNav";
import { ModulesCatalog } from "@/components/explore/ModulesCatalog";
import { GetStartedCTA } from "@/components/conversion/GetStartedCTA";
import { CTAButton } from "@/components/conversion/CTAButton";
import { parseModulesSearch } from "@/lib/search";
import { MODULE_SECTION_IDS, type ModuleSectionId } from "@/content/modules";
import { PAGE_SEO, pageHead } from "@/lib/seo";

export const Route = createFileRoute("/modules")({
  validateSearch: parseModulesSearch,
  head: () => pageHead(PAGE_SEO.modules),
  component: ModulesPage,
});

function ModulesPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/modules" });
  const section: ModuleSectionId = search.section ?? MODULE_SECTION_IDS[0];
  const didMount = useRef(false);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      if (!search.section) return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(`module-${section}`)?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  }, [section, search.section]);

  return (
    <SiteShell>
      <Section
        headingAs="h1"
        eyebrow="Modules"
        title="Every module by app — Admin, Connect, Transport, Admissions, and Careers."
        lede="Browse the real module inventory used in each product. Connect is split into Parent, Teacher, and Student. Nexus service tooling is not listed here — it is not a school module set."
      >
        <ExploreNav active="/modules" />
        <ModulesCatalog
          section={section}
          onSectionChange={(id) => {
            navigate({ search: { section: id }, replace: true });
          }}
        />
      </Section>
      <GetStartedCTA
        title="Prefer a flow over a catalog?"
        body="Demos walk through attendance, transport, fees, notifications, and admissions with mock data."
        secondary={
          <CTAButton asChild variant="on-ink">
            <Link to="/demo">Open demo</Link>
          </CTAButton>
        }
      />
    </SiteShell>
  );
}
