import { createFileRoute } from "@tanstack/react-router";
import { PLATFORM_TERMS } from "@lumenx/legal";
import { LegalDocumentView } from "@/components/legal/LegalDocumentView";
import { PAGE_SEO, pageHead } from "@/lib/seo";

export const Route = createFileRoute("/terms")({
  head: () => pageHead(PAGE_SEO.terms),
  component: TermsPage,
});

function TermsPage() {
  return <LegalDocumentView document={PLATFORM_TERMS} />;
}
