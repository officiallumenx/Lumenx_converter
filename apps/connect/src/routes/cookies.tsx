import { createFileRoute } from "@tanstack/react-router";
import { COOKIE_POLICY } from "@lumenx/legal";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";

export const Route = createFileRoute("/cookies")({
  head: () => ({ meta: [{ title: "Cookie Policy — LumenX Connect" }] }),
  component: ConnectCookiesPage,
});

function ConnectCookiesPage() {
  return (
    <LegalDocumentPage document={COOKIE_POLICY} backTo="/login" backLabel="Back to sign in" />
  );
}
