/** Core institute identity types — kept separate to avoid circular exports with demo-profiles. */

export type InstituteKind =
  | "school"
  | "junior_college"
  | "degree_college"
  | "engineering"
  | "university";

/** Registered campus shown at sign-in (multi-institute UX). */
export interface Institute {
  id: string;
  name: string;
  code: string;
  kind: InstituteKind;
}
