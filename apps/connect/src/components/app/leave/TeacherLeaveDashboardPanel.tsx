import { useEffect, useSyncExternalStore } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BellRing } from "lucide-react";
import { Badge } from "@lumenx/ui";
import { LeaveRequestCard } from "@/components/app/leave/LeaveRequestCard";
import { leaveStore } from "@/lib/leave-store";

/** Dashboard widget — pending leave with inline approve / reject / ignore. */
export function TeacherLeaveDashboardPanel() {
  useEffect(() => {
    leaveStore.init();
  }, []);

  const requests = useSyncExternalStore(
    leaveStore.subscribe,
    leaveStore.getAll,
    leaveStore.getAll,
  );
  const pending = leaveStore.getPending().slice(0, 2);

  return (
    <section className="rounded-2xl border border-warning/30 bg-card p-4 shadow-soft sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BellRing className="size-4 text-warning-foreground" />
          <h2 className="font-semibold">Leave alerts</h2>
          {pending.length > 0 && (
            <Badge variant="outline" className="border-warning/40 text-warning-foreground text-[10px]">
              {leaveStore.getPending().length} pending
            </Badge>
          )}
        </div>
        <Link to="/leave" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          Manage <ArrowRight className="size-3" />
        </Link>
      </div>
      {pending.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">No pending leave requests.</p>
      ) : (
        <div className="space-y-3">
          {pending.map((req) => (
            <LeaveRequestCard key={req.id} request={req} compact />
          ))}
        </div>
      )}
      <span className="sr-only">{requests.length}</span>
    </section>
  );
}
