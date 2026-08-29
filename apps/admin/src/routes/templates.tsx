import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PublishedCertificateCatalogView } from "@/components/templates/views/PublishedCertificateCatalogView";
import { useEffect, useMemo, useRef, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import type { TemplateRecord } from "@/lib/template-management/types";
import {
  loadIssuedCertificatesList,
  resolveIssuedCertificatesListView,
  revokeCertificate,
  shouldCommitIssuedCertificatesLoad,
  type CertificatesListStatus,
  type IssuedCertificateHistoryItem,
} from "@/lib/certificates";
import { useAdminToast } from "@/components/AdminActionToast";
import {
  loadDocumentsTemplatesList,
  resolveDocumentsTemplatesListView,
  shouldCommitDocumentsTemplatesLoad,
  type DocumentsTemplatesListStatus,
} from "@/lib/documents";

export const Route = createFileRoute("/templates")({
  head: () => ({ meta: [{ title: "Certificates — LumenX Admin" }] }),
  validateSearch: (search: Record<string, unknown>): {
    view?: string;
    templateId?: string;
  } => {
    const out: { view?: string; templateId?: string } = {};
    if (typeof search.view === "string") out.view = search.view;
    if (typeof search.templateId === "string") out.templateId = search.templateId;
    return out;
  },
  component: CertificatesPage,
});

function listHint(
  status: CertificatesListStatus | DocumentsTemplatesListStatus,
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

function CertificatesPage() {
  const notify = useAdminToast();
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(apiMode, { status: instituteCtx.status, activeInstituteId: instituteCtx.activeInstituteId });
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;
  const [reloadKey, setReloadKey] = useState(0);

  const [apiCatalogTemplates, setApiCatalogTemplates] = useState<TemplateRecord[]>([]);
  const [catalogListStatus, setCatalogListStatus] =
    useState<DocumentsTemplatesListStatus>(() => (apiMode ? "loading" : "demo"));
  const [catalogListError, setCatalogListError] = useState<string | null>(null);
  const [catalogResolvedForInstituteId, setCatalogResolvedForInstituteId] =
    useState<string | null>(null);

  const [apiIssued, setApiIssued] = useState<IssuedCertificateHistoryItem[]>([]);
  const [issuedListStatus, setIssuedListStatus] =
    useState<CertificatesListStatus>(() => (apiMode ? "loading" : "demo"));
  const [issuedListError, setIssuedListError] = useState<string | null>(null);
  const [issuedResolvedForInstituteId, setIssuedResolvedForInstituteId] =
    useState<string | null>(null);

  const catalogListView = resolveDocumentsTemplatesListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId: catalogResolvedForInstituteId,
    storedItems: apiCatalogTemplates,
    storedStatus: catalogListStatus,
    storedErrorMessage: catalogListError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const issuedListView = resolveIssuedCertificatesListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId: issuedResolvedForInstituteId,
    storedItems: apiIssued,
    storedStatus: issuedListStatus,
    storedErrorMessage: issuedListError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const catalogHint = listHint(
    catalogListView.status,
    catalogListView.errorMessage,
    "certificate templates",
    "You do not have access to certificate templates for this institute.",
  );

  const issuedHint = listHint(
    issuedListView.status,
    issuedListView.errorMessage,
    "issued certificates",
    "You do not have access to issued certificates for this institute.",
  );

  useEffect(() => {
    if (!apiMode) return;

    if (instituteCtx.status === "loading") {
      setApiCatalogTemplates([]);
      setCatalogListStatus("loading");
      setCatalogListError(null);
      setCatalogResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "error" ||
      instituteCtx.status === "forbidden"
    ) {
      setApiCatalogTemplates([]);
      setCatalogListStatus(
        instituteCtx.status === "forbidden" ? "forbidden" : "error",
      );
      setCatalogListError(instituteCtx.errorMessage);
      setCatalogResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setApiCatalogTemplates([]);
      setCatalogListStatus("needs_institute");
      setCatalogListError(null);
      setCatalogResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setCatalogListStatus("loading");
    setCatalogListError(null);
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
      setApiCatalogTemplates(
        next.items.filter((template) => template.kind === "certificate"),
      );
      setCatalogListStatus(next.status);
      setCatalogListError(next.errorMessage);
      setCatalogResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [
    apiMode,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    reloadKey,
  ]);

  useEffect(() => {
    if (!apiMode) return;

    if (instituteCtx.status === "loading") {
      setApiIssued([]);
      setIssuedListStatus("loading");
      setIssuedListError(null);
      setIssuedResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "error" ||
      instituteCtx.status === "forbidden"
    ) {
      setApiIssued([]);
      setIssuedListStatus(
        instituteCtx.status === "forbidden" ? "forbidden" : "error",
      );
      setIssuedListError(instituteCtx.errorMessage);
      setIssuedResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setApiIssued([]);
      setIssuedListStatus("needs_institute");
      setIssuedListError(null);
      setIssuedResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setIssuedListStatus("loading");
    setIssuedListError(null);
    void loadIssuedCertificatesList(requestInstituteId).then((next) => {
      if (
        !shouldCommitIssuedCertificatesLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setApiIssued(next.items);
      setIssuedListStatus(next.status);
      setIssuedListError(next.errorMessage);
      setIssuedResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [
    apiMode,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    reloadKey,
  ]);

  const catalogTemplatesForView = useMemo(() => {
    if (!apiMode || !catalogListView.rowsValid) return undefined;
    return catalogListView.items;
  }, [apiMode, catalogListView.items, catalogListView.rowsValid]);

  const issuedRecordsForView = useMemo(() => {
    if (!apiMode || !issuedListView.rowsValid) return undefined;
    return issuedListView.items;
  }, [apiMode, issuedListView.items, issuedListView.rowsValid]);

  const subtitle = useMemo(() => {
    const base =
      "Published Nexus templates · issue certificates · history keeps the original template version";
    if (!apiMode) return base;
    const catalogPart = catalogListView.rowsValid
      ? `${catalogListView.items.length} templates`
      : catalogHint ?? "…";
    const issuedPart = issuedListView.rowsValid
      ? `${issuedListView.items.length} issued`
      : issuedHint ?? "…";
    return `API mode · ${catalogPart} · ${issuedPart}`;
  }, [
    apiMode,
    catalogListView.items.length,
    catalogListView.rowsValid,
    catalogHint,
    issuedListView.items.length,
    issuedListView.rowsValid,
    issuedHint,
  ]);

  return (
    <AppShell title="Certificates" subtitle={subtitle}>
      <PublishedCertificateCatalogView
        catalogTemplates={catalogTemplatesForView}
        catalogBlocked={apiMode && !catalogListView.rowsValid}
        catalogHint={catalogHint}
        writesEnabled={writesEnabled}
        issuedRecords={issuedRecordsForView}
        issuedListBlocked={apiMode && !issuedListView.rowsValid}
        issuedListHint={issuedHint}
        onRevokeCertificate={
          apiMode
            ? async (id, reason) => {
                try {
                  await revokeCertificate(id, { reason });
                  setReloadKey((k) => k + 1);
                  notify("Certificate revoked");
                } catch (err) {
                  notify(
                    err instanceof Error ? err.message : "Failed to revoke certificate",
                  );
                }
              }
            : undefined
        }
      />
    </AppShell>
  );
}
