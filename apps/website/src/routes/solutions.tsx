import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { Section } from "@/components/layout/Section";
import { ExploreNav } from "@/components/explore/ExploreNav";
import { SolutionsExplorer } from "@/components/explore/SolutionsExplorer";
import { GetStartedCTA } from "@/components/conversion/GetStartedCTA";
import { parseSolutionsSearch } from "@/lib/search";
import { SOLUTION_IDS, type SolutionId } from "@/content/solutions";
import { PAGE_SEO, pageHead } from "@/lib/seo";

export const Route = createFileRoute("/solutions")({
  validateSearch: parseSolutionsSearch,
  head: () => pageHead(PAGE_SEO.solutions),
  component: SolutionsPage,
});

function SolutionsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/solutions" });
  const role: SolutionId = search.role ?? SOLUTION_IDS[0];

  return (
    <SiteShell>
      <Section
        headingAs="h1"
        eyebrow="Solutions"
        title="What LumenX does — for each person who uses it."
        lede="The office writes the record in Admin. Families and teachers use Connect. Drivers run Transport. Applicants and candidates use Admissions and Careers. Groups get service quality through Nexus. Pick a view."
      >
        <ExploreNav active="/solutions" />
        <SolutionsExplorer
          role={role}
          onRoleChange={(id) => {
            navigate({ search: { role: id }, replace: true });
          }}
        />
      </Section>
      <GetStartedCTA
        title="See it in the products."
        body="Each solution maps to a real surface. Start a 60-day trial when the institute is ready."
      />
    </SiteShell>
  );
}
