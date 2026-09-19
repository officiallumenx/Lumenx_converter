import { createFileRoute } from "@tanstack/react-router";
import { PLATFORM_PRIVACY } from "@lumenx/legal";
import { LegalDocumentView } from "@/components/legal/LegalDocumentView";
import { PAGE_SEO, pageHead } from "@/lib/seo";

export const Route = createFileRoute("/privacy")({
  head: () => pageHead(PAGE_SEO.privacy),
  component: PrivacyPage,
});

function PrivacyPage() {
  return <LegalDocumentView document={PLATFORM_PRIVACY} />;
}
