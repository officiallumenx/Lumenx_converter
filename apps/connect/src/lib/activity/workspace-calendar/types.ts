/**
 * Activity Coordinator calendar — simple planner (V1).
 * Categories: Sports, ECA, Practice, School programmes, Personal reminders.
 */

export type WorkspaceCalendarEntryKind = "linked" | "reminder";

export type WorkspaceCalendarCategory =
  | "sports"
  | "extra-curricular"
  | "practice"
  | "programme"
  | "reminder";

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
  /** Hierarchy unit id when entry is tied to a Team / Group */
  unitId?: string;
  unitLabel?: string;
  sourceModule?: string;
  sourceId?: string;
  colorClass: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateReminderInput = {
  title: string;
  date: string;
  startTime?: string;
  description?: string;
};

export type UpdateReminderInput = {
  title?: string;
  date?: string;
  startTime?: string;
  description?: string;
};

export type CreatePracticeCalendarInput = {
  title: string;
  date: string;
  startTime: string;
  unitIds: string[];
  unitLabels: string[];
};

export type WorkspaceCalendarFilters = {
  query?: string;
  category?: WorkspaceCalendarCategory | "all";
  date?: string;
};

export const WORKSPACE_CALENDAR_CATEGORY_LABELS: Record<WorkspaceCalendarCategory, string> = {
  sports: "Sports",
  "extra-curricular": "ECA",
  practice: "Practice",
  programme: "School programme",
  reminder: "My reminder",
};

export const WORKSPACE_CALENDAR_CATEGORY_COLORS: Record<WorkspaceCalendarCategory, string> = {
  sports: "bg-sky-500",
  "extra-curricular": "bg-violet-500",
  practice: "bg-teal-500",
  programme: "bg-emerald-500",
  reminder: "bg-orange-500",
};

/** Filter chips shown in the Calendar UI (order matters). */
export const WORKSPACE_CALENDAR_FILTER_ORDER: readonly (WorkspaceCalendarCategory | "all")[] = [
  "all",
  "sports",
  "extra-curricular",
  "practice",
  "programme",
  "reminder",
] as const;
