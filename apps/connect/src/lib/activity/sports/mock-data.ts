import type { SportsDashboardSnapshot, SportsTeam, SportsTeamGroupInput, SportsTeamInput } from "./types";
import { addDays, formatDisplayDate, isoDate } from "@/activity-workspace/hub/calendar";

const today = new Date();

function buildStats(
  members: number,
  overrides?: Partial<SportsTeam["stats"]>,
): SportsTeam["stats"] {
  return {
    totalMembers: members,
    activeMembers: Math.max(members - 1, 0),
    practiceSessions: 0,
    matchesPlayed: 6 + Math.floor(members / 2),
    wins: 3 + Math.floor(members / 3),
    losses: 2,
    draws: 0,
    tournamentsParticipated: 0,
    achievements: 1 + Math.floor(members / 4),
    ...overrides,
  };
}

/** Active teams/groups — organised under sport sections (Cricket, Kabaddi). */
export const sportTeamsSeed: SportsTeam[] = [
  {
    id: "team-cricket-1",
    sectionId: "sec-cricket",
    unitType: "team",
    studentCapacity: 15,
    name: "Team 1",
    sportType: "cricket",
    logoEmoji: "🏏",
    description: "Senior cricket squad.",
    academicYear: "2025–26",
    status: "active",
    coach: "Suresh Kumar",
    captain: "Dev Malhotra",
    gender: "boys",
    ageCategory: "open",
    members: [
      { id: "m8", name: "Dev Malhotra", rollNo: "1011", classLabel: "12-B", role: "captain", isActive: true },
      { id: "m9", name: "Amit Joshi", rollNo: "1019", classLabel: "12-B", isActive: true },
      { id: "m9b", name: "Rahul Verma", rollNo: "1022", classLabel: "12-A", isActive: true },
    ],
    stats: buildStats(3, { wins: 5, losses: 2, achievements: 2 }),
    createdAt: "2025-05-20",
    updatedAt: "2026-03-08",
  },
  {
    id: "team-cricket-2",
    sectionId: "sec-cricket",
    unitType: "team",
    studentCapacity: 15,
    name: "Team 2",
    sportType: "cricket",
    logoEmoji: "🏏",
    description: "Junior cricket squad.",
    academicYear: "2025–26",
    status: "active",
    coach: "Manoj Pillai",
    captain: "Karan Mehta",
    gender: "boys",
    ageCategory: "under_16",
    members: [
      { id: "m8b", name: "Karan Mehta", rollNo: "0811", classLabel: "10-A", role: "captain", isActive: true },
      { id: "m9c", name: "Vivek Shah", rollNo: "0819", classLabel: "10-B", isActive: true },
    ],
    stats: buildStats(2, { wins: 3, losses: 1, achievements: 1 }),
    createdAt: "2025-06-01",
    updatedAt: "2026-03-01",
  },
  {
    id: "team-kabaddi-1",
    sectionId: "sec-kabaddi",
    unitType: "team",
    studentCapacity: 12,
    name: "Team 1",
    sportType: "kabaddi",
    logoEmoji: "🤼",
    description: "Senior kabaddi team.",
    academicYear: "2025–26",
    status: "active",
    coach: "Harish Pillai",
    captain: "Naveen Rao",
    gender: "boys",
    ageCategory: "under_18",
    members: [
      { id: "m11", name: "Naveen Rao", rollNo: "1120", classLabel: "11-C", role: "captain", isActive: true },
      { id: "m11b", name: "Prakash Singh", rollNo: "1124", classLabel: "11-B", isActive: true },
    ],
    stats: buildStats(2, { wins: 4, losses: 1, achievements: 1 }),
    createdAt: "2025-08-10",
    updatedAt: "2026-03-01",
  },
  {
    id: "team-kabaddi-2",
    sectionId: "sec-kabaddi",
    unitType: "group",
    studentCapacity: 10,
    name: "Group 2",
    sportType: "kabaddi",
    logoEmoji: "🤼",
    description: "Training group for new players.",
    academicYear: "2025–26",
    status: "active",
    coach: "Harish Pillai",
    captain: "Sanjay Kumar",
    gender: "boys",
    ageCategory: "under_16",
    members: [
      { id: "m11c", name: "Sanjay Kumar", rollNo: "0720", classLabel: "9-A", role: "captain", isActive: true },
    ],
    stats: buildStats(1, { wins: 1, losses: 2, achievements: 0 }),
    createdAt: "2025-09-01",
    updatedAt: "2026-02-15",
  },
];

const dashboardActiveTeamsSnapshot = [
  {
    teamId: "team-cricket-1",
    name: "Cricket — Team 1",
    sportType: "cricket" as const,
    memberCount: 3,
    coach: "Suresh Kumar",
    status: "active" as const,
  },
  {
    teamId: "team-kabaddi-1",
    name: "Kabaddi — Team 1",
    sportType: "kabaddi" as const,
    memberCount: 2,
    coach: "Harish Pillai",
    status: "active" as const,
  },
];

export function cloneSportsTeam(team: SportsTeam): SportsTeam {
  return {
    ...team,
    members: team.members.map((m) => ({ ...m })),
    stats: { ...team.stats },
  };
}

export function resolveSportTypeForSection(sectionId: string): SportsTeam["sportType"] {
  if (sectionId.includes("cricket")) return "cricket";
  if (sectionId.includes("kabaddi")) return "kabaddi";
  return "cricket";
}

export function createTeamFromGroupInput(input: SportsTeamGroupInput, id?: string): SportsTeam {
  const now = new Date().toISOString().slice(0, 10);
  const sportType = resolveSportTypeForSection(input.sectionId);
  return {
    id: id ?? `team-${Date.now()}`,
    sectionId: input.sectionId,
    unitType: input.unitType,
    studentCapacity: input.studentCapacity,
    name: input.name.trim(),
    sportType,
    logoEmoji: sportType === "cricket" ? "🏏" : sportType === "kabaddi" ? "🤼" : "🏅",
    description: "",
    academicYear: "2025–26",
    status: "active",
    coach: "Activity Coordinator",
    captain: "—",
    gender: "mixed",
    ageCategory: "open",
    members: [],
    stats: buildStats(0, {
      totalMembers: 0,
      activeMembers: 0,
      practiceSessions: 0,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      tournamentsParticipated: 0,
      achievements: 0,
    }),
    createdAt: now,
    updatedAt: now,
  };
}

export function createTeamFromInput(input: SportsTeamInput, id?: string): SportsTeam {
  const now = new Date().toISOString().slice(0, 10);
  const sectionId = input.sectionId ?? "sec-cricket";
  return {
    id: id ?? `team-${Date.now()}`,
    sectionId,
    unitType: input.unitType ?? "team",
    studentCapacity: input.studentCapacity ?? 15,
    name: input.name.trim(),
    sportType: input.sportType,
    logoEmoji: input.logoEmoji ?? "🏅",
    description: input.description.trim(),
    academicYear: input.academicYear,
    status: "active",
    coach: input.coach.trim(),
    assistantCoach: input.assistantCoach?.trim() || undefined,
    captain: input.captain.trim(),
    gender: input.gender,
    ageCategory: input.ageCategory,
    house: input.house?.trim() || undefined,
    members: [],
    stats: buildStats(0, {
      totalMembers: 0,
      activeMembers: 0,
      practiceSessions: 0,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      tournamentsParticipated: 0,
      achievements: 0,
    }),
    createdAt: now,
    updatedAt: now,
  };
}

export const sportsDashboardSnapshot: SportsDashboardSnapshot = {
  stats: {
    activeTeams: 4,
    totalAthletes: 8,
    todaySessions: 0,
    liveTournaments: 0,
    pendingAttendance: 0,
    matchesThisWeek: 0,
    recentAchievements: 0,
    openActivities: 0,
  },
  todaySchedule: [],
  activeTeams: dashboardActiveTeamsSnapshot,
  upcomingTournaments: [],
  recentResults: [],
  calendarMarks: [
    { date: isoDate(today), count: 2, highlight: true },
    { date: isoDate(addDays(today, 1)), count: 1 },
  ],
  notifications: [],
};
