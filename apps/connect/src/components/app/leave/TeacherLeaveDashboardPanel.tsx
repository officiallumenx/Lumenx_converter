import { useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BellRing, Loader2 } from "lucide-react";
import { Badge } from "@lumenx/ui";
import { LeaveRequestCard } from "@/components/app/leave/LeaveRequestCard";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useApp } from "@/lib/app-state";
import { useTeacherPortal } from "@/context/TeacherPortalContext";
import { decideStudentLeave } from "@/lib/leave";
import { useTeacherLeaveQuery } from "@/lib/connect-queries/hooks";
import { setConnectTeacherLeaveAlertCount } from "@/lib/use-connect-alert-badge";

/** Dashboard widget — pending leave with inline Accept / Ignore (API-only). */
export function TeacherLeaveDashboardPanel() {
  const { activeInstituteId } = useApp();
  const portal = useTeacherPortal();
  const teacherId = portal.teacherId ?? portal.profile?.id ?? null;

  const enabled = isApiAuthMode() && Boolean(activeInstituteId) && portal.isTeacher;
  const { data, isLoading, refresh } = useTeacherLeaveQuery(
    activeInstituteId,
    teacherId,
    enabled,
  );

  const pending = useMemo(
    () => (data?.studentRequests ?? []).filter((row) => row.status === "pending"),
    [data?.studentRequests],
  );

  useEffect(() => {
    if (!enabled) {
      setConnectTeacherLeaveAlertCount(0);
      return;
    }
    if (data) {
      setConnectTeacherLeaveAlertCount(pending.length);
    }
  }, [enabled, data, pending.length]);

  const pendingPreview = useMemo(() => pending.slice(0, 2), [pending]);
  const loading = enabled && isLoading && !data;

  return (
    <section className="rounded-2xl border border-warning/30 bg-card p-4 shadow-soft sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BellRing className="size-4 text-warning-foreground" />
          <h2 className="font-semibold">Leave alerts</h2>
          {pending.length > 0 && (
            <Badge
              variant="outline"
              className="border-warning/40 text-warning-foreground text-[10px]"
            >
              {pending.length} pending
            </Badge>
          )}
        </div>
        <Link
          to="/leave"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Manage <ArrowRight className="size-3" />
        </Link>
      </div>
      {loading ? (
        <p className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Loading leave…
        </p>
      ) : pendingPreview.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">No pending leave requests.</p>
      ) : (
        <div className="space-y-3">
          {pendingPreview.map((req) => (
            <LeaveRequestCard
              key={req.id}
              request={req}
              compact
              apiMode
              requireIgnoreNote
              onApprove={(id) => {
                void decideStudentLeave(id, { outcome: "approved", note: "Accepted." });
              }}
              onIgnore={(id, note) => {
                void decideStudentLeave(id, { outcome: "ignored", note: note || null });
              }}
              onAction={refresh}
            />
          ))}
        </div>
      )}
    </section>
  );
}
