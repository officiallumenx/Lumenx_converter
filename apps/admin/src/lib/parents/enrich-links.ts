import type { ParentListItem } from "./types";
import type { StudentListItem } from "@/lib/students";

export function linkedChildrenDisplayForParent(
  parent: Pick<ParentListItem, "linkedStudentIds">,
  studentById: Map<string, StudentListItem>,
): string {
  const labels = parent.linkedStudentIds
    .map((id) => {
      const student = studentById.get(id);
      if (!student) return null;
      return `${student.name} (${student.grade})`;
    })
    .filter(Boolean) as string[];

  if (labels.length === 0) return "No linked children";
  return labels.join(" · ");
}

export function enrichParentListItemsWithStudents(
  items: ParentListItem[],
  students: StudentListItem[],
): ParentListItem[] {
  const studentById = new Map(students.map((s) => [s.id, s]));
  return items.map((item) => ({
    ...item,
    linkedChildrenDisplay: linkedChildrenDisplayForParent(item, studentById),
  }));
}

export function enrichParentDetailWithStudents<
  T extends ParentListItem & { links: Array<{ studentId: string }> },
>(parent: T, students: StudentListItem[]): T & { linkStudentLabels: Record<string, string> } {
  const studentById = new Map(students.map((s) => [s.id, s]));
  const linkStudentLabels: Record<string, string> = {};
  for (const link of parent.links) {
    const student = studentById.get(link.studentId);
    linkStudentLabels[link.studentId] = student
      ? `${student.name} (${student.grade})`
      : `Student · ${link.studentId.slice(0, 8)}…`;
  }
  return {
    ...parent,
    linkedChildrenDisplay: linkedChildrenDisplayForParent(parent, studentById),
    linkStudentLabels,
  };
}
