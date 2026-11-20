import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Modal,
  PageStack,
  Pill,
  SearchInput,
  Select,
  TextInput,
} from "@lumenx/ui-admin";
import { Globe, Loader2 } from "lucide-react";
import { useAdminToast } from "@/components/AdminActionToast";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import {
  filterDocumentsHubTemplates,
  getGeneratedDocumentSignedUrl,
  loadDocumentsPublishedList,
  loadDocumentsTemplatesList,
  republishGeneratedDocument,
  resolveDocumentsGeneratedListView,
  shouldCommitDocumentsGeneratedLoad,
  shouldCommitDocumentsTemplatesLoad,
  type DocumentsGeneratedListStatus,
} from "@/lib/documents";
import type { GeneratedDocument } from "@/lib/template-management/types";
import type { TemplateRecord } from "@/lib/template-management/types";
import {
  filterPublishedItems,
  sortPublishedItems,
  templateFilterOptions,
  type PublishedListSort,
} from "@/lib/docs-certs/published-list";

function hint(status: DocumentsGeneratedListStatus, error: string | null): string | null {
  if (status === "loading") return "Loading published documents…";
  if (status === "needs_institute") return "Select an institute to load published documents.";
  if (status === "forbidden") return error ?? "Access denied.";
  if (status === "error") return error ?? "Failed to load published documents.";
  if (status === "empty") return "No published documents for this institute.";
  return null;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** API-mode published catalog — searchable, template-filtered, newest first. */
export function DocPublishedApiPanel() {
  const notify = useAdminToast();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(true, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });

  const [items, setItems] = useState<GeneratedDocument[]>([]);
  const [status, setStatus] = useState<DocumentsGeneratedListStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [resolvedFor, setResolvedFor] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [query, setQuery] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [sort, setSort] = useState<PublishedListSort>("published_desc");
  const [selected, setSelected] = useState<GeneratedDocument | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const activeRef = useRef(instituteCtx.activeInstituteId);
  activeRef.current = instituteCtx.activeInstituteId;

  useEffect(() => {
    if (instituteCtx.status === "loading") {
      setItems([]);
      setStatus("loading");
      setError(null);
      setResolvedFor(null);
      return;
    }
    if (instituteCtx.status === "error" || instituteCtx.status === "forbidden") {
      setItems([]);
      setStatus(instituteCtx.status === "forbidden" ? "forbidden" : "error");
      setError(instituteCtx.errorMessage);
      setResolvedFor(null);
      return;
    }
    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setItems([]);
      setStatus("needs_institute");
      setError(null);
      setResolvedFor(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setStatus("loading");
    setError(null);
    void Promise.all([
      loadDocumentsPublishedList(requestInstituteId),
      loadDocumentsTemplatesList(requestInstituteId),
    ]).then(([published, tpl]) => {
      if (
        !shouldCommitDocumentsGeneratedLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeRef.current,
        })
      ) {
        return;
      }
      setItems(published.items);
      setStatus(published.status);
      setError(published.errorMessage);
      setResolvedFor(requestInstituteId);
      if (
        shouldCommitDocumentsTemplatesLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeRef.current,
        })
      ) {
        setTemplates(filterDocumentsHubTemplates(tpl.items));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    reloadKey,
  ]);

  const view = resolveDocumentsGeneratedListView({
    apiMode: true,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId: resolvedFor,
    storedItems: items,
    storedStatus: status,
    storedErrorMessage: error,
    instituteErrorMessage: instituteCtx.errorMessage,
  });
  const message = hint(view.status, view.errorMessage);

  const listRows = useMemo(() => {
    const mapped = (view.rowsValid ? view.items : []).map((d) => {
      const classSection =
        [d.classLabel, d.sectionLabel].filter(Boolean).join("-") || null;
      return {
        id: d.id,
        studentName: d.recipientName,
        classSection,
        templateId: d.templateId,
        templateName: d.templateName,
        documentNumber: d.certificateNumber ?? null,
        publishedAt: d.publishedAt,
        status: d.workflowState,
        raw: d,
      };
    });
    const filtered = filterPublishedItems(mapped, { query, templateId });
    return sortPublishedItems(filtered, sort);
  }, [view.items, view.rowsValid, query, templateId, sort]);

  const templateOptions = templateFilterOptions(
    templates.map((t) => ({ id: t.id, name: t.name })),
  );
  const activeTemplateName =
    templateOptions.find((t) => t.id === templateId)?.name ?? null;

  const openItem = (doc: GeneratedDocument) => {
    setSelected(doc);
    setEditTitle(doc.templateName);
  };

  const download = async (doc: GeneratedDocument) => {
    try {
      const { signedUrl } = await getGeneratedDocumentSignedUrl(doc.id);
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Download unavailable");
    }
  };

  const republish = async () => {
    if (!selected || !writesEnabled || busy) return;
    setBusy(true);
    try {
      const updated = await republishGeneratedDocument(selected.id, {
        title: editTitle.trim() || selected.templateName,
        notify: true,
      });
      notify("Document republished");
      setSelected({
        ...selected,
        templateName: updated.title,
        publishedAt: updated.publishedAt,
        certificateNumber: updated.certificateNumber ?? undefined,
      });
      setReloadKey((k) => k + 1);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Republish failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageStack>
      <Card>
        <CardHeader
          title="Published documents"
          hint="Newest first · filter by template · open to edit and republish"
        />
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Search" className="min-w-[14rem] flex-1">
              <SearchInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Student, number, template…"
              />
            </Field>
            <Field label="Template" className="min-w-[12rem]">
              <Select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
              >
                <option value="">All templates</option>
                {templateOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Sort" className="min-w-[10rem]">
              <Select
                value={sort}
                onChange={(e) => setSort(e.target.value as PublishedListSort)}
              >
                <option value="published_desc">Newest first</option>
                <option value="published_asc">Oldest first</option>
                <option value="student_asc">Student A–Z</option>
              </Select>
            </Field>
            {templateId ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setTemplateId("")}
              >
                Clear template filter
              </Button>
            ) : null}
          </div>
          {activeTemplateName ? (
            <p className="text-xs text-muted-foreground">
              Showing template:{" "}
              <span className="font-medium text-foreground">{activeTemplateName}</span>
            </p>
          ) : null}

          {!view.rowsValid || view.status === "empty" ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {message ?? "…"}
            </p>
          ) : listRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No published documents match the current filters.
            </p>
          ) : (
            <ul className="divide-y divide-border/50 rounded-xl border border-border">
              {listRows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className="w-full px-4 py-3 flex flex-wrap items-center gap-3 text-left hover:bg-surface-hover"
                    onClick={() => openItem(row.raw)}
                  >
                    <Globe className="size-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {row.studentName}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {row.classSection ? `${row.classSection} · ` : ""}
                        {row.templateName}
                        {row.documentNumber ? ` · ${row.documentNumber}` : ""}
                        {` · ${formatDate(row.publishedAt)}`}
                      </div>
                    </div>
                    <Pill tone="success">published</Pill>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Published document"
      >
        {selected ? (
          <div className="space-y-4">
            <div className="text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Student:</span>{" "}
                {selected.recipientName}
              </p>
              <p>
                <span className="text-muted-foreground">Template:</span>{" "}
                {selected.templateName}
              </p>
              <p>
                <span className="text-muted-foreground">Number:</span>{" "}
                {selected.certificateNumber ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Published:</span>{" "}
                {formatDate(selected.publishedAt)}
              </p>
            </div>
            <Field label="Title">
              <TextInput
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                disabled={!writesEnabled || busy}
              />
            </Field>
            <p className="text-[11px] text-muted-foreground">
              Republish regenerates the PDF and notifies student/parent accounts
              again. The document number is preserved.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void download(selected)}
              >
                Download
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={!writesEnabled || busy}
                onClick={() => void republish()}
              >
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Republish
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </PageStack>
  );
}
