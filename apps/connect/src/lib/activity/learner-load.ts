import {
  listAchievements,
  listActivityMemberships,
  listActivitySections,
  listActivityTeams,
  listPracticeSessions,
} from "./api";
import type { AchievementDto, ActivityMembershipDto, PracticeSessionDto } from "./api-types";

export type LearnerActivitySquad = {
  teamId: string;
  teamName: string;
  sectionName: string;
  domain: "sports" | "eca";
  sportOrActivity: string;
};

export type LearnerActivityAchievement = {
  id: string;
  title: string;
  date: string;
  teamName: string;
  domain: "sports" | "eca";
};

export type LearnerActivityPractice = {
  id: string;
  title: string;
  date: string;
  startTime: string | null;
  teamName: string;
  status: PracticeSessionDto["status"];
};

export type LearnerActivitiesData = {
  sportsSquads: LearnerActivitySquad[];
  ecaGroups: LearnerActivitySquad[];
  sportsAchievements: LearnerActivityAchievement[];
  ecaAchievements: LearnerActivityAchievement[];
  sportsPractice: LearnerActivityPractice[];
  ecaPractice: LearnerActivityPractice[];
};

export async function loadLearnerActivities(input: {
  instituteId: string;
  studentId: string;
}): Promise<LearnerActivitiesData> {
  const { instituteId, studentId } = input;
  const [sections, teams, memberships, achievements, practice] = await Promise.all([
    listActivitySections(instituteId),
    listActivityTeams(instituteId),
    listActivityMemberships(instituteId),
    listAchievements(instituteId, studentId),
    listPracticeSessions(instituteId),
  ]);

  const sectionById = new Map(sections.map((s) => [s.id, s]));
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const activeMemberships = memberships.filter(
    (m: ActivityMembershipDto) => m.studentId === studentId && m.status === "active",
  );

  const squads: LearnerActivitySquad[] = activeMemberships
    .map((m) => {
      const team = teamById.get(m.teamId);
      const section = team ? sectionById.get(team.sectionId) : undefined;
      if (!team || !section) return null;
      return {
        teamId: team.id,
        teamName: team.name,
        sectionName: section.name,
        domain: section.domain,
        sportOrActivity: section.name,
      };
    })
    .filter((s): s is LearnerActivitySquad => Boolean(s));

  const teamIds = new Set(activeMemberships.map((m) => m.teamId));

  const mapAchievement = (row: AchievementDto): LearnerActivityAchievement | null => {
    const team = row.teamId ? teamById.get(row.teamId) : null;
    const section = team ? sectionById.get(team.sectionId) : null;
    if (!team || !section) return null;
    return {
      id: row.id,
      title: row.title,
      date: row.awardedOn,
      teamName: team.name,
      domain: section.domain,
    };
  };

  const mappedAchievements = achievements
    .map(mapAchievement)
    .filter((a): a is LearnerActivityAchievement => Boolean(a));

  const mapPractice = (row: PracticeSessionDto): (LearnerActivityPractice & {
    domain: "sports" | "eca";
  }) | null => {
    if (!teamIds.has(row.teamId)) return null;
    const team = teamById.get(row.teamId);
    const section = team ? sectionById.get(team.sectionId) : undefined;
    if (!team || !section) return null;
    return {
      id: row.id,
      title: row.title,
      date: row.scheduledOn,
      startTime: row.startTime,
      teamName: team.name,
      status: row.status,
      domain: section.domain,
    };
  };

  const mappedPractice = practice
    .map(mapPractice)
    .filter((p): p is LearnerActivityPractice & { domain: "sports" | "eca" } => Boolean(p));

  return {
    sportsSquads: squads.filter((s) => s.domain === "sports"),
    ecaGroups: squads.filter((s) => s.domain === "eca"),
    sportsAchievements: mappedAchievements.filter((a) => a.domain === "sports"),
    ecaAchievements: mappedAchievements.filter((a) => a.domain === "eca"),
    sportsPractice: mappedPractice
      .filter((p) => p.domain === "sports")
      .map(({ domain: _domain, ...rest }) => rest),
    ecaPractice: mappedPractice
      .filter((p) => p.domain === "eca")
      .map(({ domain: _domain, ...rest }) => rest),
  };
}
