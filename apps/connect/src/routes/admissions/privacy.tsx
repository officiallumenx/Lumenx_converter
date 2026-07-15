import { createFileRoute } from "@tanstack/react-router";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { ADMISSIONS_PRIVACY } from "@/lib/legal/lumenx-privacy";

export const Route = createFileRoute("/admissions/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy — Admissions" }] }),
  component: AdmissionsPrivacyPage,
});

function AdmissionsPrivacyPage() {
  return (
    <LegalDocumentPage
      document={ADMISSIONS_PRIVACY}
      backTo="/admissions/signup"
      backLabel="Back to sign up"
    />
  );
}
