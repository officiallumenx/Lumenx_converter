import { createFileRoute } from "@tanstack/react-router";
import { ADMIN_PRIVACY } from "@lumenx/legal";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy — LumenX Admin" }] }),
  component: AdminPrivacyPage,
});

function AdminPrivacyPage() {
  return (
    <LegalDocumentPage document={ADMIN_PRIVACY} backTo="/signup" backLabel="Back to sign up" />
  );
}
