import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardHeader, Kpi, Pill, Button } from "@lumenx/ui-admin";
import { useInstituteContext } from "@/lib/institutes";
import {
  loadDashboardSummary,
  resolveDashboardSummaryView,
  shouldCommitDashboardLoad,
  type DashboardLoadStatus,
  type DashboardSummary,
} from "@/lib/dashboard";
import {
  Users,
  GraduationCap,
  Heart,
  MessageSquareWarning,
  CalendarOff,
  BookOpen,
  ArrowUpRight,
} from "lucide-react";

function statusHint(status: DashboardLoadStatus, error: string | null): string {
  if (status === "loading") return "Loading institute summary…";
  if (status === "needs_institute") return "Select an institute to load dashboard counts.";
  if (status === "forbidden") return error ?? "Access denied for this institute.";
  if (status === "error") return error ?? "Failed to load dashboard summary.";
  return "";
}

export function HomeApiSummaryPanel() {
  const instituteCtx = useInstituteContext();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loadStatus, setLoadStatus] = useState<DashboardLoadStatus>("loading");
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
    void loadDashboardSummary(requestInstituteId).then((next) => {
      if (
        !shouldCommitDashboardLoad({
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

  const view = resolveDashboardSummaryView({
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
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Institute overview"
          hint="Live counts from connected read APIs"
          action={<Pill tone="neutral">Read-only · API mode</Pill>}
        />
        {hint ? (
          <p className="px-4 pb-4 text-sm text-muted-foreground">{hint}</p>
        ) : view.summary ? (
          <div className="px-4 pb-4 lx-kpi-grid">
            <Kpi label="Students" value={String(view.summary.students)} icon={<Users className="size-3.5" />} />
            <Kpi label="Teachers" value={String(view.summary.teachers)} icon={<GraduationCap className="size-3.5" />} />
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
              label="Homework items"
              value={String(view.summary.homeworkItems)}
              icon={<BookOpen className="size-3.5" />}
            />
          </div>
        ) : null}
      </Card>

      {view.rowsValid && view.summary ? (
        <Card>
          <CardHeader title="Needs attention" hint="Actionable items from API-backed modules" />
          <div className="px-4 pb-4 space-y-2">
            {view.summary.openComplaints > 0 ? (
              <Link
                to="/complaints"
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-hover"
              >
                <span>Open complaints</span>
                <span className="flex items-center gap-2">
                  <Pill tone="warning">{view.summary.openComplaints}</Pill>
                  <ArrowUpRight className="size-3.5 text-muted-foreground" />
                </span>
              </Link>
            ) : null}
            {view.summary.pendingLeave > 0 ? (
              <Link
                to="/leave"
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-hover"
              >
                <span>Pending leave requests</span>
                <span className="flex items-center gap-2">
                  <Pill tone="warning">{view.summary.pendingLeave}</Pill>
                  <ArrowUpRight className="size-3.5 text-muted-foreground" />
                </span>
              </Link>
            ) : null}
            {view.summary.openComplaints === 0 && view.summary.pendingLeave === 0 ? (
              <p className="text-sm text-muted-foreground">No actionable API alerts right now.</p>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Quick links" hint="API-backed modules" />
        <div className="px-4 pb-4 flex flex-wrap gap-2">
          <Link to="/students"><Button size="sm" variant="outline">Students</Button></Link>
          <Link to="/attendance"><Button size="sm" variant="outline">Attendance</Button></Link>
          <Link to="/homework"><Button size="sm" variant="outline">Homework</Button></Link>
          <Link to="/fees" search={{ view: "students" }}><Button size="sm" variant="outline">Fees</Button></Link>
        </div>
      </Card>
    </div>
  );
}
