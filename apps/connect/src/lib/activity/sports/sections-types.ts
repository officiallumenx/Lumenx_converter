/** User-created sport section (e.g. Cricket, Kabaddi). */
export type SportsSectionEnvironment = "indoor" | "outdoor";

export interface SportsProgramSection {
  id: string;
  name: string;
  environment: SportsSectionEnvironment;
  createdAt: string;
}

export interface SportsProgramSectionInput {
  name: string;
  environment: SportsSectionEnvironment;
}

export const SPORTS_SECTION_ENVIRONMENT_LABELS: Record<SportsSectionEnvironment, string> = {
  indoor: "Indoor",
  outdoor: "Outdoor",
};
