import { createFileRoute } from "@tanstack/react-router";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { CAREERS_PRIVACY } from "@/lib/legal/lumenx-privacy";

export const Route = createFileRoute("/_app/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy — Careers" }] }),
  component: CareersPrivacyPage,
});

function CareersPrivacyPage() {
  return (
    <LegalDocumentPage
      document={CAREERS_PRIVACY}
      backTo="/signup"
      backLabel="Back to sign up"
    />
  );
}
