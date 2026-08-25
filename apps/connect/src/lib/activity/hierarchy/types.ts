/**
 * Activity Coordinator — reusable Sports / ECA hierarchy (V1 foundation).
 * Team (Sports) and Group (ECA) share the HierarchyUnit concept.
 */

export type ActivityDomain = "sports" | "eca";

/** Sports first level (UI: Indoor Sports / Outdoor Sports). */
export type SportsCategory = "indoor" | "outdoor";

export const SPORTS_CATEGORY_LABELS: Record<SportsCategory, string> = {
  indoor: "Indoor Sports",
  outdoor: "Outdoor Sports",
};

/** Student on a Team or Group roster. */
export type HierarchyStudent = {
  id: string;
  name: string;
  rollNo: string;
  classLabel: string;
};

/** Sport under Indoor Sports / Outdoor Sports. */
export type HierarchySport = {
  id: string;
  name: string;
  category: SportsCategory;
  createdAt: string;
};

/** Team under a Sport. */
export type HierarchyTeam = {
  id: string;
  sportId: string;
  name: string;
  students: HierarchyStudent[];
  createdAt: string;
};

/** ECA activity (Dance, Music, …). */
export type HierarchyEcaActivity = {
  id: string;
  name: string;
  createdAt: string;
};

/** Group under an ECA activity. */
export type HierarchyGroup = {
  id: string;
  activityId: string;
  name: string;
  students: HierarchyStudent[];
  createdAt: string;
};

/**
 * Reusable unit — Team (Sports) or Group (ECA).
 * Shared modules must target these units, not invent parallel lists.
 */
export type HierarchyUnit = {
  id: string;
  domain: ActivityDomain;
  kind: "team" | "group";
  name: string;
  parentId: string;
  parentName: string;
  category?: SportsCategory;
  students: HierarchyStudent[];
};

export type CreateSportInput = {
  name: string;
  category: SportsCategory;
};

export type CreateTeamInput = {
  sportId: string;
  name: string;
};

export type CreateEcaActivityInput = {
  name: string;
};

export type CreateGroupInput = {
  activityId: string;
  name: string;
};

export function unitKindLabel(kind: HierarchyUnit["kind"]): string {
  return kind === "team" ? "Team" : "Group";
}

export function formatUnitLabel(unit: HierarchyUnit): string {
  return `${unit.parentName} · ${unit.name}`;
}

export function domainLabel(domain: ActivityDomain): string {
  return domain === "sports" ? "Sports" : "Extra-Curricular (ECA)";
}
