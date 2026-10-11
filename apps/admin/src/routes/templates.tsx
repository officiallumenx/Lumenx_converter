import { createFileRoute, Link } from "@tanstack/react-router";
import { useReloadKey } from "@/hooks/useReloadKey";
import { AppShell } from "@/components/AppShell";
import { ModuleHero } from "@/components/module-shell";
import { CertHubNav } from "@/components/templates/CertHubNav";
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
import {
  CERTIFICATES_VIEW_CONFIG,
  CERT_VIEW_SUBTITLES,
  CERT_VIEW_TITLES,
  type CertHubView,
} from "@/lib/certificates/cert-hub-views";
import { validateHubViewSearch } from "@/lib/hub-view-search";
import { useAdminToast } from "@/components/AdminActionToast";
import {
  loadDocumentsTemplatesList,
  resolveDocumentsTemplatesListView,
  shouldCommitDocumentsTemplatesLoad,
  type DocumentsTemplatesListStatus,
} from "@/lib/documents";
import { connectPortalUrl } from "@/lib/connect-portal-links";
import { Button, Card, CardBody, CardHeader, PageStack } from "@lumenx/ui-admin";
import { ExternalLink, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/templates")({
  head: () => ({ meta: [{ title: "Certificates — LumenX Admin" }] }),
  validateSearch: (search: Record<string, unknown>) => {
    const hub = validateHubViewSearch(search, CERTIFICATES_VIEW_CONFIG);
    const out: { view: CertHubView; templateId?: string } = { view: hub.view };
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
  const { view } = Route.useSearch();
  const notify = useAdminToast();
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(apiMode, { status: instituteCtx.status, activeInstituteId: instituteCtx.activeInstituteId });
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;
  const [reloadKey, setReloadKey] = useReloadKey();

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
    // Keep prior catalog visible while soft-refresh refetches.
    if (apiCatalogTemplates.length === 0) {
      setCatalogListStatus("loading");
      setCatalogListError(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- catalog length only gates skeleton
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
    // Keep prior issued list visible while soft-refresh refetches.
    if (apiIssued.length === 0) {
      setIssuedListStatus("loading");
      setIssuedListError(null);
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- issued length only gates skeleton
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
    const base = CERT_VIEW_SUBTITLES[view];
    if (!apiMode) return base;
    if (view === "templates" || view === "overview") {
      const catalogPart = catalogListView.rowsValid
        ? `${catalogListView.items.length} templates`
        : catalogHint ?? "…";
      if (view === "templates") return catalogPart;
      const issuedPart = issuedListView.rowsValid
        ? `${issuedListView.items.length} issued`
        : issuedHint ?? "…";
      return `${catalogPart} · ${issuedPart}`;
    }
    if (view === "issued") {
      return issuedListView.rowsValid
        ? `${issuedListView.items.length} issued certificates`
        : issuedHint ?? "…";
    }
    return base;
  }, [
    apiMode,
    view,
    catalogListView.items.length,
    catalogListView.rowsValid,
    catalogHint,
    issuedListView.items.length,
    issuedListView.rowsValid,
    issuedHint,
  ]);

  const verifyUrl = connectPortalUrl("/verify-certificate");
  const verifyPanel = (
    <PageStack>
      <Card>
        <CardHeader
          title="Public verification"
          hint="Anyone with the institute id and certificate number can check status — PDF is never exposed"
        />
        <CardBody className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Verification uses the existing Connect page. Issued certificate numbers are
            preserved; Transfer Certificates generated under Documents are not on this
            ledger and cannot be verified here.
          </p>
          <div className="flex flex-wrap gap-2">
            <a href={verifyUrl} target="_blank" rel="noreferrer">
              <Button variant="primary">
                <ShieldCheck className="size-3.5" />
                Open verify page
                <ExternalLink className="size-3.5" />
              </Button>
            </a>
            <Link to="/documents" search={{ view: "official" }}>
              <Button variant="outline">Official school documents (incl. TC)</Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    </PageStack>
  );

  return (
    <AppShell title={CERT_VIEW_TITLES[view]} subtitle={subtitle}>
      <ModuleHero
        eyebrow="Institute"
        title={CERT_VIEW_TITLES[view]}
        subtitle={subtitle}
      />
      <CertHubNav active={view} />
      <PublishedCertificateCatalogView
        section={view}
        catalogTemplates={catalogTemplatesForView}
        catalogBlocked={apiMode && !catalogListView.rowsValid}
        catalogHint={catalogHint}
        writesEnabled={writesEnabled}
        activeInstituteId={instituteCtx.activeInstituteId}
        issuedRecords={issuedRecordsForView}
        issuedListBlocked={apiMode && !issuedListView.rowsValid}
        issuedListHint={issuedHint}
        verifyPanel={verifyPanel}
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
