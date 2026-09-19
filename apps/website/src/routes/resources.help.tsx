import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { Section } from "@/components/layout/Section";
import { SiteCard } from "@/components/SiteCard";
import { GetStartedCTA } from "@/components/conversion/GetStartedCTA";
import { CTAButton } from "@/components/conversion/CTAButton";
import { HELP_CATEGORIES } from "@/content/resources";
import { contactSearch } from "@/lib/search";
import { PAGE_SEO, pageHead } from "@/lib/seo";

export const Route = createFileRoute("/resources/help")({
  head: () => pageHead(PAGE_SEO.help),
  component: ResourcesHelpPage,
});

function ResourcesHelpPage() {
  return (
    <SiteShell>
      <Section
        headingAs="h1"
        eyebrow="Help"
        title="Help Center"
        lede="Practical guidance for getting started, each public product, and privacy — based on how LumenX works today."
      >
        <div className="mb-8 flex flex-wrap gap-3">
          <CTAButton asChild>
            <Link to="/contact" search={contactSearch("demo")}>
              Book a Demo
            </Link>
          </CTAButton>
          <CTAButton asChild variant="secondary">
            <Link to="/get-started">Get Started</Link>
          </CTAButton>
        </div>

        <div className="space-y-10">
          {HELP_CATEGORIES.map((category) => (
            <section key={category.id} aria-labelledby={`help-${category.id}`}>
              <h2 id={`help-${category.id}`} className="site-card-title">
                {category.title}
              </h2>
              <div className="mt-4 grid gap-3">
                {category.items.map((item) => (
                  <SiteCard key={item.title} quiet>
                    <h3 className="text-sm font-semibold tracking-tight">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                  </SiteCard>
                ))}
              </div>
            </section>
          ))}
        </div>
      </Section>
      <GetStartedCTA />
    </SiteShell>
  );
}
