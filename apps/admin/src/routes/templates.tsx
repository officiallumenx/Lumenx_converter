import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PublishedCertificateCatalogView } from "@/components/templates/views/PublishedCertificateCatalogView";

export const Route = createFileRoute("/templates")({
  head: () => ({ meta: [{ title: "Certificates — LumenX Admin" }] }),
  validateSearch: (search: Record<string, unknown>): {
    view?: string;
    templateId?: string;
  } => {
    // Keep legacy query keys harmless so old bookmarks still open this module.
    const out: { view?: string; templateId?: string } = {};
    if (typeof search.view === "string") out.view = search.view;
    if (typeof search.templateId === "string") out.templateId = search.templateId;
    return out;
  },
  component: CertificatesPage,
});

function CertificatesPage() {
  return (
    <AppShell
      title="Certificates"
      subtitle="Published Nexus templates · issue certificates · history keeps the original template version"
    >
      <PublishedCertificateCatalogView />
    </AppShell>
  );
}
