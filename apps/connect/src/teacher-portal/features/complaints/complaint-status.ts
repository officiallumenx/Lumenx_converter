import type { ComplaintStatus } from "@/lib/teacher/types";

export const COMPLAINT_STATUS_LABEL: Record<ComplaintStatus, string> = {
  draft: "Draft",
  open: "Open",
  in_progress: "In Progress",
  forwarded: "Forwarded",
  resolved: "Resolved",
  closed: "Closed",
  archived: "Archived",
};

export const COMPLAINT_STATUS_STYLE: Record<ComplaintStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  open: "bg-warning/15 text-warning-foreground",
  in_progress: "bg-primary/15 text-primary",
  forwarded: "bg-destructive/15 text-destructive",
  resolved: "bg-success/15 text-success",
  closed: "bg-secondary text-secondary-foreground",
  archived: "bg-muted/80 text-muted-foreground",
};

export type ComplaintStatusFilter = "all" | ComplaintStatus;

export const COMPLAINT_STATUS_FILTERS: { id: ComplaintStatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Drafts" },
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In progress" },
  { id: "forwarded", label: "Forwarded" },
  { id: "resolved", label: "Resolved" },
  { id: "closed", label: "Closed" },
  { id: "archived", label: "Archived" },
];

export function isComplaintActive(status: ComplaintStatus): boolean {
  return status !== "resolved" && status !== "closed" && status !== "archived";
}
