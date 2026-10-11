import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useDocumentsTemplatesQuery, useDocumentsGeneratedQuery, adminModulePrefix, adminQueryRoots } from "@/lib/admin-queries";
import { invalidateAdminCache } from "@/lib/admin-resource-cache";
import { AppShell } from "@/components/AppShell";
import { ModuleHero } from "@/components/module-shell";
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
import { adminPageTitle } from "@/lib/admin-module-labels";
import { useEffect, useMemo, useRef, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiReadUnavailablePanel } from "@/components/ApiReadUnavailablePanel";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import {
  filterDocumentsHubTemplates,
  resolveDocumentsGeneratedListView,
  resolveDocumentsTemplatesListView,
  transitionGeneratedDocument,
  getGeneratedDocumentSignedUrl,
  type DocumentsGeneratedListStatus,
  type DocumentsListStatus,
  type DocumentsTemplatesListStatus,
} from "@/lib/documents";
import {
  DOCUMENTS_VIEW_CONFIG,
  DOC_VIEW_SUBTITLES,
  DOC_VIEW_TITLES,
  type DocHubView,
} from "@/lib/documents/doc-hub-views";
import { useAdminToast } from "@/components/AdminActionToast";
import { getNextWorkflowState } from "@/lib/template-management/store";
import type { GeneratedDocument, TemplateRecord } from "@/lib/template-management/types";
import { Card, CardBody, CardHeader, PageStack } from "@lumenx/ui-admin";

/** Re-export for legacy imports. */
export type { DocHubView };

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
  const needsTemplates =
    view === "templates" || view === "overview" || view === "official";
  const needsGenerated =
    view === "archive" ||
    view === "student-docs" ||
    view === "overview" ||
    view === "official";
  const templatesQuery = useDocumentsTemplatesQuery(
    instituteCtx.activeInstituteId,
    listEnabled && needsTemplates,
  );
  const generatedQuery = useDocumentsGeneratedQuery(
    instituteCtx.activeInstituteId,
    listEnabled && needsGenerated,
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
    if (!apiMode || !needsTemplates) return;

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
    needsTemplates,
  ]);

  useEffect(() => {
    if (!apiMode || !needsGenerated) return;

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
    needsGenerated,
  ]);

  /** Document/report templates only — certificates/ID cards live under Certificates. */
  const apiDocumentTemplates = useMemo(() => {
    if (!apiMode || !templatesListView.rowsValid) return undefined;
    return filterDocumentsHubTemplates(templatesListView.items);
  }, [apiMode, templatesListView.items, templatesListView.rowsValid]);

  const apiGeneratedAll = useMemo(() => {
    if (!apiMode || !generatedListView.rowsValid) return undefined;
    return generatedListView.items;
  }, [apiMode, generatedListView.items, generatedListView.rowsValid]);

  const apiStudentDocs = useMemo(() => {
    if (!apiGeneratedAll) return undefined;
    return apiGeneratedAll.filter(
      (d) =>
        d.portalVisibility?.student ||
        d.portalVisibility?.parent ||
        Boolean(d.recipientName?.trim()),
    );
  }, [apiGeneratedAll]);

  const subtitle = useMemo(() => {
    const base = DOC_VIEW_SUBTITLES[view];
    if (!apiMode) return base;
    if (view === "templates") {
      return templatesListView.rowsValid
        ? `${apiDocumentTemplates?.length ?? 0} document templates`
        : `${templatesHint ?? "…"}`;
    }
    if (view === "archive" || view === "student-docs") {
      const count =
        view === "student-docs"
          ? apiStudentDocs?.length
          : apiGeneratedAll?.length;
      return generatedListView.rowsValid
        ? `${count ?? 0} documents`
        : `${generatedHint ?? "…"}`;
    }
    if (
      view === "requests" ||
      view === "packages" ||
      view === "signatures" ||
      view === "settings"
    ) {
      return "Not available in live API mode";
    }
    return base;
  }, [
    apiMode,
    view,
    apiDocumentTemplates?.length,
    templatesListView.rowsValid,
    templatesHint,
    apiGeneratedAll?.length,
    apiStudentDocs?.length,
    generatedListView.rowsValid,
    generatedHint,
  ]);

  const goToView = (nextView: DocHubView) =>
    navigate({ to: "/documents", search: { view: nextView } });

  const generatedCallbacks = {
    onAdvanceDocument: apiMode
      ? async (doc: GeneratedDocument) => {
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
      : undefined,
    onRejectDocument: apiMode
      ? async (doc: GeneratedDocument, reason: string) => {
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
      : undefined,
    onDownloadDocument: apiMode
      ? async (doc: GeneratedDocument) => {
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
      : undefined,
  };

  return (
    <AppShell title={DOC_VIEW_TITLES[view]} subtitle={subtitle}>
      <ModuleHero
        eyebrow="Institute"
        title={DOC_VIEW_TITLES[view]}
        subtitle={subtitle}
      />
      <DocHubNav active={view} />
      <AdminPageTransition pageKey={view}>
        {view === "overview" ? (
          apiMode ? (
            <DocDashboardApiPanel />
          ) : (
            <DocDashboardView />
          )
        ) : null}

        {view === "official" ? (
          <PageStack>
            <Card>
              <CardHeader
                title="Create official document"
                hint="Transfer certificates, bonafides, and other school documents · award certificates are under Certificates"
              />
              <CardBody className="text-sm text-muted-foreground">
                Generate a draft, complete review if required, then publish. Retrieve
                later from Archive. Transfer Certificates stay in Documents (not the
                certificate ledger) so numbering and verification stay compatible.
              </CardBody>
            </Card>
            {apiMode ? (
              <DocGenerateApiPanel />
            ) : (
              <DocGenerateView onViewGenerated={() => goToView("archive")} />
            )}
            {apiMode ? <DocPublishedApiPanel /> : <DocPublishedView />}
          </PageStack>
        ) : null}

        {view === "student-docs" ? (
          <DocGeneratedView
            documents={apiMode ? apiStudentDocs : undefined}
            writesEnabled={writesEnabled}
            listBlocked={apiMode && !generatedListView.rowsValid}
            listHint={generatedHint}
            {...generatedCallbacks}
          />
        ) : null}

        {view === "templates"
          ? apiMode ? (
              <DocTemplatesApiPanel
                templates={apiDocumentTemplates ?? []}
                writesEnabled={writesEnabled}
                listBlocked={!templatesListView.rowsValid}
                listHint={templatesHint}
                onChanged={() => bumpDocumentsReload()}
              />
            ) : (
              <DocTemplatesView
                templates={apiDocumentTemplates}
                writesEnabled={writesEnabled}
                listBlocked={false}
                listHint={templatesHint}
                onActivateTemplate={undefined}
              />
            )
          : null}

        {view === "archive" ? (
          <PageStack>
            <DocGeneratedView
              documents={apiMode ? apiGeneratedAll : undefined}
              writesEnabled={writesEnabled}
              listBlocked={apiMode && !generatedListView.rowsValid}
              listHint={generatedHint}
              {...generatedCallbacks}
            />
            {apiMode ? <DocPublishedApiPanel /> : null}
          </PageStack>
        ) : null}

        {view === "requests" ? (
          apiMode ? (
            <ApiReadUnavailablePanel
              title="Document requests unavailable"
              domainLabel="Document requests"
              hint="There is no live request intake API yet. Existing demo data is not shown in API mode."
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
              hint="Packages are demo-only and not available in API mode."
            />
          ) : (
            <DocPackagesView />
          )
        ) : null}
        {view === "signatures" ? (
          apiMode ? (
            <ApiReadUnavailablePanel
              title="Signatures unavailable"
              domainLabel="Document signatures"
              hint="Signature capture is demo-only and not available in API mode."
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
              hint="Studio settings are demo-only and not available in API mode."
            />
          ) : (
            <DocSettingsView />
          )
        ) : null}
      </AdminPageTransition>
    </AppShell>
  );
}
