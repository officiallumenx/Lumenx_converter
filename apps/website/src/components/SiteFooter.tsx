import { Link } from "@tanstack/react-router";
import {
  FOOTER_COMPANY,
  FOOTER_LEGAL,
  FOOTER_PLATFORM,
  FOOTER_RESOURCES,
  FOOTER_SOLUTIONS,
  SITE_TAGLINE,
} from "@/content/nav";
import { contactSearch } from "@/lib/search";
import { SiteLogo } from "./SiteLogo";
import { Container } from "./layout/Container";
import { CTAButton } from "./conversion/CTAButton";

export function SiteFooter() {
  return (
    <footer className="border-t bg-[color-mix(in_oklch,var(--card)_88%,var(--site-brand-soft))]">
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-6">
        <div className="sm:col-span-2 lg:col-span-2">
          <Link to="/" aria-label="LumenX home" className="inline-flex min-h-11 min-w-11 items-center rounded-md">
            <SiteLogo />
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            {SITE_TAGLINE} for modern educational institutions.
          </p>
          <CTAButton asChild className="mt-6">
            <Link to="/contact" search={contactSearch("demo")}>
              Book a Demo
            </Link>
          </CTAButton>
        </div>
        <FooterColumn title="Platform" links={FOOTER_PLATFORM} />
        <FooterColumn title="Solutions" links={FOOTER_SOLUTIONS} />
        <FooterColumn title="Resources" links={FOOTER_RESOURCES} />
        <div className="space-y-8">
          <FooterColumn title="Company" links={FOOTER_COMPANY} />
          <FooterColumn title="Legal" links={FOOTER_LEGAL} />
        </div>
      </Container>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        <Container>© {new Date().getFullYear()} LumenX</Container>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: readonly { to: string; label: string; search?: Record<string, string> }[];
}) {
  return (
    <div>
      <h2 className="site-kicker">{title}</h2>
      <ul className="mt-3 space-y-1">
        {links.map((link) => (
          <li key={`${link.to}-${link.label}`}>
            <Link to={link.to} search={link.search} className="site-footer-link">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
