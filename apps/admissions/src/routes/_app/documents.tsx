import { createFileRoute } from "@tanstack/react-router";
import { RequireParentAuth } from "@/admissions-portal/core/guards";
import { DocumentCenterPage } from "@/admissions-portal/features/support/SupportPages";

export const Route = createFileRoute("/_app/documents")({
  head: () => ({ meta: [{ title: "Documents — Admissions" }] }),
  component: DocumentsRoute,
});

function DocumentsRoute() {
  return (
    <RequireParentAuth>
      <DocumentCenterPage />
    </RequireParentAuth>
  );
}
