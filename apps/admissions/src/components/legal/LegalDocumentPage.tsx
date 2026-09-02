import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { LegalDocument } from "@/lib/legal/types";

type LegalDocumentPageProps = {
  document: LegalDocument;
  backTo: string;
  backLabel?: string;
};

export function LegalDocumentPage({ document, backTo, backLabel = "Back" }: LegalDocumentPageProps) {
  return (
    <div className="mx-auto max-w-3xl animate-in fade-in duration-300 pb-12">
      <Link
        to={backTo}
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        {backLabel}
      </Link>

      <header className="space-y-2 border-b border-border pb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight">{document.title}</h1>
        <p className="text-sm text-muted-foreground">Last updated: {document.lastUpdated}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{document.intro}</p>
      </header>

      <div className="mt-8 space-y-8">
        {document.sections.map((section) => (
          <section key={section.title} className="space-y-3">
            <h2 className="font-display text-lg font-semibold">{section.title}</h2>
            <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 48)}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
