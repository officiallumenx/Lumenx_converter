import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  PageStack,
  Pill,
} from "@lumenx/ui-admin";
import { useInstituteContext } from "@/lib/institutes";
import {
  loadDocumentsPublishedList,
  resolveDocumentsGeneratedListView,
  shouldCommitDocumentsGeneratedLoad,
  type DocumentsGeneratedListStatus,
} from "@/lib/documents";
import type { GeneratedDocument } from "@/lib/template-management/types";
import { ArrowRight, Globe } from "lucide-react";

function hint(status: DocumentsGeneratedListStatus, error: string | null): string | null {
  if (status === "loading") return "Loading published documents…";
  if (status === "needs_institute") return "Select an institute to load published documents.";
  if (status === "forbidden") return error ?? "Access denied.";
  if (status === "error") return error ?? "Failed to load published documents.";
  if (status === "empty") return "No published documents for this institute.";
  return null;
}

/** API-mode published catalog — generated_document where workflow_state=published. */
export function DocPublishedApiPanel() {
  const instituteCtx = useInstituteContext();
  const [items, setItems] = useState<GeneratedDocument[]>([]);
  const [status, setStatus] = useState<DocumentsGeneratedListStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [resolvedFor, setResolvedFor] = useState<string | null>(null);
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
    void loadDocumentsPublishedList(requestInstituteId).then((next) => {
      if (
        !shouldCommitDocumentsGeneratedLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeRef.current,
        })
      ) {
        return;
      }
      setItems(next.items);
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

  return (
    <PageStack>
      <Card>
        <CardHeader
          title="Published documents"
          hint="workflow_state = published · portal visibility from generated records"
          action={
            <Link to="/documents" search={{ view: "generated" }}>
              <Button size="sm" variant="ghost" className="gap-1">
                All generated <ArrowRight className="size-3" />
              </Button>
            </Link>
          }
        />
        {!view.rowsValid || view.status === "empty" ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">
            {message ?? "…"}
          </p>
        ) : (
          <CardBody noPadding>
            <ul className="divide-y divide-border/50">
              {view.items.map((d) => (
                <li
                  key={d.id}
                  className="px-5 py-3 flex flex-wrap items-center gap-3"
                >
                  <Globe className="size-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{d.templateName}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {d.recipientName}
                      {d.publishedAt ? ` · ${d.publishedAt}` : ""}
                    </div>
                  </div>
                  <Pill tone="success">published</Pill>
                  <Pill tone="neutral">{d.kind}</Pill>
                </li>
              ))}
            </ul>
          </CardBody>
        )}
      </Card>
    </PageStack>
  );
}
