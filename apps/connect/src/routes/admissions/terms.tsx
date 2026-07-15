import { createFileRoute } from "@tanstack/react-router";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { ADMISSIONS_TERMS } from "@/lib/legal/lumenx-terms";

export const Route = createFileRoute("/admissions/terms")({
  head: () => ({ meta: [{ title: "Terms & Conditions — Admissions" }] }),
  component: AdmissionsTermsPage,
});

function AdmissionsTermsPage() {
  return (
    <LegalDocumentPage
      document={ADMISSIONS_TERMS}
      backTo="/admissions/signup"
      backLabel="Back to sign up"
    />
  );
}
