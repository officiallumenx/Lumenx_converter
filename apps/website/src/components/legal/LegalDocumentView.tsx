import { Link } from "@tanstack/react-router";
import type { LegalDocument } from "@lumenx/legal";
import { SiteShell } from "../SiteShell";
import { Container } from "../layout/Container";

export function LegalDocumentView({
  document,
  backTo = "/",
  backLabel = "Back home",
}: {
  document: LegalDocument;
  backTo?: string;
  backLabel?: string;
}) {
  return (
    <SiteShell>
      <Container narrow className="py-10 pb-16">
        <Link to={backTo} className="site-footer-link mb-6 w-auto text-sm">
          ← {backLabel}
        </Link>
        <header className="space-y-2 border-b border-border pb-6">
          <h1 className="site-section-title text-3xl">{document.title}</h1>
          <p className="text-sm text-muted-foreground">Last updated: {document.lastUpdated}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{document.intro}</p>
        </header>
        <div className="mt-8 space-y-8">
          {document.sections.map((section) => (
            <section key={section.title} className="space-y-3">
              <h2 className="text-lg font-semibold tracking-tight">{section.title}</h2>
              <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph.slice(0, 72)}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </Container>
    </SiteShell>
  );
}
