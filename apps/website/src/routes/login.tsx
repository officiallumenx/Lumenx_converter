import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { Section } from "@/components/layout/Section";
import { SiteCard } from "@/components/SiteCard";
import { CTAButton } from "@/components/conversion/CTAButton";
import { getLoginAppLinks, type LoginCta } from "@/lib/login-apps";
import { contactSearch } from "@/lib/search";
import { PAGE_SEO, pageHead } from "@/lib/seo";

export const Route = createFileRoute("/login")({
  head: () => pageHead(PAGE_SEO.login),
  component: LoginPage,
});

function LoginCtaButton({
  cta,
  variant = "primary",
}: {
  cta: LoginCta;
  variant?: "primary" | "secondary";
}) {
  if (cta.kind === "internal") {
    return (
      <CTAButton asChild variant={variant} size="md">
        <Link to={cta.to} search={cta.search}>
          {cta.label}
        </Link>
      </CTAButton>
    );
  }

  return (
    <CTAButton asChild variant={variant} size="md">
      <a href={cta.href} target="_blank" rel="noopener noreferrer">
        {cta.label}
      </a>
    </CTAButton>
  );
}

function LoginPage() {
  const links = getLoginAppLinks();

  return (
    <SiteShell>
      <Section
        headingAs="h1"
        eyebrow="Login"
        title="Open the right LumenX app."
        lede="Connect and Transport open on Google Play. Admin goes to downloads. Admissions and Careers open as mobile web — with a Play Store link when you want the app. Your institute office issues login credentials — this site does not."
        narrow
      >
        {links.length === 0 ? (
          <SiteCard quiet>
            <h2 className="site-card-title">No public destinations yet</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Ask your institute office for access, or contact us if you are setting up a campus for the first time.
            </p>
            <div className="site-cta-row mt-6">
              <CTAButton asChild>
                <Link to="/get-started">Get Started</Link>
              </CTAButton>
              <CTAButton asChild variant="secondary">
                <Link to="/contact" search={contactSearch("question")}>
                  Contact us
                </Link>
              </CTAButton>
            </div>
          </SiteCard>
        ) : (
          <ul className="site-login-list">
            {links.map((app) => (
              <li key={app.id}>
                <SiteCard quiet product={app.id} className="site-login-card">
                  <div className="site-login-card__copy">
                    <h2 className="site-card-title">{app.name}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{app.note}</p>
                  </div>
                  <div className="site-cta-row site-cta-row--end">
                    <LoginCtaButton cta={app.primary} />
                    {app.secondary ? <LoginCtaButton cta={app.secondary} variant="secondary" /> : null}
                  </div>
                </SiteCard>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </SiteShell>
  );
}
