import {
  listClasses,
  listSections,
  listTeacherAssignments,
} from "@/lib/teacher-classes/api";
import { buildSectionOptions } from "./map";
import type { DiarySectionOption } from "./types";

/** Prefer roster/portal.classes on Home; this path hits shared catalog TTL cache. */
export async function loadDiarySectionOptions(input: {
  instituteId: string;
  teacherId: string;
}): Promise<DiarySectionOption[]> {
  const [assignments, sections, classes] = await Promise.all([
    listTeacherAssignments({
      instituteId: input.instituteId,
      teacherId: input.teacherId,
    }),
    listSections(input.instituteId),
    listClasses(input.instituteId),
  ]);
  return buildSectionOptions({ assignments, sections, classes });
}
