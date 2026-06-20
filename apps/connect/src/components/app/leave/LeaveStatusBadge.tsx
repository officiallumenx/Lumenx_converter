import type { LeaveStatus } from "@lumenx/types";
import { Badge, cn } from "@lumenx/ui";
import { LEAVE_STATUS_LABELS, LEAVE_STATUS_TONE } from "@/lib/leave-utils";

const TONE_CLASS: Record<(typeof LEAVE_STATUS_TONE)[LeaveStatus], string> = {
  warning: "bg-warning/15 text-warning-foreground border-warning/30",
  success: "bg-success/10 text-success border-success/30",
  destructive: "bg-destructive/10 text-destructive border-destructive/30",
  muted: "bg-muted text-muted-foreground border-border",
};

export function LeaveStatusBadge({ status }: { status: LeaveStatus }) {
  const tone = LEAVE_STATUS_TONE[status];
  return (
    <Badge variant="outline" className={cn("text-[10px] font-semibold", TONE_CLASS[tone])}>
      {LEAVE_STATUS_LABELS[status]}
    </Badge>
  );
}
