import { useState } from "react";
import type { LeaveRequest } from "@lumenx/types";
import { Button, cn, Label, Textarea } from "@lumenx/ui";
import { CalendarOff, Check, X } from "lucide-react";
import { LeaveStatusBadge } from "@/components/app/leave/LeaveStatusBadge";
import { formatLeaveRequestDates, classTag, leaveDayCount, isClosedLeaveStatus } from "@/lib/leave-utils";
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
  const [ignoring, setIgnoring] = useState(false);
  const [note, setNote] = useState("");

  const act = (fn: () => void, message: string) => {
    fn();
    toast.success(message, {
      description: "Parent notified instantly via Alerts.",
    });
    onAction?.();
  };

  const confirmIgnore = () => {
    const trimmed = note.trim();
    act(
      () => leaveStore.dismiss(request.id, trimmed || undefined),
      "Leave ignored",
    );
    setIgnoring(false);
    setNote("");
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
          <p
            className={cn(
              "mt-2 text-xs rounded-lg px-3 py-2",
              isClosedLeaveStatus(request.status)
                ? "bg-muted/50 text-foreground border border-border"
                : "text-muted-foreground bg-muted/30",
            )}
          >
            <span className="font-medium text-muted-foreground">
              {isClosedLeaveStatus(request.status) ? "Ignored · " : "Note · "}
            </span>
            {request.teacherNote}
          </p>
        )}

        {isPending && !ignoring && (
          <div className={cn("flex flex-nowrap items-center gap-2", compact ? "mt-3" : "mt-4")}>
            <Button
              size="sm"
              className="h-8 w-8 p-0 shrink-0"
              aria-label="Accept"
              title="Accept"
              onClick={() =>
                act(
                  () => leaveStore.approve(request.id),
                  "Leave accepted — attendance updated for each day",
                )
              }
            >
              <Check className="size-4" />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-8 w-8 p-0 shrink-0 shadow"
              aria-label="Ignore"
              title="Ignore"
              onClick={() => {
                setIgnoring(true);
                setNote("");
              }}
            >
              <X className="size-4" strokeWidth={2.5} />
            </Button>
          </div>
        )}

        {isPending && ignoring && (
          <div className="mt-4 space-y-2 rounded-xl border border-border bg-muted/20 p-3">
            <Label className="text-xs font-medium">
              Description{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note for the parent, or leave blank…"
              className="rounded-xl text-sm"
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground">
              You can ignore without a message, or type one if you want.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={confirmIgnore}>
                Ignore{note.trim() ? " with note" : ""}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIgnoring(false);
                  setNote("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
