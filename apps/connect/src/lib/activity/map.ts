import type { StudentDto } from "@/lib/students/types";
import type {
  ActivityMembershipDto,
  ActivitySectionDto,
  ActivityTeamDto,
} from "./api-types";
import type {
  HierarchyEcaActivity,
  HierarchyGroup,
  HierarchySport,
  HierarchyStudent,
  HierarchyTeam,
  HierarchyUnit,
  SportsCategory,
} from "./hierarchy/types";

export function studentDtoToHierarchyStudent(row: StudentDto): HierarchyStudent {
  const classLabel =
    row.classLabel && row.sectionLabel
      ? `${row.classLabel}-${row.sectionLabel}`
      : row.classLabel ?? row.sectionLabel ?? "—";
  return {
    id: row.id,
    name: row.displayName.trim() || `${row.firstName} ${row.surname}`.trim(),
    rollNo: row.rollNo ?? "—",
    classLabel,
  };
}

export function sectionToSport(row: ActivitySectionDto): HierarchySport {
  return {
    id: row.id,
    name: row.name,
    category: (row.sportsCategory ?? "outdoor") as SportsCategory,
    createdAt: row.createdAt.slice(0, 10),
  };
}

export function sectionToEcaActivity(row: ActivitySectionDto): HierarchyEcaActivity {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt.slice(0, 10),
  };
}

export function teamToHierarchyTeam(
  row: ActivityTeamDto,
  students: HierarchyStudent[],
): HierarchyTeam {
  return {
    id: row.id,
    sportId: row.sectionId,
    name: row.name,
    students,
    createdAt: row.createdAt.slice(0, 10),
  };
}

export function teamToHierarchyGroup(
  row: ActivityTeamDto,
  students: HierarchyStudent[],
): HierarchyGroup {
  return {
    id: row.id,
    activityId: row.sectionId,
    name: row.name,
    students,
    createdAt: row.createdAt.slice(0, 10),
  };
}

export function buildHierarchyUnits(input: {
  sections: ActivitySectionDto[];
  teams: ActivityTeamDto[];
  memberships: ActivityMembershipDto[];
  studentsById: Map<string, HierarchyStudent>;
}): HierarchyUnit[] {
  const sectionById = new Map(input.sections.map((s) => [s.id, s]));
  const units: HierarchyUnit[] = [];

  for (const team of input.teams) {
    const section = sectionById.get(team.sectionId);
    if (!section) continue;
    const students = input.memberships
      .filter((m) => m.teamId === team.id && m.status === "active")
      .map((m) => input.studentsById.get(m.studentId))
      .filter((s): s is HierarchyStudent => Boolean(s));

    units.push({
      id: team.id,
      domain: section.domain,
      kind: team.kind,
      name: team.name,
      parentId: section.id,
      parentName: section.name,
      category: section.sportsCategory ?? undefined,
      students,
    });
  }

  return units;
}

export function membershipsForTeam(
  teamId: string,
  memberships: ActivityMembershipDto[],
): ActivityMembershipDto[] {
  return memberships.filter((m) => m.teamId === teamId && m.status === "active");
}
