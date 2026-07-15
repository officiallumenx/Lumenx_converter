import type { Achievement, SportEvent } from "@lumenx/types";
import { achievements, sportsEvents, sportsTeamRoster, sportsTeams } from "@/lib/mock-data";

export type LearnerRef = { name: string; rollNo: string; childId?: string };

export type SquadInfo = {
  teamId: string;
  teamName: string;
  sport: string;
  coach: string;
  presentLastSession: boolean;
  squadRank: number | null;
};

const normRoll = (r: string) => r.replace(/^0+/, "") || "0";

/** Per-linked-child squad data when roster tables do not list younger siblings. */
const LEARNER_SQUADS_BY_CHILD: Record<string, SquadInfo[]> = {
  C1: [
    {
      teamId: "t-fb",
      teamName: "School Football XI",
      sport: "Football",
      coach: "Coach Imran",
      presentLastSession: true,
      squadRank: 3,
    },
    {
      teamId: "t-ath",
      teamName: "Athletics Core",
      sport: "Athletics",
      coach: "Coach Manish",
      presentLastSession: true,
      squadRank: 2,
    },
  ],
  C2: [
    {
      teamId: "t-ch",
      teamName: "Chess Club",
      sport: "Chess",
      coach: "Mr. Bhatt",
      presentLastSession: true,
      squadRank: 1,
    },
    {
      teamId: "t-bb",
      teamName: "Basketball Squad",
      sport: "Basketball",
      coach: "Coach Reena",
      presentLastSession: false,
      squadRank: 4,
    },
  ],
  C3: [
    {
      teamId: "t-ath",
      teamName: "Athletics Core",
      sport: "Athletics",
      coach: "Coach Manish",
      presentLastSession: true,
      squadRank: 5,
    },
  ],
};

const LEARNER_COMPETITIONS_BY_CHILD: Record<
  string,
  {
    id: string;
    title: string;
    category: "sports" | "cultural";
    date: string;
    result: string;
    rank: string;
    venue: string;
  }[]
> = {
  C1: [
    {
      id: "comp-c1-1",
      title: "Annual Athletics Meet — 100m Sprint",
      category: "sports",
      date: "10 Dec 2024",
      result: "Silver Medal",
      rank: "2nd",
      venue: "Main Ground",
    },
    {
      id: "comp-c1-2",
      title: "Inter-House Football Final",
      category: "sports",
      date: "18 Nov 2024",
      result: "Runners-up",
      rank: "2nd",
      venue: "Sports Complex",
    },
  ],
  C2: [
    {
      id: "comp-c2-1",
      title: "District Chess Championship",
      category: "sports",
      date: "22 Jan 2025",
      result: "Gold Medal",
      rank: "District 1st",
      venue: "City Hall",
    },
    {
      id: "comp-c2-2",
      title: "Inter-School Quiz Bowl",
      category: "cultural",
      date: "8 Feb 2025",
      result: "Champions",
      rank: "1st",
      venue: "Auditorium",
    },
  ],
  C3: [
    {
      id: "comp-c3-1",
      title: "Primary Sports Day — Relay",
      category: "sports",
      date: "15 Dec 2024",
      result: "Participation",
      rank: "4th",
      venue: "Junior Ground",
    },
  ],
};

const LEARNER_ACHIEVEMENT_IDS: Record<string, string[]> = {
  C1: ["ach-6", "ach-10"],
  C2: ["ach-8", "ach-9", "ach-6"],
  C3: ["ach-6"],
};

export function getLearnerSquads(learner: LearnerRef): SquadInfo[] {
  if (learner.childId && LEARNER_SQUADS_BY_CHILD[learner.childId]) {
    return LEARNER_SQUADS_BY_CHILD[learner.childId];
  }

  const cr = normRoll(learner.rollNo);
  const out: SquadInfo[] = [];
  for (const team of sportsTeams) {
    const roster = sportsTeamRoster[team.id] ?? [];
    const row = roster.find(
      (r) => r.name === learner.name || r.roll === learner.rollNo || normRoll(r.roll) === cr,
    );
    if (row) {
      out.push({
        teamId: team.id,
        teamName: team.name,
        sport: team.sport,
        coach: team.coach,
        presentLastSession: row.presentLastSession,
        squadRank: row.squadRank,
      });
    }
  }
  return out;
}

export function getLearnerEvents(squads: SquadInfo[], registeredIds?: string[]): SportEvent[] {
  const squadSports = new Set(squads.map((s) => s.sport.toLowerCase()));
  const idSet = registeredIds ? new Set(registeredIds) : null;

  return sportsEvents.filter((e) => {
    if (idSet?.has(e.id)) return true;
    if (e.kind === "cultural") return false;
    if (squadSports.has(e.sport.toLowerCase())) return true;
    return squads.some((s) => e.title.toLowerCase().includes(s.sport.toLowerCase()));
  });
}

export function pickNextHighlight(events: SportEvent[]): SportEvent | null {
  const ongoing = events.filter((e) => e.status === "ongoing");
  if (ongoing.length) return ongoing[0];
  const upcoming = events.filter((e) => e.status === "upcoming");
  return upcoming[0] ?? null;
}

export function getLearnerSportsAchievements(learner: LearnerRef): Achievement[] {
  const ids = learner.childId ? LEARNER_ACHIEVEMENT_IDS[learner.childId] : null;
  if (ids?.length) {
    return achievements.filter((a) => ids.includes(a.id));
  }
  // No mapping for this learner: show nothing rather than another learner's achievements.
  return [];
}

export function getLearnerCompetitions(learner: LearnerRef) {
  if (learner.childId && LEARNER_COMPETITIONS_BY_CHILD[learner.childId]) {
    return LEARNER_COMPETITIONS_BY_CHILD[learner.childId];
  }
  // Never fall back to C1's results for an unknown learner.
  return [];
}

export const learnerSportsProfiles: Record<
  string,
  {
    registeredEventIds: string[];
    practiceWeeks: { week: string; attended: number; total: number }[];
  }
> = {
  C1: {
    registeredEventIds: ["se1", "se2", "se-c1", "se3"],
    practiceWeeks: [
      { week: "W1", attended: 3, total: 3 },
      { week: "W2", attended: 2, total: 3 },
      { week: "W3", attended: 3, total: 3 },
      { week: "W4", attended: 3, total: 3 },
      { week: "W5", attended: 2, total: 3 },
    ],
  },
  C2: {
    registeredEventIds: ["se-c2", "se2"],
    practiceWeeks: [
      { week: "W1", attended: 2, total: 2 },
      { week: "W2", attended: 2, total: 2 },
      { week: "W3", attended: 1, total: 2 },
      { week: "W4", attended: 2, total: 2 },
      { week: "W5", attended: 2, total: 2 },
    ],
  },
  C3: {
    registeredEventIds: ["se-c3"],
    practiceWeeks: [
      { week: "W1", attended: 1, total: 1 },
      { week: "W2", attended: 1, total: 1 },
      { week: "W3", attended: 1, total: 1 },
      { week: "W4", attended: 0, total: 1 },
      { week: "W5", attended: 1, total: 1 },
    ],
  },
};

export function resolveLearnerSportsProfile(learner: LearnerRef) {
  if (learner.childId && learnerSportsProfiles[learner.childId]) {
    return learnerSportsProfiles[learner.childId];
  }
  return learnerSportsProfiles.C1;
}

export function practiceAttendancePct(
  weeks: { week: string; attended: number; total: number }[],
): number {
  const att = weeks.reduce((s, w) => s + w.attended, 0);
  const tot = weeks.reduce((s, w) => s + w.total, 0);
  return tot ? Math.round((att / tot) * 100) : 0;
}
