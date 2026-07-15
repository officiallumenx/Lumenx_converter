import { createFileRoute } from "@tanstack/react-router";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { CAREERS_TERMS } from "@/lib/legal/lumenx-terms";

export const Route = createFileRoute("/careers/terms")({
  head: () => ({ meta: [{ title: "Terms & Conditions — Careers" }] }),
  component: CareersTermsPage,
});

function CareersTermsPage() {
  return (
    <LegalDocumentPage
      document={CAREERS_TERMS}
      backTo="/careers/signup"
      backLabel="Back to sign up"
    />
  );
}
