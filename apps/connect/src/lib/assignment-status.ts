import type { StudentAssignment } from "@/lib/mock-data";
import { toLocalIsoDate } from "@/lib/leave-utils";

/** Pending with due date within this many days (inclusive) = urgent / low due date */
const DUE_SOON_DAYS = 2;

/** Due-date urgency only — Connect has no online homework/assignment submission. */
export type AssignmentVisualStatus = "due" | "dueToday" | "dueSoon" | "overdue";

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

/** Human due label from ISO dueDate (always relative to today — never stale copy). */
export function formatAssignmentDueLabel(dueDate?: string, fallback = "—"): string {
  if (!dueDate) return fallback;
  const days = daysUntilDue(dueDate);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days > 1 && days <= 7) return `In ${days} days`;
  const due = new Date(`${dueDate}T12:00:00`);
  return due.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function getAssignmentVisualStatus(
  a: Pick<StudentAssignment, "dueDate">,
): AssignmentVisualStatus {
  if (a.dueDate) {
    const days = daysUntilDue(a.dueDate);
    if (days < 0) return "overdue";
    if (days === 0) return "dueToday";
    if (days <= DUE_SOON_DAYS) return "dueSoon";
  }
  return "due";
}

export const ASSIGNMENT_STATUS_DOT: Record<AssignmentVisualStatus, string> = {
  due: "bg-warning",
  dueToday: "bg-primary",
  dueSoon: "bg-destructive",
  overdue: "bg-destructive",
};

export const ASSIGNMENT_STATUS_LABEL: Record<AssignmentVisualStatus, string> = {
  due: "Assigned",
  dueToday: "Due today",
  dueSoon: "Due soon",
  overdue: "Overdue",
};

export const ASSIGNMENT_CARD_STYLES: Record<
  AssignmentVisualStatus,
  { card: string; icon: string; badge: string; label: string }
> = {
  due: {
    label: "Assigned",
    card: "border-warning/40 bg-warning/5 border-l-4 border-l-warning",
    icon: "bg-warning/15 text-warning-foreground",
    badge: "border-warning/40 bg-warning/10 text-warning-foreground",
  },
  dueToday: {
    label: "Due today",
    card: "border-primary/45 bg-primary/[0.06] border-l-4 border-l-primary",
    icon: "bg-primary/15 text-primary",
    badge: "border-primary/40 bg-primary/10 text-primary",
  },
  dueSoon: {
    label: "Due soon",
    card: "border-destructive/50 bg-destructive/5 border-l-4 border-l-destructive",
    icon: "bg-destructive/15 text-destructive",
    badge: "border-destructive/40 bg-destructive/10 text-destructive",
  },
  overdue: {
    label: "Overdue",
    card: "border-2 border-destructive bg-destructive/15 shadow-sm",
    icon: "bg-destructive/25 text-destructive",
    badge: "border-destructive bg-destructive/20 text-destructive font-semibold",
  },
};

const URGENCY_ORDER: Record<AssignmentVisualStatus, number> = {
  overdue: 0,
  dueSoon: 1,
  dueToday: 2,
  due: 3,
};

export function sortAssignmentsByUrgency(a: StudentAssignment, b: StudentAssignment) {
  return URGENCY_ORDER[getAssignmentVisualStatus(a)] - URGENCY_ORDER[getAssignmentVisualStatus(b)];
}

export function pendingWorkForChild(
  assignments: StudentAssignment[],
  type: StudentAssignment["type"],
) {
  return assignments.filter((a) => a.type === type).sort(sortAssignmentsByUrgency);
}

/** Assignments or homework with due date = today (local calendar). */
export function todayWorkForChild(
  assignments: StudentAssignment[],
  type: StudentAssignment["type"],
) {
  const today = toLocalIsoDate(new Date());
  return assignments
    .filter((a) => a.type === type && a.dueDate === today)
    .sort(sortAssignmentsByUrgency);
}

export const ASSIGNMENT_LEGEND = [
  {
    status: "due" as const,
    title: "Assigned",
    description: "Assigned work — complete offline / at school",
  },
  {
    status: "dueToday" as const,
    title: "Due today",
    description: "Due today — complete and hand in at school",
  },
  {
    status: "dueSoon" as const,
    title: "Due soon",
    description: "Due within 2 days",
  },
  {
    status: "overdue" as const,
    title: "Overdue",
    description: "Past the due date",
  },
];
