import { createFileRoute } from "@tanstack/react-router";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { CONNECT_PRIVACY } from "@/lib/legal/lumenx-privacy";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy — LumenX Connect" }] }),
  component: ConnectPrivacyPage,
});

function ConnectPrivacyPage() {
  return (
    <LegalDocumentPage document={CONNECT_PRIVACY} backTo="/login" backLabel="Back to sign in" />
  );
}
