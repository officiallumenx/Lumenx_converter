import { createFileRoute } from "@tanstack/react-router";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { CAREERS_PRIVACY } from "@/lib/legal/lumenx-privacy";

export const Route = createFileRoute("/careers/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy — Careers" }] }),
  component: CareersPrivacyPage,
});

function CareersPrivacyPage() {
  return (
    <LegalDocumentPage
      document={CAREERS_PRIVACY}
      backTo="/careers/signup"
      backLabel="Back to sign up"
    />
  );
}
