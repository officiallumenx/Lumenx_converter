import { createFileRoute } from "@tanstack/react-router";
import { ADMIN_TERMS } from "@lumenx/legal";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms & Conditions — LumenX Admin" }] }),
  component: AdminTermsPage,
});

function AdminTermsPage() {
  return <LegalDocumentPage document={ADMIN_TERMS} backTo="/signup" backLabel="Back to sign up" />;
}
