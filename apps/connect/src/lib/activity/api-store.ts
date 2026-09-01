import {
  createActivityMembership,
  createActivitySection,
  createActivityTeam,
  deleteActivityMembership,
  listActivityMemberships,
  listActivitySections,
  listActivityTeams,
} from "./api";
import type {
  ActivityMembershipDto,
  ActivitySectionDto,
  ActivityTeamDto,
} from "./api-types";
import { getActivityApiInstituteId } from "./context";
import {
  buildHierarchyUnits,
  membershipsForTeam,
  sectionToEcaActivity,
  sectionToSport,
  studentDtoToHierarchyStudent,
  teamToHierarchyGroup,
  teamToHierarchyTeam,
} from "./map";
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
} from "./hierarchy/types";
import { listStudents } from "@/lib/students/api";
import type { StudentDto } from "@/lib/students/types";

type ActivityApiSnapshot = {
  sections: ActivitySectionDto[];
  teams: ActivityTeamDto[];
  memberships: ActivityMembershipDto[];
  studentsById: Map<string, HierarchyStudent>;
};

let snapshot: ActivityApiSnapshot = {
  sections: [],
  teams: [],
  memberships: [],
  studentsById: new Map(),
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function requireInstitute(): string {
  const id = getActivityApiInstituteId();
  if (!id) throw new Error("Activity API context is not configured");
  return id;
}

async function loadStudents(instituteId: string): Promise<Map<string, HierarchyStudent>> {
  const rows = await listStudents({ instituteId, status: "active" });
  const map = new Map<string, HierarchyStudent>();
  for (const row of rows) {
    map.set(row.id, studentDtoToHierarchyStudent(row));
  }
  return map;
}

export function subscribeActivityApiStore(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getActivityApiSnapshot(): ActivityApiSnapshot {
  return snapshot;
}

export async function loadActivityApiHierarchy(): Promise<void> {
  const instituteId = requireInstitute();
  const [sections, teams, memberships, studentsById] = await Promise.all([
    listActivitySections(instituteId),
    listActivityTeams(instituteId),
    listActivityMemberships(instituteId),
    loadStudents(instituteId),
  ]);
  snapshot = { sections, teams, memberships, studentsById };
  emit();
}

export function resetActivityApiStore() {
  snapshot = {
    sections: [],
    teams: [],
    memberships: [],
    studentsById: new Map(),
  };
  emit();
}

function studentsForTeam(teamId: string): HierarchyStudent[] {
  return membershipsForTeam(teamId, snapshot.memberships)
    .map((m) => snapshot.studentsById.get(m.studentId))
    .filter((s): s is HierarchyStudent => Boolean(s));
}

export async function apiListSportsByCategory(
  category: SportsCategory,
): Promise<HierarchySport[]> {
  await loadActivityApiHierarchy();
  return snapshot.sections
    .filter((s) => s.domain === "sports" && s.sportsCategory === category)
    .map(sectionToSport);
}

export async function apiListSports(): Promise<HierarchySport[]> {
  await loadActivityApiHierarchy();
  return snapshot.sections.filter((s) => s.domain === "sports").map(sectionToSport);
}

export async function apiGetSport(id: string): Promise<HierarchySport | null> {
  await loadActivityApiHierarchy();
  const row = snapshot.sections.find((s) => s.id === id && s.domain === "sports");
  return row ? sectionToSport(row) : null;
}

export async function apiCreateSport(input: CreateSportInput): Promise<HierarchySport> {
  const instituteId = requireInstitute();
  const row = await createActivitySection({
    instituteId,
    domain: "sports",
    sportsCategory: input.category,
    name: input.name,
  });
  snapshot = {
    ...snapshot,
    sections: [...snapshot.sections.filter((s) => s.id !== row.id), row],
  };
  emit();
  return sectionToSport(row);
}

export async function apiListTeamsBySport(sportId: string): Promise<HierarchyTeam[]> {
  await loadActivityApiHierarchy();
  return snapshot.teams
    .filter((t) => t.sectionId === sportId && t.kind === "team")
    .map((t) => teamToHierarchyTeam(t, studentsForTeam(t.id)));
}

export async function apiGetTeam(id: string): Promise<HierarchyTeam | null> {
  await loadActivityApiHierarchy();
  const row = snapshot.teams.find((t) => t.id === id && t.kind === "team");
  return row ? teamToHierarchyTeam(row, studentsForTeam(row.id)) : null;
}

export async function apiCreateTeam(input: CreateTeamInput): Promise<HierarchyTeam> {
  const instituteId = requireInstitute();
  const row = await createActivityTeam({
    instituteId,
    sectionId: input.sportId,
    kind: "team",
    name: input.name,
  });
  snapshot = {
    ...snapshot,
    teams: [...snapshot.teams.filter((t) => t.id !== row.id), row],
  };
  emit();
  return teamToHierarchyTeam(row, []);
}

export async function apiSetTeamStudents(
  teamId: string,
  students: HierarchyStudent[],
): Promise<HierarchyTeam | null> {
  const instituteId = requireInstitute();
  await loadActivityApiHierarchy();
  const team = snapshot.teams.find((t) => t.id === teamId && t.kind === "team");
  if (!team) return null;

  const current = membershipsForTeam(teamId, snapshot.memberships);
  const desired = new Set(students.map((s) => s.id));
  const currentIds = new Set(current.map((m) => m.studentId));

  for (const m of current) {
    if (!desired.has(m.studentId)) {
      await deleteActivityMembership(m.id);
    }
  }
  for (const studentId of desired) {
    if (!currentIds.has(studentId)) {
      await createActivityMembership({ instituteId, teamId, studentId });
    }
  }

  const memberships = await listActivityMemberships(instituteId, teamId);
  snapshot = {
    ...snapshot,
    memberships: [
      ...snapshot.memberships.filter((m) => m.teamId !== teamId),
      ...memberships,
    ],
    studentsById: new Map([
      ...snapshot.studentsById,
      ...students.map((s) => [s.id, s] as const),
    ]),
  };
  emit();
  return teamToHierarchyTeam(team, students);
}

export async function apiListEcaActivities(): Promise<HierarchyEcaActivity[]> {
  await loadActivityApiHierarchy();
  return snapshot.sections.filter((s) => s.domain === "eca").map(sectionToEcaActivity);
}

export async function apiGetEcaActivity(id: string): Promise<HierarchyEcaActivity | null> {
  await loadActivityApiHierarchy();
  const row = snapshot.sections.find((s) => s.id === id && s.domain === "eca");
  return row ? sectionToEcaActivity(row) : null;
}

export async function apiCreateEcaActivity(
  input: CreateEcaActivityInput,
): Promise<HierarchyEcaActivity> {
  const instituteId = requireInstitute();
  const row = await createActivitySection({
    instituteId,
    domain: "eca",
    name: input.name,
  });
  snapshot = {
    ...snapshot,
    sections: [...snapshot.sections.filter((s) => s.id !== row.id), row],
  };
  emit();
  return sectionToEcaActivity(row);
}

export async function apiListGroupsByActivity(
  activityId: string,
): Promise<HierarchyGroup[]> {
  await loadActivityApiHierarchy();
  return snapshot.teams
    .filter((t) => t.sectionId === activityId && t.kind === "group")
    .map((t) => teamToHierarchyGroup(t, studentsForTeam(t.id)));
}

export async function apiGetGroup(id: string): Promise<HierarchyGroup | null> {
  await loadActivityApiHierarchy();
  const row = snapshot.teams.find((t) => t.id === id && t.kind === "group");
  return row ? teamToHierarchyGroup(row, studentsForTeam(row.id)) : null;
}

export async function apiCreateGroup(input: CreateGroupInput): Promise<HierarchyGroup> {
  const instituteId = requireInstitute();
  const row = await createActivityTeam({
    instituteId,
    sectionId: input.activityId,
    kind: "group",
    name: input.name,
  });
  snapshot = {
    ...snapshot,
    teams: [...snapshot.teams.filter((t) => t.id !== row.id), row],
  };
  emit();
  return teamToHierarchyGroup(row, []);
}

export async function apiSetGroupStudents(
  groupId: string,
  students: HierarchyStudent[],
): Promise<HierarchyGroup | null> {
  const instituteId = requireInstitute();
  await loadActivityApiHierarchy();
  const group = snapshot.teams.find((t) => t.id === groupId && t.kind === "group");
  if (!group) return null;

  const current = membershipsForTeam(groupId, snapshot.memberships);
  const desired = new Set(students.map((s) => s.id));
  const currentIds = new Set(current.map((m) => m.studentId));

  for (const m of current) {
    if (!desired.has(m.studentId)) {
      await deleteActivityMembership(m.id);
    }
  }
  for (const studentId of desired) {
    if (!currentIds.has(studentId)) {
      await createActivityMembership({ instituteId, teamId: groupId, studentId });
    }
  }

  const memberships = await listActivityMemberships(instituteId, groupId);
  snapshot = {
    ...snapshot,
    memberships: [
      ...snapshot.memberships.filter((m) => m.teamId !== groupId),
      ...memberships,
    ],
    studentsById: new Map([
      ...snapshot.studentsById,
      ...students.map((s) => [s.id, s] as const),
    ]),
  };
  emit();
  return teamToHierarchyGroup(group, students);
}

export async function apiListUnits(domain?: "sports" | "eca"): Promise<HierarchyUnit[]> {
  await loadActivityApiHierarchy();
  const units = buildHierarchyUnits({
    sections: snapshot.sections,
    teams: snapshot.teams,
    memberships: snapshot.memberships,
    studentsById: snapshot.studentsById,
  });
  return domain ? units.filter((u) => u.domain === domain) : units;
}

export async function refreshActivityApiStudents(rows?: StudentDto[]): Promise<void> {
  const instituteId = requireInstitute();
  const studentsById = rows
    ? new Map(rows.map((r) => [r.id, studentDtoToHierarchyStudent(r)]))
    : await loadStudents(instituteId);
  snapshot = { ...snapshot, studentsById };
  emit();
}
