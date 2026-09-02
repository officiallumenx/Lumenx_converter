import {
  listClasses,
  listSections,
  listTeacherAssignments,
} from "./api";
import { buildSectionOptions } from "./map";
import type { DiarySectionOption } from "./types";

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
