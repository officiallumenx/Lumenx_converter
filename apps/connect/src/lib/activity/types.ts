/**
 * Activity data layer — dashboard snapshot types.
 * Shared domain types live in @/activity-workspace/hub (Activity Hub).
 */
import type { ActivityCategoryId } from "@/activity-workspace/hub/categories";
import type { CalendarActivityMark } from "@/activity-workspace/hub/calendar";
import type { ActivityNotification } from "@/activity-workspace/hub/notifications";
import type { ActivityTimelineItem } from "@/activity-workspace/hub/timeline";
import type { ActivityDisplayStatus } from "@/activity-workspace/hub/activity-types";

export type { ActivityCategoryId as ActivityCategory };
export type { ActivityDisplayStatus as ActivityStatus };
export type { CalendarActivityMark, ActivityNotification, ActivityTimelineItem };

export interface ActivityDashboardStats {
  todayActivities: number;
  thisWeekEvents: number;
  activeClubs: number;
  pendingAttendance: number;
  openCompetitions: number;
  workshopSessions: number;
  unreadMessages: number;
  certificatesIssued: number;
}

/** Dashboard-scoped view of a scheduled activity session. */
export interface TodayActivity {
  id: string;
  title: string;
  category: ActivityCategoryId;
  venue: string;
  time: string;
  participantCount: number;
  status: ActivityDisplayStatus;
}

export interface UpcomingActivityEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  audience: string;
}

export interface UpcomingCompetition {
  id: string;
  title: string;
  sport: string;
  date: string;
  teamsRegistered: number;
  maxTeams: number;
}

export interface ActivityParticipationSummary {
  totalParticipants: number;
  weekOverWeekChange: number;
  byCategory: { category: ActivityCategoryId; count: number; label: string }[];
}

/** Landing-page snapshot — not a domain aggregate root. */
export interface ActivityDashboardSnapshot {
  stats: ActivityDashboardStats;
  todayActivities: TodayActivity[];
  upcomingEvents: UpcomingActivityEvent[];
  upcomingCompetitions: UpcomingCompetition[];
  calendarMarks: CalendarActivityMark[];
  notifications: ActivityNotification[];
  timeline: ActivityTimelineItem[];
  participationSummary: ActivityParticipationSummary;
}
