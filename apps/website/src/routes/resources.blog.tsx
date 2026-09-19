import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { Section } from "@/components/layout/Section";
import { SiteCard } from "@/components/SiteCard";
import { GetStartedCTA } from "@/components/conversion/GetStartedCTA";
import { CTAButton } from "@/components/conversion/CTAButton";
import { BLOG_EMPTY } from "@/content/resources";
import { PAGE_SEO, pageHead } from "@/lib/seo";

export const Route = createFileRoute("/resources/blog")({
  head: () => pageHead(PAGE_SEO.blog),
  component: ResourcesBlogPage,
});

function ResourcesBlogPage() {
  return (
    <SiteShell>
      <Section headingAs="h1" eyebrow="Resources" title={BLOG_EMPTY.title} lede={BLOG_EMPTY.lede}>
        <SiteCard quiet className="max-w-2xl">
          <p className="text-sm leading-relaxed text-muted-foreground" role="status">
            There are no published articles yet. When we share product notes or platform updates, they will appear here.
            We do not invent posts to fill this page.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <CTAButton asChild variant="secondary">
              <Link to="/resources">Back to resources</Link>
            </CTAButton>
            <CTAButton asChild variant="ghost">
              <Link to="/resources/faq">Read FAQs</Link>
            </CTAButton>
          </div>
        </SiteCard>
      </Section>
      <GetStartedCTA />
    </SiteShell>
  );
}
