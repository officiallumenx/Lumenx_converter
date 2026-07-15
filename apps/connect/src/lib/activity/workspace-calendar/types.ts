/**
 * Workspace calendar planner — linked activities from Sports / Extra-Curricular
 * plus manual coordinator reminders (not activities).
 */
export type WorkspaceCalendarEntryKind =
  | "linked"
  | "reminder";

export type WorkspaceCalendarCategory =
  | "sports"
  | "extra-curricular"
  | "event"
  | "practice"
  | "competition"
  | "club"
  | "holiday"
  | "meeting"
  | "certificate"
  | "reminder"
  | "other";

export type WorkspaceCalendarEntry = {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  kind: WorkspaceCalendarEntryKind;
  category: WorkspaceCalendarCategory;
  description?: string;
  venue?: string;
  sourceModule?: string;
  sourceId?: string;
  colorClass: string;
};

export type WorkspaceCalendarViewMode = "month" | "week" | "agenda";

export type WorkspaceCalendarFilters = {
  query?: string;
  category?: WorkspaceCalendarCategory | "all";
  view?: WorkspaceCalendarViewMode;
};

export const WORKSPACE_CALENDAR_CATEGORY_LABELS: Record<WorkspaceCalendarCategory, string> = {
  sports: "Sports",
  "extra-curricular": "Extra-Curricular",
  event: "Event",
  practice: "Practice",
  competition: "Competition",
  club: "Club",
  holiday: "Holiday",
  meeting: "Meeting",
  certificate: "Certificates",
  reminder: "Coordinator reminder",
  other: "Other",
};

export const WORKSPACE_CALENDAR_CATEGORY_COLORS: Record<WorkspaceCalendarCategory, string> = {
  sports: "bg-sky-500",
  "extra-curricular": "bg-violet-500",
  event: "bg-emerald-500",
  practice: "bg-teal-500",
  competition: "bg-amber-500",
  club: "bg-indigo-500",
  holiday: "bg-slate-400",
  meeting: "bg-cyan-500",
  certificate: "bg-rose-500",
  reminder: "bg-orange-500",
  other: "bg-muted-foreground",
};
