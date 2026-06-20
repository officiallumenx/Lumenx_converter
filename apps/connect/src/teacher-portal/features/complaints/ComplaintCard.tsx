import { Badge, Button, cn } from "@lumenx/ui";
import type { TeacherComplaint } from "@/lib/teacher/types";
import { COMPLAINT_STATUS_LABEL, COMPLAINT_STATUS_STYLE, isComplaintActive } from "./complaint-status";

const PRIORITY_STYLE = {
  normal: "border-border",
  urgent: "border-warning/40",
  critical: "border-destructive/40",
};

export function ComplaintStatusBadge({ status, className }: { status: TeacherComplaint["status"]; className?: string }) {
  return (
    <Badge className={cn("shrink-0 border-0", COMPLAINT_STATUS_STYLE[status], className)}>
      {COMPLAINT_STATUS_LABEL[status]}
    </Badge>
  );
}

export function ComplaintCard({
  complaint,
  disabled,
  onView,
  onRespond,
  onForward,
  onResolve,
  onClose,
  onArchive,
  onSubmitDraft,
  onDeleteDraft,
}: {
  complaint: TeacherComplaint;
  disabled?: boolean;
  onView?: (id: string) => void;
  onRespond?: (id: string) => void;
  onForward?: (id: string) => void;
  onResolve?: (id: string) => void;
  onClose?: (id: string) => void;
  onArchive?: (id: string) => void;
  onSubmitDraft?: (id: string) => void;
  onDeleteDraft?: (id: string) => void;
}) {
  const { status } = complaint;
  const isDraft = status === "draft";
  const canAct = isComplaintActive(status);
  const canArchive = status === "resolved" || status === "closed";
  const canForward = canAct && status !== "forwarded" && !isDraft;

  return (
    <article className={cn("rounded-2xl border bg-card p-4 shadow-soft sm:p-5", PRIORITY_STYLE[complaint.priority])}>
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <h3 className="min-w-0 font-medium">{complaint.title}</h3>
        <ComplaintStatusBadge status={status} />
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2">{complaint.body}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>{complaint.category}</span>
        <span>·</span>
        <span className="capitalize">{complaint.priority}</span>
        <span>·</span>
        <span>{complaint.createdAt}</span>
      </div>
      {complaint.response ? (
        <div className="mt-3 rounded-xl bg-muted/50 p-3 text-sm">
          <span className="font-medium">Response: </span>
          {complaint.response}
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" className="rounded-xl" onClick={() => onView?.(complaint.id)}>View</Button>
        {isDraft && (
          <>
            <Button size="sm" className="rounded-xl" disabled={disabled} onClick={() => onSubmitDraft?.(complaint.id)}>Submit</Button>
            <Button size="sm" variant="outline" className="rounded-xl text-destructive" disabled={disabled} onClick={() => onDeleteDraft?.(complaint.id)}>Delete</Button>
          </>
        )}
        {canAct && !isDraft && (
          <>
            <Button size="sm" variant="outline" className="rounded-xl" disabled={disabled} onClick={() => onRespond?.(complaint.id)}>Respond</Button>
            {canForward && (
              <Button size="sm" variant="outline" className="rounded-xl" disabled={disabled} onClick={() => onForward?.(complaint.id)}>Forward</Button>
            )}
            <Button size="sm" variant="outline" className="rounded-xl" disabled={disabled} onClick={() => onResolve?.(complaint.id)}>Mark resolved</Button>
            <Button size="sm" className="rounded-xl" disabled={disabled} onClick={() => onClose?.(complaint.id)}>Close</Button>
          </>
        )}
        {canArchive && (
          <Button size="sm" variant="outline" className="rounded-xl" disabled={disabled} onClick={() => onArchive?.(complaint.id)}>Archive</Button>
        )}
      </div>
    </article>
  );
}
