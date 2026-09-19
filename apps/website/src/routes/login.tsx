import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { Section } from "@/components/layout/Section";
import { SiteCard } from "@/components/SiteCard";
import { CTAButton } from "@/components/conversion/CTAButton";
import { getLoginAppLinks } from "@/lib/login-apps";
import { contactSearch } from "@/lib/search";
import { PAGE_SEO, pageHead } from "@/lib/seo";

export const Route = createFileRoute("/login")({
  head: () => pageHead(PAGE_SEO.login),
  component: LoginPage,
});

function LoginPage() {
  const links = getLoginAppLinks();

  return (
    <SiteShell>
      <Section
        headingAs="h1"
        eyebrow="Login"
        title="Open the live apps when they are public."
        lede="This marketing site does not issue passwords. Your institute office creates accounts for Admin, Connect, Transport, Admissions, and Careers."
        narrow
      >
        {links.length === 0 ? (
          <SiteCard quiet>
            <h2 className="text-base font-semibold tracking-tight">No public app origins configured yet</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Web login links appear here only when a real public origin is configured. Until then, ask your institute
              office for access, or contact us if you are setting up a campus for the first time.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <CTAButton asChild>
                <Link to="/get-started">
                  Get Started
                </Link>
              </CTAButton>
              <CTAButton asChild variant="secondary">
                <Link to="/contact" search={contactSearch("question")}>
                  Contact us
                </Link>
              </CTAButton>
            </div>
          </SiteCard>
        ) : (
          <ul className="space-y-4">
            {links.map((app) => (
              <li key={app.id}>
                <SiteCard quiet>
                  <h2 className="text-base font-semibold tracking-tight">{app.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{app.note}</p>
                  <a
                    href={app.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="site-btn site-btn--primary mt-4 inline-flex"
                  >
                    Open {app.name}
                  </a>
                </SiteCard>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </SiteShell>
  );
}
