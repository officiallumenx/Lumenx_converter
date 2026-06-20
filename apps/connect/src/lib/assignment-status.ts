import type { StudentAssignment } from "@/lib/mock-data";

/** Pending with due date within this many days (inclusive) = urgent / low due date */
const DUE_SOON_DAYS = 2;

export type AssignmentVisualStatus = "submitted" | "due" | "dueSoon" | "overdue";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysUntilDue(dueDate: string) {
  const today = startOfDay(new Date());
  const due = startOfDay(new Date(`${dueDate}T12:00:00`));
  return Math.round((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

export function getAssignmentVisualStatus(
  a: Pick<StudentAssignment, "status" | "dueDate">,
): AssignmentVisualStatus {
  if (a.status === "submitted") return "submitted";
  if (a.dueDate) {
    const days = daysUntilDue(a.dueDate);
    if (days < 0) return "overdue";
    if (days <= DUE_SOON_DAYS) return "dueSoon";
  }
  return "due";
}

export const ASSIGNMENT_STATUS_DOT: Record<AssignmentVisualStatus, string> = {
  submitted: "bg-success",
  due: "bg-warning",
  dueSoon: "bg-destructive",
  overdue: "bg-destructive",
};

export const ASSIGNMENT_STATUS_LABEL: Record<AssignmentVisualStatus, string> = {
  submitted: "Submitted",
  due: "Pending",
  dueSoon: "Due soon",
  overdue: "Overdue",
};

export const ASSIGNMENT_CARD_STYLES: Record<
  AssignmentVisualStatus,
  { card: string; icon: string; badge: string; label: string }
> = {
  submitted: {
    label: "Submitted",
    card: "border-success/40 bg-success/5 border-l-4 border-l-success",
    icon: "bg-success/15 text-success",
    badge: "border-success/40 bg-success/10 text-success",
  },
  due: {
    label: "Pending",
    card: "border-warning/40 bg-warning/5 border-l-4 border-l-warning",
    icon: "bg-warning/15 text-warning-foreground",
    badge: "border-warning/40 bg-warning/10 text-warning-foreground",
  },
  dueSoon: {
    label: "Due soon",
    card: "border-destructive/50 bg-destructive/5 border-l-4 border-l-destructive",
    icon: "bg-destructive/15 text-destructive",
    badge: "border-destructive/40 bg-destructive/10 text-destructive",
  },
  overdue: {
    label: "Not submitted — overdue",
    card: "border-2 border-destructive bg-destructive/15 shadow-sm",
    icon: "bg-destructive/25 text-destructive",
    badge: "border-destructive bg-destructive/20 text-destructive font-semibold",
  },
};

const URGENCY_ORDER: Record<AssignmentVisualStatus, number> = {
  overdue: 0,
  dueSoon: 1,
  due: 2,
  submitted: 3,
};

export function sortAssignmentsByUrgency(a: StudentAssignment, b: StudentAssignment) {
  return URGENCY_ORDER[getAssignmentVisualStatus(a)] - URGENCY_ORDER[getAssignmentVisualStatus(b)];
}

export function pendingWorkForChild(assignments: StudentAssignment[], type: StudentAssignment["type"]) {
  return assignments
    .filter((a) => a.type === type && a.status === "pending")
    .sort(sortAssignmentsByUrgency);
}

export const ASSIGNMENT_LEGEND = [
  {
    status: "submitted" as const,
    title: "Submitted",
    description: "Work turned in on time",
  },
  {
    status: "due" as const,
    title: "Pending",
    description: "Assignment or homework not yet due",
  },
  {
    status: "dueSoon" as const,
    title: "Due soon",
    description: "Due within 2 days — submit urgently",
  },
  {
    status: "overdue" as const,
    title: "Overdue",
    description: "Past due date and not submitted",
  },
];
