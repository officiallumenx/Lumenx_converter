import { Link } from "@tanstack/react-router";
import { Section } from "../layout/Section";
import { Grid } from "../layout/Grid";
import { FeatureCard } from "../content/FeatureCard";
import { CTAButton } from "../conversion/CTAButton";
import { HOME_FEATURE_GROUPS } from "@/content/home";

export function HomeFeatures() {
  return (
    <Section
      id="capabilities"
      eyebrow="Capabilities"
      title="Grouped by the work, not a feature dump."
      lede="A short map of what the ecosystem covers. Each group is a few real capabilities — not a wall of names."
    >
      <Grid columns={2} stagger>
        {HOME_FEATURE_GROUPS.map((group) => (
          <article key={group.id} className="site-card site-card--quiet">
            <h3 className="text-lg font-semibold tracking-tight">{group.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{group.lede}</p>
            <div className="mt-4 grid gap-2">
              {group.items.map((item) => (
                <FeatureCard key={item.name} title={item.name}>
                  <p>{item.blurb}</p>
                  <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em]">{item.surfaces}</p>
                </FeatureCard>
              ))}
            </div>
          </article>
        ))}
      </Grid>
      <div className="mt-8">
        <CTAButton asChild variant="secondary">
          <Link to="/features" search={{}}>
            See the full capability map
          </Link>
        </CTAButton>
      </div>
    </Section>
  );
}
