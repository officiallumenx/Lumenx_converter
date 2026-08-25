import { Link } from "@tanstack/react-router";
import { PRODUCT_FAMILY_LIST } from "@/theme/products";
import { NAV_LINKS } from "@/content/nav";
import { contactSearch } from "@/lib/search";
import { SiteLogo } from "./SiteLogo";
import { Container } from "./layout/Container";

export function SiteFooter() {
  return (
    <footer className="border-t bg-[color-mix(in_oklch,var(--card)_88%,var(--site-brand-soft))]">
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <Link to="/" aria-label="LumenX home" className="inline-flex min-h-11 min-w-11 items-center rounded-md">
            <SiteLogo />
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Institute operations, families, and transport — one platform.
          </p>
        </div>
        <div>
          <h2 className="site-kicker">Products</h2>
          <ul className="mt-3 space-y-2">
            {PRODUCT_FAMILY_LIST.map((p) => (
              <li key={p.id}>
                <Link to="/products/$slug" params={{ slug: p.id }} className="site-footer-link">
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="site-kicker">Explore</h2>
          <ul className="mt-3 space-y-2">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="site-footer-link">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="site-kicker">Start</h2>
          <ul className="mt-3 space-y-2">
            <li>
              <Link to="/get-started" search={{}} className="site-footer-link">
                Get started
              </Link>
            </li>
            <li>
              <Link to="/contact" search={contactSearch("question")} className="site-footer-link">
                Leave a message
              </Link>
            </li>
            <li>
              <Link to="/contact" search={contactSearch("trial")} className="site-footer-link">
                60-day trial
              </Link>
            </li>
            <li>
              <Link to="/pricing" search={{}} className="site-footer-link">
                Pricing calculator
              </Link>
            </li>
            <li>
              <Link to="/contact" search={contactSearch("quote")} className="site-footer-link">
                Request a quote
              </Link>
            </li>
          </ul>
        </div>
      </Container>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        <Container>© {new Date().getFullYear()} LumenX</Container>
      </div>
    </footer>
  );
}
