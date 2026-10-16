import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { adminModulePrefix, adminQueryRoots } from "@/lib/admin-queries";
import { invalidateAdminCache } from "@/lib/admin-resource-cache";
import { AppShell } from "@/components/AppShell";
import { ModuleHero } from "@/components/module-shell";
import { AdminPageTransition } from "@/components/AdminPageTransition";
import { DocHubNav } from "@/components/documents/DocHubNav";
import { DocTemplatesWorkflowPanel } from "@/components/documents/views/DocTemplatesWorkflowPanel";
import { DocTemplatesView } from "@/components/documents/views/DocTemplatesView";
import { DocGenerateView } from "@/components/documents/views/DocGenerateView";
import { DocPublishedView } from "@/components/documents/views/DocPublishedView";
import { DocPublishedApiPanel } from "@/components/documents/views/DocPublishedApiPanel";
import { validateHubViewSearch } from "@/lib/hub-view-search";
import { adminPageTitle } from "@/lib/admin-module-labels";
import { useEffect, useMemo, useRef, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import { useReloadKey } from "@/hooks/useReloadKey";
import {
  filterDocumentsHubTemplates,
  loadDocumentsTemplatesList,
  resolveDocumentsTemplatesListView,
  shouldCommitDocumentsTemplatesLoad,
  type DocumentsListStatus,
  type DocumentsTemplatesListStatus,
} from "@/lib/documents";
import {
  DOCUMENTS_VIEW_CONFIG,
  DOC_VIEW_SUBTITLES,
  DOC_VIEW_TITLES,
  type DocHubView,
} from "@/lib/documents/doc-hub-views";
import type { TemplateRecord } from "@/lib/template-management/types";
import { PageStack } from "@lumenx/ui-admin";

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
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(apiMode, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;
  const queryClient = useQueryClient();
  const [templatesReloadKey, setTemplatesReloadKey] = useReloadKey();

  const [apiTemplates, setApiTemplates] = useState<TemplateRecord[]>([]);
  const [templatesListStatus, setTemplatesListStatus] =
    useState<DocumentsTemplatesListStatus>(() => (apiMode ? "loading" : "demo"));
  const [templatesListError, setTemplatesListError] = useState<string | null>(null);
  const [templatesResolvedForInstituteId, setTemplatesResolvedForInstituteId] =
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

  const templatesHint = documentsListHint(
    templatesListView.status,
    templatesListView.errorMessage,
    "document templates",
    "You do not have access to document templates for this institute.",
  );

  const bumpDocumentsReload = () => {
    invalidateAdminCache("admin:documents");
    setTemplatesReloadKey((key) => key + 1);
    if (instituteCtx.activeInstituteId) {
      void queryClient.invalidateQueries({
        queryKey: adminModulePrefix(
          instituteCtx.activeInstituteId,
          adminQueryRoots.documents,
        ),
      });
    }
  };

  useEffect(() => {
    if (!apiMode || view !== "templates") return;

    if (instituteCtx.status === "loading") {
      setApiTemplates([]);
      setTemplatesListStatus("loading");
      setTemplatesListError(null);
      setTemplatesResolvedForInstituteId(null);
      return;
    }

    if (instituteCtx.status === "error" || instituteCtx.status === "forbidden") {
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
    if (apiTemplates.length === 0) {
      setTemplatesListStatus("loading");
      setTemplatesListError(null);
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- length only gates skeleton
  }, [
    apiMode,
    view,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    templatesReloadKey,
  ]);

  const apiDocumentTemplates = useMemo(() => {
    if (!apiMode || !templatesListView.rowsValid) return undefined;
    return filterDocumentsHubTemplates(templatesListView.items);
  }, [apiMode, templatesListView.items, templatesListView.rowsValid]);

  const subtitle = useMemo(() => {
    const base = DOC_VIEW_SUBTITLES[view];
    if (!apiMode || view !== "templates") return base;
    return templatesListView.rowsValid
      ? `${apiDocumentTemplates?.length ?? 0} document templates`
      : `${templatesHint ?? "…"}`;
  }, [
    apiMode,
    view,
    apiDocumentTemplates?.length,
    templatesListView.rowsValid,
    templatesHint,
  ]);

  return (
    <AppShell title={DOC_VIEW_TITLES[view]} subtitle={subtitle}>
      <ModuleHero
        eyebrow="Institute"
        title={DOC_VIEW_TITLES[view]}
        subtitle={subtitle}
      />
      <DocHubNav active={view} />
      <AdminPageTransition pageKey={view}>
        {view === "templates" ? (
          apiMode ? (
            <DocTemplatesWorkflowPanel
              templates={apiDocumentTemplates ?? []}
              writesEnabled={writesEnabled}
              listBlocked={!templatesListView.rowsValid}
              listHint={templatesHint}
              onChanged={() => bumpDocumentsReload()}
            />
          ) : (
            <PageStack>
              <DocGenerateView onViewGenerated={() => undefined} />
              <DocTemplatesView
                templates={apiDocumentTemplates}
                writesEnabled={writesEnabled}
                listBlocked={false}
                listHint={templatesHint}
                onActivateTemplate={undefined}
              />
            </PageStack>
          )
        ) : null}

        {view === "published" ? (
          apiMode ? <DocPublishedApiPanel /> : <DocPublishedView />
        ) : null}
      </AdminPageTransition>
    </AppShell>
  );
}
