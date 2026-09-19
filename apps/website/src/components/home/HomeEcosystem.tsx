import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Section } from "../layout/Section";
import { ProductMark } from "../product/ProductMark";
import { Grid } from "../layout/Grid";
import { SiteCard } from "../SiteCard";
import { CTAButton } from "../conversion/CTAButton";
import { PLATFORM_PRODUCTS } from "@/content/platform";

/**
 * Connected-platform story for the homepage.
 * Public surfaces only — Nexus is intentionally excluded.
 */
export function HomeEcosystem() {
  return (
    <Section
      id="ecosystem"
      eyebrow="Connected platform"
      title="One LumenX. Five surfaces that share one institute record."
      lede="Admin writes the source of truth. Connect is how families and staff use it. Transport, Admissions, and Careers turn on when the campus needs them — still part of the same platform."
      tone="muted"
    >
      <div className="site-platform-tree" aria-label="How LumenX products connect">
        <div className="site-platform-tree__hub">
          <p className="site-platform-tree__brand">LumenX</p>
          <p className="site-platform-tree__tag">One connected institute platform</p>
        </div>
        <div className="site-platform-tree__spine" aria-hidden />
        <ul className="site-platform-tree__row">
          {PLATFORM_PRODUCTS.map((product) => (
            <li key={product.id}>
              <Link
                to="/platform/$slug"
                params={{ slug: product.id }}
                className="site-platform-tree__node"
                data-product={product.id}
              >
                <ProductMark product={product.id} size="sm" />
                <span className="min-w-0">
                  <span className="site-platform-tree__name">{product.name}</span>
                  <span className="site-platform-tree__role">{product.role}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <Grid columns={3} stagger className="mt-10">
        {[
          {
            title: "One institute record",
            body: "People, classes, and fees are written once in Admin. The other surfaces read what they are allowed to see.",
          },
          {
            title: "Role-appropriate doors",
            body: "Parents, teachers, and students open Connect. Drivers open Transport. Applicants and candidates use Admissions and Careers.",
          },
          {
            title: "Modules when you need them",
            body: "Most campuses start with Admin and Connect. Transport, Admissions, and Careers enable without a separate product stack.",
          },
        ].map((item) => (
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
