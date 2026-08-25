/**
 * Activity Hub — audience selection model.
 * Structured for future backend compatibility.
 */
export type AudienceScopeType =
  | "entire_institute"
  | "classes"
  | "sections"
  | "groups"
  | "teams"
  | "individual_students";

export type AudienceClassSelection = {
  type: "classes";
  classNames: string[];
};

export type AudienceSectionSelection = {
  type: "sections";
  sections: { className: string; section: string }[];
};

export type AudienceGroupSelection = {
  type: "groups";
  groupIds: string[];
  groupLabels?: string[];
};

export type AudienceStudentSelection = {
  type: "individual_students";
  studentIds: string[];
  /** Optional display labels aligned with studentIds (notifications / summaries). */
  studentLabels?: string[];
};

export type AudienceTeamSelection = {
  type: "teams";
  teamIds: string[];
  teamLabels?: string[];
};

export type ActivityAudienceSelection =
  | { type: "entire_institute" }
  | AudienceClassSelection
  | AudienceSectionSelection
  | AudienceGroupSelection
  | AudienceTeamSelection
  | AudienceStudentSelection;

/** Human-readable summary for cards and confirmation previews. */
export function summarizeAudience(audience: ActivityAudienceSelection): string {
  switch (audience.type) {
    case "entire_institute":
      return "Entire Institute";
    case "classes":
      return audience.classNames.map((c) => `Class ${c}`).join(", ");
    case "sections":
      return audience.sections.map((s) => `${s.className}-${s.section}`).join(", ");
    case "groups":
      return audience.groupLabels?.join(", ") ?? `${audience.groupIds.length} groups`;
    case "teams":
      return audience.teamLabels?.join(", ") ?? `${audience.teamIds.length} teams`;
    case "individual_students":
      return `${audience.studentIds.length} students`;
    default:
      return "Selected audience";
  }
}
