import { useEffect, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { Section } from "@/components/layout/Section";
import { ExploreNav } from "@/components/explore/ExploreNav";
import { FeaturesCatalog } from "@/components/explore/FeaturesCatalog";
import { GetStartedCTA } from "@/components/conversion/GetStartedCTA";
import { CTAButton } from "@/components/conversion/CTAButton";
import { parseFeaturesSearch } from "@/lib/search";
import { FEATURE_GROUP_IDS, type FeatureGroupId } from "@/content/features";
import { PAGE_SEO, pageHead } from "@/lib/seo";

export const Route = createFileRoute("/features")({
  validateSearch: parseFeaturesSearch,
  head: () => pageHead(PAGE_SEO.features),
  component: FeaturesPage,
});

function FeaturesPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/features" });
  const group: FeatureGroupId = search.group ?? FEATURE_GROUP_IDS[0];
  const didMount = useRef(false);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      if (!search.group) return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(`feature-${group}`)?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  }, [group, search.group]);

  return (
    <SiteShell>
      <Section
        headingAs="h1"
        eyebrow="Features"
        title="The work the platform covers — grouped, not a wall of names."
        lede="Eight categories. Each item is something Admin, Connect, Transport, Admissions, Careers, or Nexus already does. Modules switch on per institute. Billing stays per student."
      >
        <ExploreNav active="/features" />
        <FeaturesCatalog
          group={group}
          onGroupChange={(id) => {
            navigate({ search: { group: id }, replace: true });
          }}
        />
      </Section>
      <GetStartedCTA
        title="Want to see a flow, not a list?"
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
