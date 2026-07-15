import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AdminPageTransition } from "@/components/AdminPageTransition";
import { DocHubNav } from "@/components/documents/DocHubNav";
import { DocDashboardView } from "@/components/documents/views/DocDashboardView";
import { DocRequestsView } from "@/components/documents/views/DocRequestsView";
import { DocPackagesView } from "@/components/documents/views/DocPackagesView";
import { DocTemplatesView } from "@/components/documents/views/DocTemplatesView";
import { DocGeneratedView } from "@/components/documents/views/DocGeneratedView";
import { DocPublishedView } from "@/components/documents/views/DocPublishedView";
import { DocSignaturesView } from "@/components/documents/views/DocSignaturesView";
import { DocCategoriesView } from "@/components/documents/views/DocCategoriesView";
import { DocSettingsView } from "@/components/documents/views/DocSettingsView";
import { DocGenerateView } from "@/components/documents/views/DocGenerateView";
import { Button } from "@lumenx/ui-admin";
import { Plus, Wand2 } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";

export type DocHubView =
  | "dashboard"
  | "requests"
  | "packages"
  | "templates"
  | "generate"
  | "generated"
  | "published"
  | "signatures"
  | "categories"
  | "settings";

const VIEW_TITLES: Record<DocHubView, string> = {
  dashboard: "Documents & Records Studio",
  requests: "Document Requests",
  packages: "Document Packages",
  templates: "Document Templates",
  generate: "Generate Documents",
  generated: "Generated Documents",
  published: "Published Documents",
  signatures: "Signatures",
  categories: "Categories",
  settings: "Studio Settings",
};

const VIEW_SUBTITLES: Record<DocHubView, string> = {
  dashboard: "Issue, track, and publish official school documents from one place",
  requests: "Student & staff requests for bonafides, TCs, marksheets, and more",
  packages: "Pre-defined bundles of documents for common workflows",
  templates: "Document layouts and formats available for generation",
  generate: "Select students, choose a template, preview, and generate draft documents",
  generated: "History of all documents generated · download · revoke",
  published: "Documents published to students, parents, and staff via Connect",
  signatures: "Authorised signatories and their signature configurations",
  categories: "Organise templates and documents by category",
  settings: "Numbering, expiry, watermark, and Connect sync settings",
};

function parseView(raw: unknown): DocHubView {
  const views: DocHubView[] = [
    "dashboard",
    "requests",
    "packages",
    "templates",
    "generate",
    "generated",
    "published",
    "signatures",
    "categories",
    "settings",
  ];
  return views.includes(raw as DocHubView) ? (raw as DocHubView) : "dashboard";
}

export const Route = createFileRoute("/documents")({
  head: () => ({ meta: [{ title: "Documents & Records Studio — LumenX Admin" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    view: parseView(search.view),
  }),
  component: DocumentsPage,
});

function DocumentsPage() {
  const { view } = Route.useSearch();
  const navigate = useNavigate();

  const goToView = (v: DocHubView) =>
    navigate({ to: "/documents", search: { view: v } });

  return (
    <AppShell
      title={VIEW_TITLES[view]}
      subtitle={VIEW_SUBTITLES[view]}
      actions={
        view === "requests" ? (
          <Button variant="primary" size="sm">
            <Plus className="size-3.5" /> New request
          </Button>
        ) : view === "generated" || view === "dashboard" ? (
          <Button variant="primary" size="sm" onClick={() => goToView("generate")}>
            <Wand2 className="size-3.5" /> Generate documents
          </Button>
        ) : undefined
      }
    >
      <DocHubNav active={view} />

      <AdminPageTransition pageKey={view}>
        {view === "dashboard" && <DocDashboardView />}
        {view === "requests" && <DocRequestsView />}
        {view === "packages" && <DocPackagesView />}
        {view === "templates" && <DocTemplatesView />}
        {view === "generate" && <DocGenerateView onViewGenerated={() => goToView("generated")} />}
        {view === "generated" && <DocGeneratedView />}
        {view === "published" && <DocPublishedView />}
        {view === "signatures" && <DocSignaturesView />}
        {view === "categories" && <DocCategoriesView />}
        {view === "settings" && <DocSettingsView />}
      </AdminPageTransition>
    </AppShell>
  );
}
