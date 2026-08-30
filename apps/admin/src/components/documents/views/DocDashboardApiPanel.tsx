import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Kpi,
  KpiGrid,
  PageStack,
  Pill,
} from "@lumenx/ui-admin";
import { ArrowRight, FolderCheck, Globe, Wand2 } from "lucide-react";
import { useInstituteContext } from "@/lib/institutes";
import {
  loadDocumentsHubSummary,
  shouldCommitDocumentsTemplatesLoad,
  type DocumentsHubSummaryState,
  type DocumentsListStatus,
} from "@/lib/documents";

function hint(status: DocumentsListStatus, error: string | null): string | null {
  if (status === "loading") return "Loading documents hub…";
  if (status === "needs_institute") return "Select an institute to load the documents hub.";
  if (status === "forbidden") return error ?? "Access denied.";
  if (status === "error") return error ?? "Failed to load documents hub.";
  if (status === "empty") return "No templates or generated documents yet.";
  return null;
}

const emptySummary = (): DocumentsHubSummaryState => ({
  status: "loading",
  kpis: {
    activeTemplates: 0,
    draftTemplates: 0,
    totalGenerated: 0,
    publishedCount: 0,
    inReviewCount: 0,
    rejectedCount: 0,
  },
  recentGenerated: [],
  categories: [],
  errorMessage: null,
});

/** API-mode dashboard — KPIs derived from templates + generated lists. */
export function DocDashboardApiPanel() {
  const instituteCtx = useInstituteContext();
  const [summary, setSummary] = useState<DocumentsHubSummaryState>(emptySummary);
  const [resolvedFor, setResolvedFor] = useState<string | null>(null);
  const activeRef = useRef(instituteCtx.activeInstituteId);
  activeRef.current = instituteCtx.activeInstituteId;

  useEffect(() => {
    if (instituteCtx.status === "loading") {
      setSummary(emptySummary());
      setResolvedFor(null);
      return;
    }
    if (instituteCtx.status === "error" || instituteCtx.status === "forbidden") {
      setSummary({
        ...emptySummary(),
        status: instituteCtx.status === "forbidden" ? "forbidden" : "error",
        errorMessage: instituteCtx.errorMessage,
      });
      setResolvedFor(null);
      return;
    }
    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setSummary({ ...emptySummary(), status: "needs_institute" });
      setResolvedFor(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setSummary((s) => ({ ...s, status: "loading", errorMessage: null }));
    void loadDocumentsHubSummary(requestInstituteId).then((next) => {
      if (
        !shouldCommitDocumentsTemplatesLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeRef.current,
        })
      ) {
        return;
      }
      setSummary(next);
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

  const rowsValid =
    resolvedFor === instituteCtx.activeInstituteId &&
    (summary.status === "ready" || summary.status === "empty");
  const message = hint(summary.status, summary.errorMessage);

  if (!rowsValid) {
    return (
      <p className="text-sm text-muted-foreground px-1 py-6">
        {message ?? "Loading…"}
      </p>
    );
  }

  const { kpis } = summary;

  return (
    <PageStack>
      <KpiGrid cols={4}>
        <Kpi label="Active templates" value={String(kpis.activeTemplates)} />
        <Kpi label="Generated docs" value={String(kpis.totalGenerated)} />
        <Kpi label="Published" value={String(kpis.publishedCount)} tone="up" />
        <Kpi
          label="In review"
          value={String(kpis.inReviewCount)}
          tone={kpis.inReviewCount > 0 ? "down" : "neutral"}
        />
      </KpiGrid>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-4">
          <CardHeader title="Quick actions" />
          <CardBody>
            <div className="flex flex-col gap-2">
              <Link to="/documents" search={{ view: "generate" }}>
                <Button variant="primary" className="w-full justify-start gap-2">
                  <Wand2 className="size-3.5" /> Generate document
                </Button>
              </Link>
              <Link to="/documents" search={{ view: "generated" }}>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <FolderCheck className="size-3.5" /> Generated history
                </Button>
              </Link>
              <Link to="/documents" search={{ view: "published" }}>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Globe className="size-3.5" /> Published
                </Button>
              </Link>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Requests, packages, signatures, and studio settings remain unavailable
              (no backend schema).
            </p>
          </CardBody>
        </Card>

        <Card className="col-span-12 lg:col-span-8">
          <CardHeader
            title="Recent generated"
            action={
              <Link to="/documents" search={{ view: "generated" }}>
                <Button size="sm" variant="ghost" className="gap-1">
                  All <ArrowRight className="size-3" />
                </Button>
              </Link>
            }
          />
          <CardBody noPadding>
            {summary.recentGenerated.length === 0 ? (
              <p className="px-4 py-8 text-sm text-muted-foreground text-center">
                No generated documents yet.
              </p>
            ) : (
              <ul className="divide-y divide-border/50">
                {summary.recentGenerated.map((d) => (
                  <li
                    key={d.id}
                    className="px-4 py-3 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{d.templateName}</div>
                      <div className="text-[11px] text-muted-foreground font-mono truncate">
                        {d.recipientName}
                      </div>
                    </div>
                    <Pill
                      tone={
                        d.workflowState === "published"
                          ? "success"
                          : d.workflowState === "rejected"
                            ? "danger"
                            : "info"
                      }
                    >
                      {d.workflowState.replace(/_/g, " ")}
                    </Pill>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </PageStack>
  );
}
