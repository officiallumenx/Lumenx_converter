import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, Kpi, Pill } from "@lumenx/ui-admin";
import { useInstituteContext } from "@/lib/institutes";
import {
  loadAnalyticsSummary,
  resolveAnalyticsSummaryView,
  shouldCommitAnalyticsLoad,
  type AnalyticsLoadStatus,
  type AnalyticsSummaryDto,
} from "@/lib/analytics";
import {
  Users,
  GraduationCap,
  Heart,
  MessageSquareWarning,
  CalendarOff,
  BookOpen,
} from "lucide-react";

function statusHint(status: AnalyticsLoadStatus, error: string | null): string {
  if (status === "loading") return "Loading analytics summary…";
  if (status === "needs_institute") return "Select an institute to load analytics.";
  if (status === "forbidden") return error ?? "Access denied for this institute.";
  if (status === "error") return error ?? "Failed to load analytics summary.";
  return "";
}

export function AnalyticsApiSummaryPanel() {
  const instituteCtx = useInstituteContext();
  const [summary, setSummary] = useState<AnalyticsSummaryDto | null>(null);
  const [loadStatus, setLoadStatus] = useState<AnalyticsLoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<string | null>(null);
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  useEffect(() => {
    if (instituteCtx.status === "loading") {
      setSummary(null);
      setLoadStatus("loading");
      setLoadError(null);
      setResolvedForInstituteId(null);
      return;
    }
    if (instituteCtx.status === "error" || instituteCtx.status === "forbidden") {
      setSummary(null);
      setLoadStatus(instituteCtx.status === "forbidden" ? "forbidden" : "error");
      setLoadError(instituteCtx.errorMessage);
      setResolvedForInstituteId(null);
      return;
    }
    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setSummary(null);
      setLoadStatus("needs_institute");
      setLoadError(null);
      setResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setLoadStatus("loading");
    setLoadError(null);
    void loadAnalyticsSummary(requestInstituteId).then((next) => {
      if (
        !shouldCommitAnalyticsLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setSummary(next.summary);
      setLoadStatus(next.status);
      setLoadError(next.errorMessage);
      setResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [instituteCtx.status, instituteCtx.activeInstituteId, instituteCtx.errorMessage]);

  const view = resolveAnalyticsSummaryView({
    apiMode: true,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedSummary: summary,
    storedStatus: loadStatus,
    storedErrorMessage: loadError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const hint = statusHint(view.status, view.errorMessage);

  return (
    <Card>
      <CardHeader
        title="Institute analytics"
        hint="Live counts from analytics aggregate API"
        action={<Pill tone="neutral">Read-only · API mode</Pill>}
      />
      {hint ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground">{hint}</p>
      ) : view.summary ? (
        <div className="px-4 pb-4 lx-kpi-grid">
          <Kpi label="Students" value={String(view.summary.students)} icon={<Users className="size-3.5" />} />
          <Kpi
            label="Teachers"
            value={String(view.summary.teachers)}
            icon={<GraduationCap className="size-3.5" />}
          />
          <Kpi label="Parents" value={String(view.summary.parents)} icon={<Heart className="size-3.5" />} />
          <Kpi
            label="Open complaints"
            value={String(view.summary.openComplaints)}
            icon={<MessageSquareWarning className="size-3.5" />}
          />
          <Kpi
            label="Pending leave"
            value={String(view.summary.pendingLeave)}
            icon={<CalendarOff className="size-3.5" />}
          />
          <Kpi
            label="Homework"
            value={String(view.summary.homeworkItems)}
            icon={<BookOpen className="size-3.5" />}
          />
        </div>
      ) : null}
    </Card>
  );
}
