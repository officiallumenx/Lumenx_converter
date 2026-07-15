import { createFileRoute } from "@tanstack/react-router";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { CONNECT_TERMS } from "@/lib/legal/lumenx-terms";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms & Conditions — LumenX Connect" }] }),
  component: ConnectTermsPage,
});

function ConnectTermsPage() {
  return <LegalDocumentPage document={CONNECT_TERMS} backTo="/login" backLabel="Back to sign in" />;
}
