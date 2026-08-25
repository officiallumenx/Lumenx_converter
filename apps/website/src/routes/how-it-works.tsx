import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { Section } from "@/components/layout/Section";
import { ExploreNav } from "@/components/explore/ExploreNav";
import { HowItWorksVisual } from "@/components/explore/HowItWorksVisual";
import { GetStartedCTA } from "@/components/conversion/GetStartedCTA";
import { parseHowItWorksSearch } from "@/lib/search";
import { HOW_COMPARE, HOW_STEP_IDS, type HowStepId } from "@/content/how-it-works";
import { PAGE_SEO, pageHead } from "@/lib/seo";

export const Route = createFileRoute("/how-it-works")({
  validateSearch: parseHowItWorksSearch,
  head: () => pageHead(PAGE_SEO.howItWorks),
  component: HowItWorksPage,
});

function HowItWorksPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/how-it-works" });
  const step: HowStepId = search.step ?? HOW_STEP_IDS[0];

  return (
    <SiteShell>
      <Section
        headingAs="h1"
        eyebrow="How it works"
        title="One institute record. The right product does the work."
        lede="LumenX is not six islands. The institute is the tenant. Admin writes the source of truth. Academic operations run on that record. Connect is how people use it. Transport, Admissions, and Careers switch on. Nexus is the service platform — licensing, support, and feedback."
      >
        <ExploreNav active="/how-it-works" />
        <HowItWorksVisual
          step={step}
          onStepChange={(id) => {
            navigate({ search: { step: id }, replace: true });
          }}
        />
      </Section>
      <Section
        eyebrow="Before / with LumenX"
        title="The same jobs. A shared record."
        lede="We do not name competitors. This is what changes when the institute runs on one platform."
        tone="muted"
      >
        <div className="how-compare">
          <div className="how-compare__head">
            <p>Before</p>
            <p>With LumenX</p>
          </div>
          {HOW_COMPARE.map((row) => (
            <div key={row.before} className="how-compare__row">
              <p>{row.before}</p>
              <p>{row.after}</p>
            </div>
          ))}
        </div>
      </Section>
      <GetStartedCTA
        title="Ready to run it."
        body="Register the institute, complete verification, and use a full 60-day trial."
      />
    </SiteShell>
  );
}
