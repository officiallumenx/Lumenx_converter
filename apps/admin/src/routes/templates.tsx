import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { TemplateHubNav } from "@/components/templates/TemplateHubNav";
import { TemplateDashboardView } from "@/components/templates/views/TemplateDashboardView";
import { TemplateLibraryView } from "@/components/templates/views/TemplateLibraryView";
import { TemplateBuilderView } from "@/components/templates/views/TemplateBuilderView";
import { TemplateGeneratedView } from "@/components/templates/views/TemplateGeneratedView";
import { TemplateImportsView } from "@/components/templates/views/TemplateImportsView";
import { TemplateCategoriesView } from "@/components/templates/views/TemplateCategoriesView";
import { TemplateGenerateView } from "@/components/templates/views/TemplateGenerateView";
import { TemplateSettingsView } from "@/components/templates/views/TemplateSettingsView";
import type { TemplateHubView } from "@/lib/template-management/types";
import { Button } from "@lumenx/ui-admin";
import { Wand2 } from "lucide-react";
import { Link } from "@tanstack/react-router";

const VIEW_TITLES: Record<TemplateHubView, string> = {
  dashboard: "Template Management",
  library: "Template Library",
  certificates: "Certificate Templates",
  reports: "Report Templates",
  id_cards: "ID Card Templates",
  documents: "Document Templates",
  builder: "Template Builder",
  imports: "Template Imports",
  generate: "Issue Documents",
  generated: "Generated Documents",
  categories: "Template Categories",
  settings: "Template Settings",
};

const VIEW_SUBTITLES: Record<TemplateHubView, string> = {
  dashboard: "Create, customize, and generate certificates, reports, ID cards, and academic documents",
  library: "Browse system and custom templates · grid or list · search and filter",
  certificates: "Study, bonafide, conduct, transfer, and achievement certificates",
  reports: "Progress reports, semester reports, annual reports, and mark sheets",
  id_cards: "Student, teacher, staff, and visitor ID templates",
  documents: "Transfer certificates, mark sheets, and official documents",
  builder: "Visual editor — headers, variables, QR codes, no coding required",
  imports: "Upload DOCX, PDF, or images · map variables · save as template",
  generate: "Select a template, choose students by class or grade, and generate certificates in bulk",
  generated: "Generation history · downloads · regeneration · archive",
  categories: "Academic, certificates, sports, extra-curricular, and identity categories",
  settings: "Prefixes, bulk limits, watermarks, and Connect sync",
};

function parseView(raw: unknown): TemplateHubView {
  const views: TemplateHubView[] = [
    "dashboard",
    "library",
    "certificates",
    "reports",
    "id_cards",
    "documents",
    "builder",
    "imports",
    "generate",
    "generated",
    "categories",
    "settings",
  ];
  return views.includes(raw as TemplateHubView) ? (raw as TemplateHubView) : "dashboard";
}

export const Route = createFileRoute("/templates")({
  head: () => ({ meta: [{ title: "Template Management — LumenX Admin" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    view: parseView(search.view),
    templateId: typeof search.templateId === "string" ? search.templateId : undefined,
  }),
  component: TemplatesPage,
});

function TemplatesPage() {
  const { view, templateId } = Route.useSearch();

  return (
    <AppShell
      title={VIEW_TITLES[view]}
      subtitle={VIEW_SUBTITLES[view]}
      actions={
        view !== "builder" ? (
          <Link to="/templates" search={{ view: "builder" }}>
            <Button variant="primary">
              <Wand2 className="size-3.5" /> New template
            </Button>
          </Link>
        ) : undefined
      }
    >
      <TemplateHubNav active={view} />

      {view === "dashboard" && <TemplateDashboardView />}
      {view === "library" && <TemplateLibraryView />}
      {view === "certificates" && <TemplateLibraryView kindFilter="certificate" />}
      {view === "reports" && <TemplateLibraryView kindFilter="report" />}
      {view === "id_cards" && <TemplateLibraryView kindFilter="id_card" />}
      {view === "documents" && <TemplateLibraryView kindFilter="document" />}
      {view === "builder" && <TemplateBuilderView initialTemplateId={templateId} />}
      {view === "imports" && <TemplateImportsView />}
      {view === "generate" && <TemplateGenerateView initialTemplateId={templateId} />}
      {view === "generated" && <TemplateGeneratedView />}
      {view === "categories" && <TemplateCategoriesView />}
      {view === "settings" && <TemplateSettingsView />}
    </AppShell>
  );
}
