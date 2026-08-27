/** Mirrors backend `InstituteDto` — keep in sync with identity/types.ts. */

export type InstituteKind =
  | "school"
  | "junior_college"
  | "degree_college"
  | "engineering"
  | "university";

export type InstituteStatus = "active" | "inactive" | "suspended" | "archived";

export type InstituteDto = {
  id: string;
  code: string;
  name: string;
  kind: InstituteKind;
  status: InstituteStatus;
  createdAt: string;
  updatedAt: string;
};
