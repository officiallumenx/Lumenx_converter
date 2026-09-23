import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useDocumentsTemplatesQuery, useDocumentsGeneratedQuery, adminModulePrefix, adminQueryRoots } from "@/lib/admin-queries";
import { invalidateAdminCache } from "@/lib/admin-resource-cache";
import { AppShell } from "@/components/AppShell";
import { AdminPageTransition } from "@/components/AdminPageTransition";
import { DocHubNav } from "@/components/documents/DocHubNav";
import { DocDashboardView } from "@/components/documents/views/DocDashboardView";
import { DocDashboardApiPanel } from "@/components/documents/views/DocDashboardApiPanel";
import { DocRequestsView } from "@/components/documents/views/DocRequestsView";
import { DocPackagesView } from "@/components/documents/views/DocPackagesView";
import { DocTemplatesView } from "@/components/documents/views/DocTemplatesView";
import { DocTemplatesApiPanel } from "@/components/documents/views/DocTemplatesApiPanel";
import { DocGenerateView } from "@/components/documents/views/DocGenerateView";
import { DocGenerateApiPanel } from "@/components/documents/views/DocGenerateApiPanel";
import { DocGeneratedView } from "@/components/documents/views/DocGeneratedView";
import { DocPublishedView } from "@/components/documents/views/DocPublishedView";
import { DocPublishedApiPanel } from "@/components/documents/views/DocPublishedApiPanel";
import { DocSignaturesView } from "@/components/documents/views/DocSignaturesView";
import { DocCategoriesView } from "@/components/documents/views/DocCategoriesView";
import { DocCategoriesApiPanel } from "@/components/documents/views/DocCategoriesApiPanel";
import { DocSettingsView } from "@/components/documents/views/DocSettingsView";
import { validateHubViewSearch } from "@/lib/hub-view-search";
import { ADMIN_MODULE_LABELS as M, adminPageTitle } from "@/lib/admin-module-labels";
import { useEffect, useMemo, useRef, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiReadUnavailablePanel } from "@/components/ApiReadUnavailablePanel";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import {
  activateDocumentTemplate,
  resolveDocumentsGeneratedListView,
  resolveDocumentsTemplatesListView,
  transitionGeneratedDocument,
  getGeneratedDocumentSignedUrl,
  type DocumentsGeneratedListStatus,
  type DocumentsListStatus,
  type DocumentsTemplatesListStatus,
} from "@/lib/documents";
import { useAdminToast } from "@/components/AdminActionToast";
import { getNextWorkflowState } from "@/lib/template-management/store";
import type { GeneratedDocument, TemplateRecord } from "@/lib/template-management/types";

/** Kept for legacy document components that still reference this type. */
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

const DOCUMENTS_VIEW_CONFIG = {
  views: [
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
  ] as const,
  defaultView: "dashboard" as const,
};

const VIEW_TITLES: Record<DocHubView, string> = {
  dashboard: M.documents,
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

export const Route = createFileRoute("/documents")({
  head: () => ({ meta: [{ title: adminPageTitle("/documents") }] }),
  validateSearch: (search: Record<string, unknown>) =>
    validateHubViewSearch(search, DOCUMENTS_VIEW_CONFIG),
  component: DocumentsPage,
});

function documentsListHint(
  status: DocumentsListStatus,
  errorMessage: string | null,
  entityLabel: string,
  forbiddenFallback: string,
): string | null {
  if (status === "loading") return `Loading ${entityLabel}…`;
  if (status === "needs_institute") return `Select an institute to load ${entityLabel}.`;
  if (status === "forbidden") return errorMessage ?? forbiddenFallback;
  if (status === "error") return errorMessage ?? `Failed to load ${entityLabel}.`;
  if (status === "empty") return `No ${entityLabel} found for this institute.`;
  return null;
}

function DocumentsPage() {
  const { view } = Route.useSearch();
  const navigate = useNavigate();
  const notify = useAdminToast();
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(apiMode, { status: instituteCtx.status, activeInstituteId: instituteCtx.activeInstituteId });
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;
  const queryClient = useQueryClient();
  const listEnabled =
    apiMode &&
    instituteCtx.status === "ready" &&
    Boolean(instituteCtx.activeInstituteId);
  const templatesQuery = useDocumentsTemplatesQuery(
    instituteCtx.activeInstituteId,
    listEnabled && view === "templates",
  );
  const generatedQuery = useDocumentsGeneratedQuery(
    instituteCtx.activeInstituteId,
    listEnabled && view === "generated",
  );
  const bumpDocumentsReload = () => {
    invalidateAdminCache("admin:documents");
    if (instituteCtx.activeInstituteId) {
      void queryClient.invalidateQueries({
        queryKey: adminModulePrefix(instituteCtx.activeInstituteId, adminQueryRoots.documents),
      });
    }
  };

  const [apiTemplates, setApiTemplates] = useState<TemplateRecord[]>([]);
  const [templatesListStatus, setTemplatesListStatus] =
    useState<DocumentsTemplatesListStatus>(() => (apiMode ? "loading" : "demo"));
  const [templatesListError, setTemplatesListError] = useState<string | null>(null);
  const [templatesResolvedForInstituteId, setTemplatesResolvedForInstituteId] =
    useState<string | null>(null);

  const [apiGenerated, setApiGenerated] = useState<GeneratedDocument[]>([]);
  const [generatedListStatus, setGeneratedListStatus] =
    useState<DocumentsGeneratedListStatus>(() => (apiMode ? "loading" : "demo"));
  const [generatedListError, setGeneratedListError] = useState<string | null>(null);
  const [generatedResolvedForInstituteId, setGeneratedResolvedForInstituteId] =
    useState<string | null>(null);

  const templatesListView = resolveDocumentsTemplatesListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId: templatesResolvedForInstituteId,
    storedItems: apiTemplates,
    storedStatus:
      templatesQuery.isLoading && !templatesQuery.data
        ? "loading"
        : templatesListStatus,
    storedErrorMessage: templatesListError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const generatedListView = resolveDocumentsGeneratedListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId: generatedResolvedForInstituteId,
    storedItems: apiGenerated,
    storedStatus:
      generatedQuery.isLoading && !generatedQuery.data
        ? "loading"
        : generatedListStatus,
    storedErrorMessage: generatedListError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const templatesHint = documentsListHint(
    templatesListView.status,
    templatesListView.errorMessage,
    "document templates",
    "You do not have access to document templates for this institute.",
  );

  const generatedHint = documentsListHint(
    generatedListView.status,
    generatedListView.errorMessage,
    "generated documents",
    "You do not have access to generated documents for this institute.",
  );

  useEffect(() => {
    if (!apiMode || view !== "templates") return;

    if (instituteCtx.status === "loading") {
      setApiTemplates([]);
      setTemplatesListStatus("loading");
      setTemplatesListError(null);
      setTemplatesResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "error" ||
      instituteCtx.status === "forbidden"
    ) {
      setApiTemplates([]);
      setTemplatesListStatus(
        instituteCtx.status === "forbidden" ? "forbidden" : "error",
      );
      setTemplatesListError(instituteCtx.errorMessage);
      setTemplatesResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setApiTemplates([]);
      setTemplatesListStatus("needs_institute");
      setTemplatesListError(null);
      setTemplatesResolvedForInstituteId(null);
      return;
    }

    if (templatesQuery.isLoading && !templatesQuery.data) {
      setTemplatesListStatus("loading");
      setTemplatesListError(null);
      return;
    }
    if (!templatesQuery.data) return;

    const next = templatesQuery.data;
    setApiTemplates(next.items);
    setTemplatesListStatus(next.status);
    setTemplatesListError(next.errorMessage);
    setTemplatesResolvedForInstituteId(instituteCtx.activeInstituteId);
  }, [
    apiMode,
    view,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    templatesQuery.data,
    templatesQuery.isLoading,
  ]);

  useEffect(() => {
    if (!apiMode || view !== "generated") return;

    if (instituteCtx.status === "loading") {
      setApiGenerated([]);
      setGeneratedListStatus("loading");
      setGeneratedListError(null);
      setGeneratedResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "error" ||
      instituteCtx.status === "forbidden"
    ) {
      setApiGenerated([]);
      setGeneratedListStatus(
        instituteCtx.status === "forbidden" ? "forbidden" : "error",
      );
      setGeneratedListError(instituteCtx.errorMessage);
      setGeneratedResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setApiGenerated([]);
      setGeneratedListStatus("needs_institute");
      setGeneratedListError(null);
      setGeneratedResolvedForInstituteId(null);
      return;
    }

    if (generatedQuery.isLoading && !generatedQuery.data) {
      setGeneratedListStatus("loading");
      setGeneratedListError(null);
      return;
    }
    if (!generatedQuery.data) return;

    const next = generatedQuery.data;
    setApiGenerated(next.items);
    setGeneratedListStatus(next.status);
    setGeneratedListError(next.errorMessage);
    setGeneratedResolvedForInstituteId(instituteCtx.activeInstituteId);
  }, [
    apiMode,
    view,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    generatedQuery.data,
    generatedQuery.isLoading,
  ]);

  const apiTemplatesForView = useMemo(() => {
    if (!apiMode || view !== "templates" || !templatesListView.rowsValid) {
      return undefined;
    }
    return templatesListView.items.filter(
      (t) => t.kind === "document" || t.kind === "certificate",
    );
  }, [apiMode, view, templatesListView.items, templatesListView.rowsValid]);

  const apiGeneratedForView = useMemo(() => {
    if (!apiMode || view !== "generated" || !generatedListView.rowsValid) {
      return undefined;
    }
    return generatedListView.items;
  }, [apiMode, view, generatedListView.items, generatedListView.rowsValid]);

  const subtitle = useMemo(() => {
    const base = VIEW_SUBTITLES[view];
    if (!apiMode) return base;
    if (view === "templates") {
      return templatesListView.rowsValid
        ? `${templatesListView.items.length} templates`
        : `${templatesHint ?? "…"}`;
    }
    if (view === "generated") {
      return generatedListView.rowsValid
        ? `${generatedListView.items.length} documents`
        : `${generatedHint ?? "…"}`;
    }
    if (
      view === "requests" ||
      view === "packages" ||
      view === "signatures" ||
      view === "settings"
    ) {
      return "Read unavailable";
    }
    if (view === "dashboard") {
      return "KPIs from templates + generated";
    }
    if (view === "generate") {
      return "Create draft";
    }
    if (view === "published") {
      return "Published workflow";
    }
    if (view === "categories") {
      return "Categories from templates";
    }
    return base;
  }, [
    apiMode,
    view,
    templatesListView.items.length,
    templatesListView.rowsValid,
    templatesHint,
    generatedListView.items.length,
    generatedListView.rowsValid,
    generatedHint,
  ]);

  const goToView = (nextView: DocHubView) =>
    navigate({ to: "/documents", search: { view: nextView } });

  return (
    <AppShell title={VIEW_TITLES[view]} subtitle={subtitle}>
      <DocHubNav active={view} />
      <AdminPageTransition pageKey={view}>
        {view === "dashboard" ? (
          apiMode ? (
            <DocDashboardApiPanel />
          ) : (
            <DocDashboardView />
          )
        ) : null}
        {view === "requests" ? (
          apiMode ? (
            <ApiReadUnavailablePanel
              title="Document requests unavailable"
              domainLabel="Document requests"
              hint="Request intake is not set up for this institute yet."
            />
          ) : (
            <DocRequestsView />
          )
        ) : null}
        {view === "packages" ? (
          apiMode ? (
            <ApiReadUnavailablePanel
              title="Document packages unavailable"
              domainLabel="Document packages"
              hint="Document packages are not set up for this institute yet."
            />
          ) : (
            <DocPackagesView />
          )
        ) : null}
        {view === "templates" &&
          (apiMode ? (
            <DocTemplatesApiPanel
              templates={apiTemplatesForView ?? []}
              writesEnabled={writesEnabled}
              listBlocked={!templatesListView.rowsValid}
              listHint={templatesHint}
              onChanged={() => bumpDocumentsReload()}
            />
          ) : (
            <DocTemplatesView
              templates={apiTemplatesForView}
              writesEnabled={writesEnabled}
              listBlocked={apiMode && !templatesListView.rowsValid}
              listHint={templatesHint}
              onActivateTemplate={
                apiMode
                  ? async (id) => {
                      await activateDocumentTemplate(id);
                      bumpDocumentsReload();
                    }
                  : undefined
              }
            />
          ))}
        {view === "generate" ? (
          apiMode ? (
            <DocGenerateApiPanel />
          ) : (
            <DocGenerateView onViewGenerated={() => goToView("generated")} />
          )
        ) : null}
        {view === "generated" && (
          <DocGeneratedView
            documents={apiGeneratedForView}
            writesEnabled={writesEnabled}
            listBlocked={apiMode && !generatedListView.rowsValid}
            listHint={generatedHint}
            onAdvanceDocument={
              apiMode
                ? async (doc) => {
                    const next = getNextWorkflowState(doc.kind, doc.workflowState);
                    if (!next) {
                      notify("Document is already in a terminal workflow state");
                      return;
                    }
                    try {
                      await transitionGeneratedDocument(doc.id, {
                        workflowState: next,
                      });
                      bumpDocumentsReload();
                      notify(`Advanced to ${next.replace(/_/g, " ")}`);
                    } catch (err) {
                      notify(
                        err instanceof Error ? err.message : "Failed to advance document",
                      );
                    }
                  }
                : undefined
            }
            onRejectDocument={
              apiMode
                ? async (doc, reason) => {
                    try {
                      await transitionGeneratedDocument(doc.id, {
                        workflowState: "rejected",
                        rejectionReason: reason,
                      });
                      bumpDocumentsReload();
                      notify("Document rejected");
                    } catch (err) {
                      notify(
                        err instanceof Error ? err.message : "Failed to reject document",
                      );
                    }
                  }
                : undefined
            }
            onDownloadDocument={
              apiMode
                ? async (doc) => {
                    try {
                      const { signedUrl } = await getGeneratedDocumentSignedUrl(doc.id);
                      window.open(signedUrl, "_blank", "noopener,noreferrer");
                    } catch (err) {
                      notify(
                        err instanceof Error
                          ? err.message
                          : "Download unavailable — publish the document first",
                      );
                    }
                  }
                : undefined
            }
          />
        )}
        {view === "published" ? (
          apiMode ? (
            <DocPublishedApiPanel />
          ) : (
            <DocPublishedView />
          )
        ) : null}
        {view === "signatures" ? (
          apiMode ? (
            <ApiReadUnavailablePanel
              title="Signatures unavailable"
              domainLabel="Document signatures"
              hint="Signature capture is not set up for this institute yet."
            />
          ) : (
            <DocSignaturesView />
          )
        ) : null}
        {view === "categories" ? (
          apiMode ? (
            <DocCategoriesApiPanel />
          ) : (
            <DocCategoriesView />
          )
        ) : null}
        {view === "settings" ? (
          apiMode ? (
            <ApiReadUnavailablePanel
              title="Studio settings unavailable"
              domainLabel="Document studio settings"
              hint="Studio settings are not set up for this institute yet."
            />
          ) : (
            <DocSettingsView />
          )
        ) : null}
      </AdminPageTransition>
    </AppShell>
  );
}
