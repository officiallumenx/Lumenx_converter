import type { Achievement, SportEvent } from "@lumenx/types";
import {
  achievementCategoryMap,
  studentCompetitions,
} from "@/lib/student/mock-data";
import {
  achievements,
  sportsEvents,
  sportsTeamRoster,
  sportsTeams,
} from "@/lib/mock-data";

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

export function getLearnerSquads(learner: LearnerRef): SquadInfo[] {
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

export function isSportsOrCulturalAchievement(a: Achievement): boolean {
  const cat = achievementCategoryMap[a.id];
  if (cat === "sports" || cat === "cultural") return true;
  const t = `${a.title} ${a.description}`.toLowerCase();
  return (
    ["zap", "trophy", "medal"].includes(a.icon) &&
    /sport|athletic|football|basketball|cultural|dance|music|chess|meet/.test(t)
  );
}

export function getSportsCulturalAchievements(): Achievement[] {
  return achievements.filter(isSportsOrCulturalAchievement);
}

export function getSportsCulturalCompetitions() {
  return studentCompetitions.filter(
    (c) => c.category === "sports" || c.category === "cultural",
  );
}

export const learnerSportsProfiles: Record<
  string,
  { registeredEventIds: string[]; practiceWeeks: { week: string; attended: number; total: number }[] }
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
  if (learner.name === "Aarav Sharma") return learnerSportsProfiles.C1;
  return learnerSportsProfiles.C1;
}

export function practiceAttendancePct(
  weeks: { week: string; attended: number; total: number }[],
): number {
  const att = weeks.reduce((s, w) => s + w.attended, 0);
  const tot = weeks.reduce((s, w) => s + w.total, 0);
  return tot ? Math.round((att / tot) * 100) : 0;
}
