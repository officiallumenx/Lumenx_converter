import type { LeaveRequest } from "@lumenx/types";
import { Button, cn } from "@lumenx/ui";
import { CalendarOff, Check, X, EyeOff } from "lucide-react";
import { LeaveStatusBadge } from "@/components/app/leave/LeaveStatusBadge";
import { formatLeaveRequestDates, classTag, leaveDayCount } from "@/lib/leave-utils";
import { leaveStore } from "@/lib/leave-store";
import { toast } from "sonner";

export function LeaveRequestCard({
  request,
  compact = false,
  onAction,
}: {
  request: LeaveRequest;
  compact?: boolean;
  onAction?: () => void;
}) {
  const isPending = request.status === "pending";

  const act = (fn: () => void, message: string) => {
    fn();
    toast.success(message, {
      description: "Parent notified instantly via Alerts.",
    });
    onAction?.();
  };

  return (
    <article
      className={cn(
        "rounded-2xl border bg-card shadow-soft overflow-hidden",
        isPending ? "border-warning/40" : "border-border",
      )}
    >
      <div className={cn("h-1 w-full", isPending ? "bg-warning" : "bg-muted")} />
      <div className={compact ? "p-3" : "p-4 sm:p-5"}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CalendarOff className="size-4 shrink-0 text-primary" />
              <p className="font-semibold leading-snug">{request.childName}</p>
              <LeaveStatusBadge status={request.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {classTag(request.className, request.section)} · {formatLeaveRequestDates(request)}
              {leaveDayCount(request) > 1 && ` (${leaveDayCount(request)} days)`}
            </p>
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0">{request.appliedAt}</span>
        </div>

        <p className={cn("text-sm leading-relaxed", compact ? "mt-2 line-clamp-2" : "mt-3")}>
          {request.description}
        </p>

        {request.teacherNote && !isPending && (
          <p className="mt-2 text-xs text-muted-foreground rounded-lg bg-muted/30 px-3 py-2">
            {request.teacherNote}
          </p>
        )}

        {isPending && (
          <div className={cn("flex flex-wrap gap-2", compact ? "mt-3" : "mt-4")}>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() =>
                act(
                  () => leaveStore.approve(request.id),
                  "Leave approved — attendance updated for each day",
                )
              }
            >
              <Check className="size-3.5" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={() => act(() => leaveStore.reject(request.id), "Leave rejected")}
            >
              <X className="size-3.5" />
              Reject
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-muted-foreground"
              onClick={() => act(() => leaveStore.dismiss(request.id), "Leave dismissed")}
            >
              <EyeOff className="size-3.5" />
              Ignore
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}
