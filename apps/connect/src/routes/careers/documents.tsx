import { createFileRoute } from "@tanstack/react-router";
import { RequireJobSeekerAuth } from "@/careers-portal/core/guards";
import { DocumentsPage } from "@/careers-portal/features/support/SupportPages";

export const Route = createFileRoute("/careers/documents")({
  head: () => ({ meta: [{ title: "Documents — Careers" }] }),
  component: DocumentsRoute,
});

function DocumentsRoute() {
  return (
    <RequireJobSeekerAuth>
      <DocumentsPage />
    </RequireJobSeekerAuth>
  );
}
