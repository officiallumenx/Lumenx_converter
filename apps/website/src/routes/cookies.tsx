import { createFileRoute } from "@tanstack/react-router";
import { COOKIE_POLICY } from "@lumenx/legal";
import { LegalDocumentView } from "@/components/legal/LegalDocumentView";
import { PAGE_SEO, pageHead } from "@/lib/seo";

export const Route = createFileRoute("/cookies")({
  head: () => pageHead(PAGE_SEO.cookies),
  component: CookiesPage,
});

function CookiesPage() {
  return <LegalDocumentView document={COOKIE_POLICY} />;
}
