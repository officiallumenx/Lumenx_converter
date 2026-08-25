import { inferAcademicYearLabel } from "@lumenx/utils";

/** Infer academic year label from ISO date (April start). e.g. 2026-05-01 → "2026–27" */
export function inferAcademicYear(dateIso: string): string {
  return inferAcademicYearLabel(dateIso);
}
