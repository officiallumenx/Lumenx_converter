import type { SportType } from "@/lib/activity/sports/types";

export type SportsCalendarEventCategory =
  | "activity"
  | "practice"
  | "tournament"
  | "match"
  | "training_plan"
  | "communication"
  | "holiday";

export type SportsCalendarViewMode = "day" | "week" | "month" | "agenda";

export interface SportsCalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  category: SportsCalendarEventCategory;
  sportType?: SportType;
  teamId?: string;
  teamName?: string;
  coach?: string;
  tournamentId?: string;
  tournamentName?: string;
  activityType?: string;
  venue?: string;
  description?: string;
  sourceModule: string;
  sourceId: string;
  allDay?: boolean;
}

export interface SportsCalendarFilters {
  query?: string;
  teamId?: string | "all";
  sportType?: SportType | "all";
  coach?: string | "all";
  tournamentId?: string | "all";
  activityType?: string | "all";
  venue?: string | "all";
  category?: SportsCalendarEventCategory | "all";
}

export interface SportsCalendarFilterOptions {
  teams: { id: string; name: string }[];
  sports: SportType[];
  coaches: string[];
  tournaments: { id: string; name: string }[];
  activityTypes: string[];
  venues: string[];
}

export const CALENDAR_CATEGORY_LABELS: Record<SportsCalendarEventCategory, string> = {
  activity: "Sports Activity",
  practice: "Practice Session",
  tournament: "Tournament",
  match: "Match",
  training_plan: "Training Plan",
  communication: "Communication",
  holiday: "Holiday",
};

export const CALENDAR_CATEGORY_COLORS: Record<SportsCalendarEventCategory, string> = {
  activity: "bg-sky-500",
  practice: "bg-emerald-500",
  tournament: "bg-violet-500",
  match: "bg-amber-500",
  training_plan: "bg-rose-500",
  communication: "bg-cyan-500",
  holiday: "bg-slate-400",
};

export const CALENDAR_CATEGORY_RING: Record<SportsCalendarEventCategory, string> = {
  activity: "ring-sky-500/40",
  practice: "ring-emerald-500/40",
  tournament: "ring-violet-500/40",
  match: "ring-amber-500/40",
  training_plan: "ring-rose-500/40",
  communication: "ring-cyan-500/40",
  holiday: "ring-slate-400/40",
};

export const CALENDAR_VIEW_LABELS: Record<SportsCalendarViewMode, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
  agenda: "Agenda",
};
