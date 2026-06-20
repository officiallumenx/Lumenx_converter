import { useEffect, useMemo, useSyncExternalStore } from "react";
import { Link } from "@tanstack/react-router";
import { BellRing, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { LeaveRequestCard } from "@/components/app/leave/LeaveRequestCard";
import { leaveStore } from "@/lib/leave-store";
import { alertStore } from "@/lib/alert-store";
import { Badge } from "@lumenx/ui";

/** Teacher-facing leave alerts with instant approve / reject / ignore actions. */
export function TeacherLeaveAlertsView() {
  useEffect(() => {
    leaveStore.init();
  }, []);

  const requests = useSyncExternalStore(
    leaveStore.subscribe,
    leaveStore.getAll,
    leaveStore.getAll,
  );
  const pending = useMemo(
    () => requests.filter((request) => request.status === "pending"),
    [requests],
  );
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
    <div className="min-w-0 max-w-full space-y-6">
      <PageHeader
        title="Leave alerts"
        subtitle="Parent leave requests appear here · Approve, reject, or ignore — status updates instantly for parents"
        action={
          <Link to="/leave" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
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
          <div className="space-y-3">
            {pending.map((req) => (
              <LeaveRequestCard key={req.id} request={req} />
            ))}
          </div>
        )}
      </section>

      {leaveAlerts.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <h2 className="mb-3 font-semibold text-sm text-muted-foreground">Leave notification log</h2>
          <ul className="space-y-2">
            {leaveAlerts.slice(0, 8).map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-border px-3 py-2.5 text-sm"
              >
                <p className="font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.summary}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{a.time}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* re-render when requests change */}
      <span className="sr-only">{requests.length}</span>
    </div>
  );
}
