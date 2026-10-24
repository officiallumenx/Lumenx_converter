import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Section } from "../layout/Section";
import { Grid } from "../layout/Grid";
import { SiteCard } from "../SiteCard";
import { CTAButton } from "../conversion/CTAButton";
import { PLATFORM_CONNECTIONS } from "@/content/platform";

/**
 * How LumenX stays one connected platform — shared record, role doors, modules on demand.
 */
export function HomeEcosystem() {
  return (
    <Section
      id="ecosystem"
      align="center"
      eyebrow="Connected platform"
      title="One LumenX. Five surfaces that share one institute record."
      lede="Admin writes the source of truth. Connect is how families and staff use it. Transport, Admissions, and Careers turn on when the campus needs them — still part of the same platform."
      tone="muted"
    >
      <Grid columns={3} stagger>
        {PLATFORM_CONNECTIONS.map((item) => (
          <SiteCard key={item.title} quiet>
            <h3 className="site-card-title">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
          </SiteCard>
        ))}
      </Grid>

      <div className="mt-8">
        <CTAButton asChild variant="secondary">
          <Link to="/platform">
            Explore Platform
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </CTAButton>
      </div>
    </Section>
  );
}
