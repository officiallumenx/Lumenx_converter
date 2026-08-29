import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AdminPageTransition } from "@/components/AdminPageTransition";
import { DocHubNav } from "@/components/documents/DocHubNav";
import { DocDashboardView } from "@/components/documents/views/DocDashboardView";
import { DocRequestsView } from "@/components/documents/views/DocRequestsView";
import { DocPackagesView } from "@/components/documents/views/DocPackagesView";
import { DocTemplatesView } from "@/components/documents/views/DocTemplatesView";
import { DocGenerateView } from "@/components/documents/views/DocGenerateView";
import { DocGeneratedView } from "@/components/documents/views/DocGeneratedView";
import { DocPublishedView } from "@/components/documents/views/DocPublishedView";
import { DocSignaturesView } from "@/components/documents/views/DocSignaturesView";
import { DocCategoriesView } from "@/components/documents/views/DocCategoriesView";
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
  loadDocumentsGeneratedList,
  loadDocumentsTemplatesList,
  resolveDocumentsGeneratedListView,
  resolveDocumentsTemplatesListView,
  shouldCommitDocumentsGeneratedLoad,
  shouldCommitDocumentsTemplatesLoad,
  transitionGeneratedDocument,
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
  const [reloadKey, setReloadKey] = useState(0);

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
    storedStatus: templatesListStatus,
    storedErrorMessage: templatesListError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const generatedListView = resolveDocumentsGeneratedListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId: generatedResolvedForInstituteId,
    storedItems: apiGenerated,
    storedStatus: generatedListStatus,
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

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setTemplatesListStatus("loading");
    setTemplatesListError(null);
    void loadDocumentsTemplatesList(requestInstituteId).then((next) => {
      if (
        !shouldCommitDocumentsTemplatesLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setApiTemplates(next.items);
      setTemplatesListStatus(next.status);
      setTemplatesListError(next.errorMessage);
      setTemplatesResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [
    apiMode,
    view,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    reloadKey,
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

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setGeneratedListStatus("loading");
    setGeneratedListError(null);
    void loadDocumentsGeneratedList(requestInstituteId).then((next) => {
      if (
        !shouldCommitDocumentsGeneratedLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setApiGenerated(next.items);
      setGeneratedListStatus(next.status);
      setGeneratedListError(next.errorMessage);
      setGeneratedResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [
    apiMode,
    view,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    reloadKey,
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
        ? `API mode · ${templatesListView.items.length} templates`
        : `API mode · ${templatesHint ?? "…"}`;
    }
    if (view === "generated") {
      return generatedListView.rowsValid
        ? `API mode · ${generatedListView.items.length} documents`
        : `API mode · ${generatedHint ?? "…"}`;
    }
    if (
      view === "dashboard" ||
      view === "requests" ||
      view === "packages" ||
      view === "generate" ||
      view === "published" ||
      view === "signatures" ||
      view === "categories" ||
      view === "settings"
    ) {
      return "API mode · read unavailable · no institute read API";
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
            <ApiReadUnavailablePanel
              title="Documents dashboard unavailable in API mode"
              domainLabel="Documents dashboard"
            />
          ) : (
            <DocDashboardView />
          )
        ) : null}
        {view === "requests" ? (
          apiMode ? (
            <ApiReadUnavailablePanel
              title="Document requests unavailable in API mode"
              domainLabel="Document requests"
            />
          ) : (
            <DocRequestsView />
          )
        ) : null}
        {view === "packages" ? (
          apiMode ? (
            <ApiReadUnavailablePanel
              title="Document packages unavailable in API mode"
              domainLabel="Document packages"
            />
          ) : (
            <DocPackagesView />
          )
        ) : null}
        {view === "templates" && (
          <DocTemplatesView
            templates={apiTemplatesForView}
            writesEnabled={writesEnabled}
            listBlocked={apiMode && !templatesListView.rowsValid}
            listHint={templatesHint}
            onActivateTemplate={
              apiMode
                ? async (id) => {
                    await activateDocumentTemplate(id);
                    setReloadKey((k) => k + 1);
                  }
                : undefined
            }
          />
        )}
        {view === "generate" ? (
          apiMode ? (
            <ApiReadUnavailablePanel
              title="Document generation unavailable in API mode"
              domainLabel="Document generation"
              hint="Generation is a write workflow and there is no read-only API cutover for this tab yet. Demo generation is not available in API mode."
            />
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
                      setReloadKey((k) => k + 1);
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
                      setReloadKey((k) => k + 1);
                      notify("Document rejected");
                    } catch (err) {
                      notify(
                        err instanceof Error ? err.message : "Failed to reject document",
                      );
                    }
                  }
                : undefined
            }
          />
        )}
        {view === "published" ? (
          apiMode ? (
            <ApiReadUnavailablePanel
              title="Published documents unavailable in API mode"
              domainLabel="Published documents catalog"
              hint="Use Certificates or Documents → Generated for API-backed read views. This published hub tab has no institute read API yet."
            />
          ) : (
            <DocPublishedView />
          )
        ) : null}
        {view === "signatures" ? (
          apiMode ? (
            <ApiReadUnavailablePanel
              title="Signatures unavailable in API mode"
              domainLabel="Document signatures"
            />
          ) : (
            <DocSignaturesView />
          )
        ) : null}
        {view === "categories" ? (
          apiMode ? (
            <ApiReadUnavailablePanel
              title="Categories unavailable in API mode"
              domainLabel="Document categories"
            />
          ) : (
            <DocCategoriesView />
          )
        ) : null}
        {view === "settings" ? (
          apiMode ? (
            <ApiReadUnavailablePanel
              title="Studio settings unavailable in API mode"
              domainLabel="Document studio settings"
            />
          ) : (
            <DocSettingsView />
          )
        ) : null}
      </AdminPageTransition>
    </AppShell>
  );
}
