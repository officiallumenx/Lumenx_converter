import {
  hierarchyEcaActivitiesSeed,
  hierarchyGroupsSeed,
  hierarchySportsSeed,
  hierarchyTeamsSeed,
} from "./mock";
import type {
  CreateEcaActivityInput,
  CreateGroupInput,
  CreateSportInput,
  CreateTeamInput,
  HierarchyEcaActivity,
  HierarchyGroup,
  HierarchySport,
  HierarchyStudent,
  HierarchyTeam,
  HierarchyUnit,
  SportsCategory,
} from "./types";

let sportsStore: HierarchySport[] = hierarchySportsSeed.map((s) => ({ ...s }));
let teamsStore: HierarchyTeam[] = hierarchyTeamsSeed.map((t) => ({
  ...t,
  students: t.students.map((s) => ({ ...s })),
}));
let ecaActivitiesStore: HierarchyEcaActivity[] = hierarchyEcaActivitiesSeed.map((a) => ({
  ...a,
}));
let groupsStore: HierarchyGroup[] = hierarchyGroupsSeed.map((g) => ({
  ...g,
  students: g.students.map((s) => ({ ...s })),
}));

function cloneStudent(s: HierarchyStudent): HierarchyStudent {
  return { ...s };
}

export function listSportsByCategoryFromStore(category: SportsCategory): HierarchySport[] {
  return sportsStore.filter((s) => s.category === category).map((s) => ({ ...s }));
}

export function listAllSportsFromStore(): HierarchySport[] {
  return sportsStore.map((s) => ({ ...s }));
}

export function getSportByIdFromStore(id: string): HierarchySport | null {
  const found = sportsStore.find((s) => s.id === id);
  return found ? { ...found } : null;
}

export function createSportInStore(input: CreateSportInput): HierarchySport {
  const sport: HierarchySport = {
    id: `sport-${Date.now()}`,
    name: input.name.trim(),
    category: input.category,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  sportsStore = [...sportsStore, sport];
  return { ...sport };
}

export function listTeamsBySportFromStore(sportId: string): HierarchyTeam[] {
  return teamsStore
    .filter((t) => t.sportId === sportId)
    .map((t) => ({ ...t, students: t.students.map(cloneStudent) }));
}

export function getTeamByIdFromStore(id: string): HierarchyTeam | null {
  const found = teamsStore.find((t) => t.id === id);
  return found ? { ...found, students: found.students.map(cloneStudent) } : null;
}

export function createTeamInStore(input: CreateTeamInput): HierarchyTeam {
  const team: HierarchyTeam = {
    id: `team-${Date.now()}`,
    sportId: input.sportId,
    name: input.name.trim(),
    students: [],
    createdAt: new Date().toISOString().slice(0, 10),
  };
  teamsStore = [...teamsStore, team];
  return { ...team, students: [] };
}

export function setTeamStudentsInStore(
  teamId: string,
  students: HierarchyStudent[],
): HierarchyTeam | null {
  const idx = teamsStore.findIndex((t) => t.id === teamId);
  if (idx < 0) return null;
  const next = {
    ...teamsStore[idx],
    students: students.map(cloneStudent),
  };
  teamsStore = teamsStore.map((t, i) => (i === idx ? next : t));
  return { ...next, students: next.students.map(cloneStudent) };
}

export function listEcaActivitiesFromStore(): HierarchyEcaActivity[] {
  return ecaActivitiesStore.map((a) => ({ ...a }));
}

export function getEcaActivityByIdFromStore(id: string): HierarchyEcaActivity | null {
  const found = ecaActivitiesStore.find((a) => a.id === id);
  return found ? { ...found } : null;
}

export function createEcaActivityInStore(input: CreateEcaActivityInput): HierarchyEcaActivity {
  const activity: HierarchyEcaActivity = {
    id: `eca-${Date.now()}`,
    name: input.name.trim(),
    createdAt: new Date().toISOString().slice(0, 10),
  };
  ecaActivitiesStore = [...ecaActivitiesStore, activity];
  return { ...activity };
}

export function listGroupsByActivityFromStore(activityId: string): HierarchyGroup[] {
  return groupsStore
    .filter((g) => g.activityId === activityId)
    .map((g) => ({ ...g, students: g.students.map(cloneStudent) }));
}

export function getGroupByIdFromStore(id: string): HierarchyGroup | null {
  const found = groupsStore.find((g) => g.id === id);
  return found ? { ...found, students: found.students.map(cloneStudent) } : null;
}

export function createGroupInStore(input: CreateGroupInput): HierarchyGroup {
  const group: HierarchyGroup = {
    id: `group-${Date.now()}`,
    activityId: input.activityId,
    name: input.name.trim(),
    students: [],
    createdAt: new Date().toISOString().slice(0, 10),
  };
  groupsStore = [...groupsStore, group];
  return { ...group, students: [] };
}

export function setGroupStudentsInStore(
  groupId: string,
  students: HierarchyStudent[],
): HierarchyGroup | null {
  const idx = groupsStore.findIndex((g) => g.id === groupId);
  if (idx < 0) return null;
  const next = {
    ...groupsStore[idx],
    students: students.map(cloneStudent),
  };
  groupsStore = groupsStore.map((g, i) => (i === idx ? next : g));
  return { ...next, students: next.students.map(cloneStudent) };
}

/** Unified units for future Attendance / Messages / Certificates / Practice. */
export function listUnitsFromStore(domain?: "sports" | "eca"): HierarchyUnit[] {
  const sports: HierarchyUnit[] =
    domain === "eca"
      ? []
      : teamsStore.map((team) => {
          const sport = sportsStore.find((s) => s.id === team.sportId);
          return {
            id: team.id,
            domain: "sports" as const,
            kind: "team" as const,
            name: team.name,
            parentId: team.sportId,
            parentName: sport?.name ?? "Sport",
            category: sport?.category,
            students: team.students.map(cloneStudent),
          };
        });

  const eca: HierarchyUnit[] =
    domain === "sports"
      ? []
      : groupsStore.map((group) => {
          const activity = ecaActivitiesStore.find((a) => a.id === group.activityId);
          return {
            id: group.id,
            domain: "eca" as const,
            kind: "group" as const,
            name: group.name,
            parentId: group.activityId,
            parentName: activity?.name ?? "Activity",
            students: group.students.map(cloneStudent),
          };
        });

  return [...sports, ...eca];
}

export function resetHierarchyStore() {
  sportsStore = hierarchySportsSeed.map((s) => ({ ...s }));
  teamsStore = hierarchyTeamsSeed.map((t) => ({
    ...t,
    students: t.students.map(cloneStudent),
  }));
  ecaActivitiesStore = hierarchyEcaActivitiesSeed.map((a) => ({ ...a }));
  groupsStore = hierarchyGroupsSeed.map((g) => ({
    ...g,
    students: g.students.map(cloneStudent),
  }));
}
