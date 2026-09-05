import { createFileRoute } from "@tanstack/react-router";
import { COOKIE_POLICY } from "@lumenx/legal";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";

export const Route = createFileRoute("/_app/cookies")({
  head: () => ({ meta: [{ title: "Cookie Policy — Admissions" }] }),
  component: AdmissionsCookiesPage,
});

function AdmissionsCookiesPage() {
  return (
    <LegalDocumentPage
      document={COOKIE_POLICY}
      backTo="/signup"
      backLabel="Back to sign up"
    />
  );
}
