import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BellRing, ArrowRight, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { LeaveRequestCard } from "@/components/app/leave/LeaveRequestCard";
import { leaveStore } from "@/lib/leave-store";
import { alertStore } from "@/lib/alert-store";
import { selectPendingLeaveRequests } from "@/lib/leave-utils";
import { Badge } from "@lumenx/ui";
import type { ReactNode } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useApp } from "@/lib/app-state";
import { useTeacherPortal } from "@/context/TeacherPortalContext";
import { getTeacherPortalApiCache } from "@/lib/teacher-classes";
import {
  decideStudentLeave,
  loadTeacherLeavePortal,
  type ConnectLeaveRequest,
} from "@/lib/leave";
import { loadConnectPortalInbox } from "@/lib/connect-inbox/load";
import { setConnectTeacherLeaveAlertCount } from "@/lib/use-connect-alert-badge";
import { useSyncExternalStore } from "react";

/** Teacher-facing leave alerts with Accept / Ignore actions. */
export function TeacherLeaveAlertsView() {
  if (isApiAuthMode()) return <ApiTeacherLeaveAlertsView />;
  return <DemoTeacherLeaveAlertsView />;
}

function DemoTeacherLeaveAlertsView() {
  useEffect(() => {
    leaveStore.init();
  }, []);

  const requests = useSyncExternalStore(leaveStore.subscribe, leaveStore.getAll, leaveStore.getAll);
  const pending = useMemo(() => selectPendingLeaveRequests(requests), [requests]);
  const allAlerts = useSyncExternalStore(
    alertStore.subscribe,
    alertStore.getItems,
    alertStore.getItems,
  );
  const leaveAlerts = useMemo(
    () => allAlerts.filter((alert) => alert.category === "leave"),
    [allAlerts],
  );

  return (
    <TeacherLeaveAlertsLayout
      pending={pending}
      leaveLog={leaveAlerts.map((a) => ({
        id: a.id,
        title: a.title,
        summary: a.summary,
        time: a.time,
      }))}
      renderPending={(req) => <LeaveRequestCard key={req.id} request={req} />}
    />
  );
}

function ApiTeacherLeaveAlertsView() {
  const { activeInstituteId } = useApp();
  const portal = useTeacherPortal();
  const [pending, setPending] = useState<ConnectLeaveRequest[]>([]);
  const [leaveLog, setLeaveLog] = useState<
    Array<{ id: string; title: string; summary: string; time: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const teacherId =
    getTeacherPortalApiCache()?.teacherId ?? portal.profile?.id ?? null;

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!activeInstituteId || !portal.isTeacher) {
      setLoading(false);
      setPending([]);
      setLeaveLog([]);
      setConnectTeacherLeaveAlertCount(0);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      loadTeacherLeavePortal({ instituteId: activeInstituteId, teacherId }),
      loadConnectPortalInbox(activeInstituteId),
    ])
      .then(([leaveResult, inbox]) => {
        if (cancelled) return;
        const pendingRows = leaveResult.studentRequests.filter(
          (row) => row.status === "pending",
        );
        setPending(pendingRows);
        setConnectTeacherLeaveAlertCount(pendingRows.length);
        setLeaveLog(
          inbox
            .filter((n) => n.category === "circulars" || (n as { category?: string }).category === "leave")
            .filter((n) => n.title.toLowerCase().includes("leave") || n.desc.toLowerCase().includes("leave"))
            .slice(0, 8)
            .map((n) => ({
              id: n.id,
              title: n.title,
              summary: n.desc,
              time: n.time,
            })),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeInstituteId, portal.isTeacher, teacherId, reloadKey]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground justify-center">
        <Loader2 className="size-4 animate-spin" /> Loading leave alerts…
      </div>
    );
  }

  return (
    <TeacherLeaveAlertsLayout
      pending={pending}
      leaveLog={leaveLog}
      renderPending={(req) => (
        <LeaveRequestCard
          key={req.id}
          request={req}
          apiMode
          requireIgnoreNote
          onApprove={(id) => decideStudentLeave(id, { outcome: "approved", note: "Accepted." })}
          onIgnore={(id, note) =>
            decideStudentLeave(id, { outcome: "ignored", note: note || null })
          }
          onAction={refresh}
        />
      )}
    />
  );
}

function TeacherLeaveAlertsLayout({
  pending,
  leaveLog,
  renderPending,
}: {
  pending: ConnectLeaveRequest[] | ReturnType<typeof leaveStore.getAll>;
  leaveLog: Array<{ id: string; title: string; summary: string; time: string }>;
  renderPending: (req: ConnectLeaveRequest | (typeof pending)[number]) => React.ReactNode;
}) {
  return (
    <div className="min-w-0 max-w-full space-y-6">
      <PageHeader
        title="Leave alerts"
        subtitle="Parent leave requests appear here · Accept or Ignore — status updates instantly for parents"
        action={
          <Link
            to="/leave"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            Full leave module <ArrowRight className="size-3.5" />
          </Link>
        }
      />

      <section className="rounded-2xl border border-warning/35 bg-warning/5 p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <BellRing className="size-4 text-warning-foreground" />
          <h2 className="font-semibold">Action required</h2>
          {pending.length > 0 && (
            <Badge variant="outline" className="border-warning/40 text-warning-foreground">
              {pending.length} pending
            </Badge>
          )}
        </div>
        {pending.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No pending leave requests right now.
          </p>
        ) : (
          <div className="space-y-3">{pending.map((req) => renderPending(req))}</div>
        )}
      </section>

      {leaveLog.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <h2 className="mb-3 font-semibold text-sm text-muted-foreground">
            Leave notification log
          </h2>
          <ul className="space-y-2">
            {leaveLog.map((a) => (
              <li key={a.id} className="rounded-xl border border-border px-3 py-2.5 text-sm">
                <p className="font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.summary}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{a.time}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
