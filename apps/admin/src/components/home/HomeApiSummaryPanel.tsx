import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardHeader, Kpi, Pill, Button, EmptyState } from "@lumenx/ui-admin";
import { useInstituteContext } from "@/lib/institutes";
import {
  loadDashboardSummary,
  loadDashboardWidgets,
  resolveDashboardSummaryView,
  shouldCommitDashboardLoad,
  type DashboardLoadStatus,
  type DashboardSummary,
  type DashboardWidgetsState,
} from "@/lib/dashboard";
import {
  Users,
  GraduationCap,
  Heart,
  MessageSquareWarning,
  CalendarOff,
  BookOpen,
  ArrowUpRight,
  Cake,
  BookMarked,
  ClipboardList,
  FileCheck2,
  Bus,
} from "lucide-react";
import {
  HomeAttendanceMissingSectionsUnavailableCard,
} from "@/components/home/HomeApiUnavailableCards";
import { listTransportEmergencies } from "@/lib/transport/ops-api";
import { syncPendingReviewsComplaintsApi } from "@/lib/pending-reviews";
import { IconChip } from "@/components/IconChip";

function statusHint(status: DashboardLoadStatus, error: string | null): string {
  if (status === "loading") return "Loading institute summary…";
  if (status === "needs_institute") return "Select an institute to load dashboard counts.";
  if (status === "forbidden") return error ?? "Access denied for this institute.";
  if (status === "error") return error ?? "Failed to load dashboard summary.";
  return "";
}

function emptyWidgets(): DashboardWidgetsState {
  return {
    status: "loading",
    birthdays: { status: "empty", rows: [], errorMessage: null },
    diary: { status: "empty", rows: [], todaySubmittedCount: 0, missingYesterdayCount: 0, errorMessage: null },
    attendanceDrafts: { status: "empty", rows: [], errorMessage: null },
    marksPending: { status: "empty", rows: [], errorMessage: null },
    errorMessage: null,
  };
}

function formatSubmittedAt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function HomeApiSummaryPanel() {
  const instituteCtx = useInstituteContext();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loadStatus, setLoadStatus] = useState<DashboardLoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [widgets, setWidgets] = useState<DashboardWidgetsState>(emptyWidgets);
  const [transportEmergencies, setTransportEmergencies] = useState<
    Awaited<ReturnType<typeof listTransportEmergencies>>
  >([]);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<string | null>(null);
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  useEffect(() => {
    if (instituteCtx.status === "loading") {
      setSummary(null);
      setLoadStatus("loading");
      setLoadError(null);
      setWidgets(emptyWidgets());
      setResolvedForInstituteId(null);
      return;
    }
    if (instituteCtx.status === "error" || instituteCtx.status === "forbidden") {
      setSummary(null);
      setLoadStatus(instituteCtx.status === "forbidden" ? "forbidden" : "error");
      setLoadError(instituteCtx.errorMessage);
      setWidgets(emptyWidgets());
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
      setWidgets(emptyWidgets());
      setResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setLoadStatus("loading");
    setLoadError(null);
    setWidgets((w) => ({ ...w, status: "loading" }));

    void Promise.all([
      loadDashboardSummary(requestInstituteId),
      loadDashboardWidgets(requestInstituteId),
      listTransportEmergencies({ instituteId: requestInstituteId, status: "active" }).catch(
        () => [],
      ),
    ]).then(([summaryNext, widgetsNext, emergencies]) => {
      if (
        !shouldCommitDashboardLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setSummary(summaryNext.summary);
      setLoadStatus(summaryNext.status);
      setLoadError(summaryNext.errorMessage);
      setWidgets(widgetsNext);
      setTransportEmergencies(emergencies);
      setResolvedForInstituteId(requestInstituteId);
      if (summaryNext.summary) {
        syncPendingReviewsComplaintsApi(
          requestInstituteId,
          summaryNext.summary.pendingLeave,
        );
      }
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

  const widgetsValid =
    resolvedForInstituteId === instituteCtx.activeInstituteId &&
    (widgets.status === "ready" ||
      widgets.status === "error" ||
      widgets.status === "forbidden");

  const hint = statusHint(view.status, view.errorMessage);

  const attentionItems: Array<{
    id: string;
    label: string;
    count: number;
    to: "/complaints" | "/leave" | "/attendance" | "/marks" | "/diary" | "/transport";
  }> = [];
  if (view.rowsValid && view.summary) {
    if (view.summary.openComplaints > 0) {
      attentionItems.push({
        id: "complaints",
        label: "Open complaints",
        count: view.summary.openComplaints,
        to: "/complaints",
      });
    }
    if (view.summary.pendingLeave > 0) {
      attentionItems.push({
        id: "leave",
        label: "Pending leave requests",
        count: view.summary.pendingLeave,
        to: "/leave",
      });
    }
  }
  if (widgetsValid && widgets.attendanceDrafts.status !== "error") {
    const n = widgets.attendanceDrafts.rows.length;
    if (n > 0) {
      attentionItems.push({
        id: "attendance-drafts",
        label: "Attendance drafts awaiting submit",
        count: n,
        to: "/attendance",
      });
    }
  }
  if (widgetsValid && widgets.marksPending.status !== "error") {
    const n = widgets.marksPending.rows.length;
    if (n > 0) {
      attentionItems.push({
        id: "marks-pending",
        label: "Mark entries awaiting publish",
        count: n,
        to: "/marks",
      });
    }
  }
  if (widgetsValid && widgets.diary.status !== "error") {
    const n = widgets.diary.missingYesterdayCount;
    if (n > 0) {
      attentionItems.push({
        id: "diary-missing",
        label: "Teachers missing yesterday diary",
        count: n,
        to: "/diary",
      });
    }
  }
  if (transportEmergencies.length > 0) {
    attentionItems.push({
      id: "transport-sos",
      label: "Transport emergencies",
      count: transportEmergencies.length,
      to: "/transport",
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Institute overview"
          hint="Live counts from GET /api/v1/analytics"
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

      {view.rowsValid || widgetsValid ? (
        <Card>
          <CardHeader title="Needs attention" hint="Actionable items from API-backed modules" />
          <div className="px-4 pb-4 space-y-2">
            {attentionItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No actionable API alerts right now.</p>
            ) : (
              attentionItems.map((item) => (
                <Link
                  key={item.id}
                  to={item.to}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-hover"
                >
                  <span>{item.label}</span>
                  <span className="flex items-center gap-2">
                    <Pill tone="warning">{item.count}</Pill>
                    <ArrowUpRight className="size-3.5 text-muted-foreground" />
                  </span>
                </Link>
              ))
            )}
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Quick links" hint="API-backed modules" />
        <div className="px-4 pb-4 flex flex-wrap gap-2">
          <Link to="/students"><Button size="sm" variant="outline">Students</Button></Link>
          <Link to="/teachers"><Button size="sm" variant="outline">Teachers</Button></Link>
          <Link to="/attendance"><Button size="sm" variant="outline">Attendance</Button></Link>
          <Link to="/diary"><Button size="sm" variant="outline">Diary</Button></Link>
          <Link to="/marks"><Button size="sm" variant="outline">Marks</Button></Link>
          <Link to="/homework"><Button size="sm" variant="outline">Homework</Button></Link>
          <Link to="/fees" search={{ view: "students" }}><Button size="sm" variant="outline">Fees</Button></Link>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Today's birthdays"
            hint="From student & teacher date_of_birth · no WhatsApp wish in API mode"
            action={
              widgetsValid && widgets.birthdays.status !== "error" ? (
                <Pill tone={widgets.birthdays.rows.length > 0 ? "info" : "neutral"}>
                  {widgets.birthdays.rows.length}
                </Pill>
              ) : null
            }
          />
          <div className="px-3 pb-3">
            {!widgetsValid ? (
              <p className="text-sm text-muted-foreground px-1">Loading birthdays…</p>
            ) : widgets.birthdays.status === "error" ? (
              <p className="text-sm text-muted-foreground px-1">
                {widgets.birthdays.errorMessage ?? "Failed to load birthdays."}
              </p>
            ) : widgets.birthdays.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground px-1">No birthdays today.</p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {widgets.birthdays.rows.map((person) => (
                  <li key={`${person.role}-${person.id}`} className="flex items-center gap-2.5 px-2.5 py-2">
                    <IconChip icon={Cake} size="sm" variant="brand" />
                    <span className="min-w-0 flex-1">
                      {person.role === "Student" ? (
                        <Link
                          to="/students/$id"
                          params={{ id: person.id }}
                          className="block text-sm font-semibold text-foreground hover:underline"
                        >
                          {person.name}
                        </Link>
                      ) : (
                        <Link to="/teachers" className="block text-sm font-semibold text-foreground hover:underline">
                          {person.name}
                        </Link>
                      )}
                      <span className="block text-[11px] text-muted-foreground">
                        {person.role} · {person.detail}
                        {person.turningAge != null ? ` · Turning ${person.turningAge}` : ""}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Diary submissions"
            hint="Recent submitted diary days (last 7 days)"
            action={
              <div className="flex items-center gap-1.5">
                {widgetsValid && widgets.diary.status !== "error" ? (
                  <Pill tone={widgets.diary.todaySubmittedCount > 0 ? "info" : "neutral"}>
                    {widgets.diary.todaySubmittedCount > 0
                      ? `${widgets.diary.todaySubmittedCount} today`
                      : `${widgets.diary.rows.length} recent`}
                  </Pill>
                ) : null}
                <Link to="/diary">
                  <Button size="sm" variant="outline" className="gap-1.5">
                    Open
                    <ArrowUpRight className="size-3.5" />
                  </Button>
                </Link>
              </div>
            }
          />
          <div className="px-3 pb-3">
            {!widgetsValid ? (
              <p className="text-sm text-muted-foreground px-1">Loading diary…</p>
            ) : widgets.diary.status === "error" ? (
              <p className="text-sm text-muted-foreground px-1">
                {widgets.diary.errorMessage ?? "Failed to load diary."}
              </p>
            ) : widgets.diary.rows.length === 0 ? (
              <EmptyState
                icon={<BookMarked className="size-5" />}
                title="No submissions yet"
                hint="Submitted diary days from teachers appear here."
              />
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {widgets.diary.rows.map((row) => (
                  <li key={row.id} className="flex items-center gap-2.5 px-2.5 py-2">
                    <IconChip icon={BookMarked} size="sm" variant="soft" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{row.diaryDate}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {row.scope} · {row.rowCount} entr{row.rowCount === 1 ? "y" : "ies"} ·{" "}
                        {formatSubmittedAt(row.submittedAt)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Attendance drafts today"
            hint="Registers with status draft for today · not a full missing-sections matrix"
            action={
              <div className="flex items-center gap-1.5">
                {widgetsValid && widgets.attendanceDrafts.status !== "error" ? (
                  <Pill tone={widgets.attendanceDrafts.rows.length > 0 ? "warning" : "neutral"}>
                    {widgets.attendanceDrafts.rows.length}
                  </Pill>
                ) : null}
                <Link to="/attendance">
                  <Button size="sm" variant="outline" className="gap-1.5">
                    Open
                    <ArrowUpRight className="size-3.5" />
                  </Button>
                </Link>
              </div>
            }
          />
          <div className="px-3 pb-3">
            {!widgetsValid ? (
              <p className="text-sm text-muted-foreground px-1">Loading attendance…</p>
            ) : widgets.attendanceDrafts.status === "error" ? (
              <p className="text-sm text-muted-foreground px-1">
                {widgets.attendanceDrafts.errorMessage ?? "Failed to load attendance drafts."}
              </p>
            ) : widgets.attendanceDrafts.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground px-1">
                No draft attendance registers for today.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {widgets.attendanceDrafts.rows.slice(0, 8).map((row) => (
                  <li key={row.id} className="flex items-center gap-2.5 px-2.5 py-2">
                    <IconChip icon={ClipboardList} size="sm" variant="soft" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{row.slotLabel}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {row.attendanceDate} · section {row.sectionId.slice(0, 8)}…
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Pending mark reviews"
            hint="Mark entries with status submitted · awaiting publish"
            action={
              <div className="flex items-center gap-1.5">
                {widgetsValid && widgets.marksPending.status !== "error" ? (
                  <Pill tone={widgets.marksPending.rows.length > 0 ? "warning" : "neutral"}>
                    {widgets.marksPending.rows.length}
                  </Pill>
                ) : null}
                <Link to="/marks">
                  <Button size="sm" variant="outline" className="gap-1.5">
                    Open
                    <ArrowUpRight className="size-3.5" />
                  </Button>
                </Link>
              </div>
            }
          />
          <div className="px-3 pb-3">
            {!widgetsValid ? (
              <p className="text-sm text-muted-foreground px-1">Loading marks…</p>
            ) : widgets.marksPending.status === "error" ? (
              <p className="text-sm text-muted-foreground px-1">
                {widgets.marksPending.errorMessage ?? "Failed to load pending marks."}
              </p>
            ) : widgets.marksPending.rows.length === 0 ? (
              <EmptyState
                icon={<FileCheck2 className="size-5" />}
                title="Nothing to review"
                hint="Submitted mark entries awaiting publish appear here."
              />
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {widgets.marksPending.rows.slice(0, 8).map((row) => (
                  <li key={row.id} className="flex items-center gap-2.5 px-2.5 py-2">
                    <IconChip icon={FileCheck2} size="sm" variant="soft" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">Entry {row.id.slice(0, 8)}…</span>
                      <span className="block text-[11px] text-muted-foreground">
                        Submitted {formatSubmittedAt(row.submittedAt)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <HomeAttendanceMissingSectionsUnavailableCard />

        <Card>
          <CardHeader
            title="Transport emergencies"
            hint="Active driver SOS from GET /api/v1/transport/emergencies"
            action={
              transportEmergencies.length > 0 ? (
                <Pill tone="danger">{transportEmergencies.length} active</Pill>
              ) : (
                <Pill tone="neutral">0 active</Pill>
              )
            }
          />
          <div className="px-3 pb-3">
            {transportEmergencies.length === 0 ? (
              <p className="text-sm text-muted-foreground px-1">No active transport emergencies.</p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {transportEmergencies.slice(0, 6).map((row) => (
                  <li key={row.id} className="flex items-center gap-2.5 px-2.5 py-2">
                    <IconChip icon={Bus} size="sm" variant="soft" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        {row.routeName?.trim() || row.vehicleNumber?.trim() || "Emergency"}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        {row.driverName?.trim() || "Driver"} · {row.status}
                      </span>
                    </span>
                    <Link to="/transport" search={{ view: "emergencies" }}>
                      <Button size="sm" variant="outline">
                        Open
                      </Button>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
