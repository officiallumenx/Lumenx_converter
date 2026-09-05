import { createFileRoute } from "@tanstack/react-router";
import { COOKIE_POLICY } from "@lumenx/legal";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";

export const Route = createFileRoute("/cookies")({
  head: () => ({ meta: [{ title: "Cookie Policy — LumenX Admin" }] }),
  component: AdminCookiesPage,
});

function AdminCookiesPage() {
  return (
    <LegalDocumentPage document={COOKIE_POLICY} backTo="/signup" backLabel="Back to sign up" />
  );
}
