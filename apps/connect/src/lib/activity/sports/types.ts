import type { CalendarActivityMark } from "@/activity-workspace/hub/calendar";
import type { ActivityNotification } from "@/activity-workspace/hub/notifications";

export type SportType =
  | "football"
  | "basketball"
  | "cricket"
  | "volleyball"
  | "kabaddi"
  | "athletics"
  | "badminton"
  | "chess"
  | "table_tennis"
  | "swimming";

/** Team or group within a sport section. */
export type SportsUnitType = "team" | "group";

/** Sports Teams entity lifecycle — archive only, never hard-delete. */
export type SportsTeamStatus = "active" | "archived";

/** Dashboard preview uses legacy status labels — frozen for Sports Dashboard screen. */
export type DashboardTeamStatus = "active" | "inactive" | "forming";

export type TeamGender = "boys" | "girls" | "mixed";

export type TeamAgeCategory =
  | "under_10"
  | "under_12"
  | "under_14"
  | "under_16"
  | "under_18"
  | "open";

export interface SportTeamMember {
  id: string;
  name: string;
  rollNo: string;
  classLabel: string;
  role?: "captain" | "vice_captain" | "player";
  isActive?: boolean;
}

export interface SportsTeamStats {
  totalMembers: number;
  activeMembers: number;
  practiceSessions: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  tournamentsParticipated: number;
  achievements: number;
}

/** First-class Sports Team entity. */
export interface SportsTeam {
  id: string;
  /** Parent sport section (Cricket, Kabaddi, etc.). */
  sectionId: string;
  unitType: SportsUnitType;
  /** Target roster size — mock until student assignment is wired. */
  studentCapacity: number;
  name: string;
  sportType: SportType;
  /** Mock team logo — emoji or short label until asset upload exists. */
  logoEmoji: string;
  description: string;
  academicYear: string;
  status: SportsTeamStatus;
  coach: string;
  assistantCoach?: string;
  captain: string;
  members: SportTeamMember[];
  gender: TeamGender;
  ageCategory: TeamAgeCategory;
  house?: string;
  stats: SportsTeamStats;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

/** Simplified create/edit payload for section teams and groups. */
export interface SportsTeamGroupInput {
  name: string;
  sectionId: string;
  unitType: SportsUnitType;
  studentCapacity: number;
}

export interface SportsTeamInput {
  name: string;
  sectionId?: string;
  unitType?: SportsUnitType;
  studentCapacity?: number;
  sportType: SportType;
  logoEmoji?: string;
  description: string;
  academicYear: string;
  coach: string;
  assistantCoach?: string;
  captain: string;
  gender: TeamGender;
  ageCategory: TeamAgeCategory;
  house?: string;
}

export type SportsTeamSortField = "name" | "sport" | "members" | "wins" | "updatedAt";

export interface SportsTeamListFilters {
  query?: string;
  sectionId?: string;
  sportType?: SportType | "all";
  status?: SportsTeamStatus | "all";
  gender?: TeamGender | "all";
  ageCategory?: TeamAgeCategory | "all";
  sortBy?: SportsTeamSortField;
  sortDir?: "asc" | "desc";
}

export interface SportsDashboardStats {
  activeTeams: number;
  totalAthletes: number;
  todaySessions: number;
  liveTournaments: number;
  pendingAttendance: number;
  matchesThisWeek: number;
  recentAchievements: number;
  openActivities: number;
}

export type SportsScheduleKind = "practice" | "match" | "tournament" | "activity";

export interface SportsScheduleItem {
  id: string;
  kind: SportsScheduleKind;
  title: string;
  sportType: SportType;
  venue: string;
  time: string;
  status: "ongoing" | "upcoming" | "completed";
  participantLabel: string;
}

export interface SportsTournamentPreview {
  id: string;
  name: string;
  sportType: SportType;
  venue: string;
  startDate: string;
  endDate: string;
  teamCount: number;
  fixtureCount: number;
  status: "upcoming" | "ongoing" | "completed";
}

export interface SportsResultPreview {
  id: string;
  title: string;
  sportType: SportType;
  winner: string;
  runnerUp: string;
  score: string;
  mvp?: string;
  date: string;
}

/** Frozen dashboard preview row — independent from SportsTeam entity status model. */
export interface SportsTeamSummary {
  teamId: string;
  name: string;
  sportType: SportType;
  memberCount: number;
  coach: string;
  status: DashboardTeamStatus;
  nextEvent?: string;
}

export interface SportsDashboardSnapshot {
  stats: SportsDashboardStats;
  todaySchedule: SportsScheduleItem[];
  activeTeams: SportsTeamSummary[];
  upcomingTournaments: SportsTournamentPreview[];
  recentResults: SportsResultPreview[];
  calendarMarks: CalendarActivityMark[];
  notifications: ActivityNotification[];
}

export const SPORT_TYPE_LABELS: Record<SportType, string> = {
  football: "Football",
  basketball: "Basketball",
  cricket: "Cricket",
  volleyball: "Volleyball",
  kabaddi: "Kabaddi",
  athletics: "Athletics",
  badminton: "Badminton",
  chess: "Chess",
  table_tennis: "Table Tennis",
  swimming: "Swimming",
};

export const TEAM_GENDER_LABELS: Record<TeamGender, string> = {
  boys: "Boys",
  girls: "Girls",
  mixed: "Mixed",
};

export const TEAM_AGE_LABELS: Record<TeamAgeCategory, string> = {
  under_10: "Under 10",
  under_12: "Under 12",
  under_14: "Under 14",
  under_16: "Under 16",
  under_18: "Under 18",
  open: "Open",
};

export const SPORTS_TEAM_STATUS_LABELS: Record<SportsTeamStatus, string> = {
  active: "Active",
  archived: "Archived",
};

export const SPORTS_UNIT_TYPE_LABELS: Record<SportsUnitType, string> = {
  team: "Team",
  group: "Group",
};
