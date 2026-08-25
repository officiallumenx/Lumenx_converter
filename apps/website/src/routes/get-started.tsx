import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { Section } from "@/components/layout/Section";
import { ConversionNav } from "@/components/conversion/ConversionNav";
import { GetStartedFlow } from "@/components/conversion/GetStartedFlow";
import { parseGetStartedSearch } from "@/lib/search";
import {
  GET_STARTED_INTERESTS,
  type GetStartedInterestId,
  type GetStartedStep,
} from "@/content/get-started";
import { PAGE_SEO, pageHead } from "@/lib/seo";

export const Route = createFileRoute("/get-started")({
  validateSearch: parseGetStartedSearch,
  head: () => pageHead(PAGE_SEO.getStarted),
  component: GetStartedPage,
});

function GetStartedPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/get-started" });
  const interest = search.interest;
  const step: GetStartedStep = search.step ?? (interest ? "choose" : "explore");

  function go(next: { step?: GetStartedStep; interest?: GetStartedInterestId }) {
    navigate({
      search: {
        step: next.step ?? step,
        interest: next.interest ?? interest,
      },
      replace: true,
    });
  }

  return (
    <SiteShell>
      <Section
        headingAs="h1"
        eyebrow="Get started"
        title="Explore first. Decide when you’re ready."
        lede="Choose what you want to look at. Then try a mock demo, start a 60-day trial, or request a quote. Nothing is sent until you pick one of those paths."
      >
        <ConversionNav active="/get-started" />
        <GetStartedFlow
          step={step}
          interest={interest}
          onStepChange={(id) => go({ step: id })}
          onInterestChange={(id) => {
            const item = GET_STARTED_INTERESTS.find((entry) => entry.id === id);
            go({ step: "choose", interest: item?.id ?? id });
          }}
        />
      </Section>
    </SiteShell>
  );
}
