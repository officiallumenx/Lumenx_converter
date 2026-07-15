import type { CalendarActivityMark } from "@/activity-workspace/hub/calendar";
import { addDays, isoDate } from "@/activity-workspace/hub/calendar";
import { defaultTournamentNotificationPrefs } from "./tournaments-notifications";
import type {
  SportsTournament,
  SportsTournamentInput,
  TournamentMatch,
  TournamentMatchInput,
} from "./tournaments-types";

const today = new Date();

export function cloneTournament(t: SportsTournament): SportsTournament {
  return {
    ...t,
    linkedTeamIds: [...t.linkedTeamIds],
    notifications: { ...t.notifications },
    matches: t.matches.map((m) => ({
      ...m,
      teamIds: [...m.teamIds],
      teamNames: [...m.teamNames],
    })),
  };
}

export function createMatchFromInput(
  tournamentId: string,
  input: TournamentMatchInput,
  id?: string,
): TournamentMatch {
  return {
    id: id ?? `tmatch-${Date.now()}`,
    tournamentId,
    name: input.name.trim(),
    stage: input.stage,
    date: input.date,
    time: input.time,
    venue: input.venue.trim(),
    teamIds: [...input.teamIds],
    teamNames: [...input.teamNames],
    status: input.status ?? "scheduled",
  };
}

export function createTournamentFromInput(
  input: SportsTournamentInput,
  id?: string,
): SportsTournament {
  const now = isoDate(new Date());
  const tid = id ?? `tourn-${Date.now()}`;
  return {
    id: tid,
    name: input.name.trim(),
    tournamentType: input.tournamentType,
    sportType: input.sportType,
    academicYear: input.academicYear,
    venue: input.venue.trim(),
    startDate: input.startDate,
    endDate: input.endDate,
    organizer: input.organizer.trim(),
    description: input.description.trim(),
    status: "draft",
    audience: input.audience,
    linkedTeamIds: input.linkedTeamIds ?? [],
    matches: (input.matches ?? []).map((m) => createMatchFromInput(tid, m)),
    notifications: input.notifications ?? defaultTournamentNotificationPrefs(),
    createdAt: now,
    updatedAt: now,
  };
}

export function tournamentsToCalendarMarks(
  tournaments: SportsTournament[],
): CalendarActivityMark[] {
  const counts = new Map<string, number>();
  const todayIso = isoDate(today);

  for (const t of tournaments) {
    if (t.status === "archived" || t.status === "cancelled" || t.status === "draft") continue;
    const start = new Date(t.startDate);
    const end = new Date(t.endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const iso = isoDate(d);
      counts.set(iso, (counts.get(iso) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      date,
      count,
      highlight: date === todayIso,
    }));
}

export const tournamentsSeed: SportsTournament[] = [
  {
    id: "tourn-1",
    name: "Inter-House Football League 2025–26",
    tournamentType: "intra_school",
    sportType: "football",
    academicYear: "2025–26",
    venue: "Main Ground",
    startDate: isoDate(today),
    endDate: isoDate(addDays(today, 14)),
    organizer: "Ananya Iyer",
    description: "Annual inter-house football league for senior squads.",
    status: "ongoing",
    audience: { type: "teams", teamIds: ["team-football"], teamLabels: ["Senior Football Team"] },
    linkedTeamIds: ["team-football"],
    matches: [
      {
        id: "tmatch-1",
        tournamentId: "tourn-1",
        name: "Emerald vs Sapphire — League",
        stage: "league",
        date: isoDate(today),
        time: "15:00",
        venue: "Main Ground",
        teamIds: ["team-football", "team-kabaddi"],
        teamNames: ["Senior Football Team", "Kabaddi Team"],
        status: "scheduled",
      },
      {
        id: "tmatch-2",
        tournamentId: "tourn-1",
        name: "Semi Final — House Champions",
        stage: "semi_final",
        date: isoDate(addDays(today, 7)),
        time: "16:00",
        venue: "Main Ground",
        teamIds: ["team-football", "team-cricket"],
        teamNames: ["Senior Football Team", "Cricket Team"],
        status: "scheduled",
      },
    ],
    notifications: { notifyAudience: true, notifyParents: true, notifyTeachers: true },
    publishedAt: "2026-02-20",
    createdAt: "2026-02-15",
    updatedAt: isoDate(today),
  },
  {
    id: "tourn-2",
    name: "District Inter-School Basketball Championship",
    tournamentType: "district",
    sportType: "basketball",
    academicYear: "2025–26",
    venue: "Indoor Court A",
    startDate: isoDate(addDays(today, 21)),
    endDate: isoDate(addDays(today, 28)),
    organizer: "Pooja Desai",
    description: "District-level basketball championship — selected school teams.",
    status: "scheduled",
    audience: { type: "teams", teamIds: ["team-basketball"], teamLabels: ["Basketball Team"] },
    linkedTeamIds: ["team-basketball"],
    matches: [
      {
        id: "tmatch-3",
        tournamentId: "tourn-2",
        name: "Quarter Final — Pool A",
        stage: "quarter_final",
        date: isoDate(addDays(today, 21)),
        time: "10:00",
        venue: "Indoor Court A",
        teamIds: ["team-basketball", "team-volleyball"],
        teamNames: ["Basketball Team", "Volleyball Team"],
        status: "scheduled",
      },
    ],
    notifications: { notifyAudience: true, notifyParents: true, notifyTeachers: false },
    publishedAt: "2026-03-01",
    createdAt: "2026-02-28",
    updatedAt: "2026-03-05",
  },
  {
    id: "tourn-3",
    name: "State Athletics Trials Selection",
    tournamentType: "state",
    sportType: "athletics",
    academicYear: "2025–26",
    venue: "Athletics Track",
    startDate: isoDate(addDays(today, 10)),
    endDate: isoDate(addDays(today, 12)),
    organizer: "Deepa Nambiar",
    description: "Individual student selection trials for state athletics meet.",
    status: "draft",
    audience: {
      type: "individual_students",
      studentIds: ["stu-4", "stu-6", "stu-8"],
    },
    linkedTeamIds: ["team-athletics"],
    matches: [],
    notifications: defaultTournamentNotificationPrefs(),
    createdAt: "2026-03-06",
    updatedAt: "2026-03-06",
  },
  {
    id: "tourn-4",
    name: "Cricket Invitational (2024–25)",
    tournamentType: "inter_school",
    sportType: "cricket",
    academicYear: "2024–25",
    venue: "Cricket Nets",
    startDate: "2025-11-01",
    endDate: "2025-11-15",
    organizer: "Suresh Kumar",
    description: "Archived invitational tournament from previous academic year.",
    status: "archived",
    audience: { type: "teams", teamIds: ["team-cricket"], teamLabels: ["Cricket Team"] },
    linkedTeamIds: ["team-cricket"],
    matches: [
      {
        id: "tmatch-4",
        tournamentId: "tourn-4",
        name: "Final — Invitational Cup",
        stage: "final",
        date: "2025-11-15",
        time: "09:00",
        venue: "Main Ground",
        teamIds: ["team-cricket", "team-football"],
        teamNames: ["Cricket Team", "Senior Football Team"],
        status: "completed",
      },
    ],
    notifications: { notifyAudience: true, notifyParents: false, notifyTeachers: true },
    publishedAt: "2025-10-20",
    archivedAt: "2025-12-01",
    createdAt: "2025-10-15",
    updatedAt: "2025-12-01",
  },
];
