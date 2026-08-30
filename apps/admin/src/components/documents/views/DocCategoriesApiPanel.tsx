import { useEffect, useRef, useState } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  PageStack,
  Pill,
} from "@lumenx/ui-admin";
import { Tags } from "lucide-react";
import { useInstituteContext } from "@/lib/institutes";
import {
  deriveDocumentCategories,
  loadDocumentsTemplatesList,
  resolveDocumentsTemplatesListView,
  shouldCommitDocumentsTemplatesLoad,
  type DocumentsCategoryRow,
  type DocumentsTemplatesListStatus,
} from "@/lib/documents";
import type { TemplateRecord } from "@/lib/template-management/types";

function hint(status: DocumentsTemplatesListStatus, error: string | null): string | null {
  if (status === "loading") return "Loading categories…";
  if (status === "needs_institute") return "Select an institute to load categories.";
  if (status === "forbidden") return error ?? "Access denied.";
  if (status === "error") return error ?? "Failed to load categories.";
  if (status === "empty") return "No template categories yet.";
  return null;
}

/** API-mode categories — derived from template.category (read-only). */
export function DocCategoriesApiPanel() {
  const instituteCtx = useInstituteContext();
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [status, setStatus] = useState<DocumentsTemplatesListStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [resolvedFor, setResolvedFor] = useState<string | null>(null);
  const activeRef = useRef(instituteCtx.activeInstituteId);
  activeRef.current = instituteCtx.activeInstituteId;

  useEffect(() => {
    if (instituteCtx.status === "loading") {
      setTemplates([]);
      setStatus("loading");
      setError(null);
      setResolvedFor(null);
      return;
    }
    if (instituteCtx.status === "error" || instituteCtx.status === "forbidden") {
      setTemplates([]);
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
      setTemplates([]);
      setStatus("needs_institute");
      setError(null);
      setResolvedFor(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setStatus("loading");
    setError(null);
    void loadDocumentsTemplatesList(requestInstituteId).then((next) => {
      if (
        !shouldCommitDocumentsTemplatesLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeRef.current,
        })
      ) {
        return;
      }
      setTemplates(next.items);
      setStatus(next.status);
      setError(next.errorMessage);
      setResolvedFor(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
  ]);

  const view = resolveDocumentsTemplatesListView({
    apiMode: true,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId: resolvedFor,
    storedItems: templates,
    storedStatus: status,
    storedErrorMessage: error,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const categories: DocumentsCategoryRow[] = view.rowsValid
    ? deriveDocumentCategories(view.items)
    : [];
  const message = hint(
    view.rowsValid && categories.length === 0 ? "empty" : view.status,
    view.errorMessage,
  );

  return (
    <PageStack>
      <Card>
        <CardHeader
          title="Categories"
          hint="Derived from template.category · no separate category CRUD table"
        />
        {!view.rowsValid || categories.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">
            {message ?? "…"}
          </p>
        ) : (
          <CardBody>
            <ul className="space-y-3">
              {categories.map((c) => (
                <li
                  key={c.category}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
                >
                  <Tags className="size-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{c.category}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {c.templateCount} template(s) · {c.activeCount} active
                    </div>
                  </div>
                  {c.types.map((t) => (
                    <Pill key={t} tone="neutral">
                      {t}
                    </Pill>
                  ))}
                </li>
              ))}
            </ul>
          </CardBody>
        )}
      </Card>
    </PageStack>
  );
}
