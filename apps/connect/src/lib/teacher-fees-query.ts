import type { TeacherFeeRecord } from "@/lib/teacher/repositories";

export type TeacherFeeStatusFilter = "all" | "due" | "overdue" | "paid";

export function teacherFeeHasOverdue(record: TeacherFeeRecord): boolean {
  return (
    record.tuition.status === "overdue" ||
    record.examFee.status === "overdue" ||
    record.transport?.status === "overdue"
  );
}

export function isTeacherFeeFullyPaid(record: TeacherFeeRecord): boolean {
  return record.totalDue === 0;
}

export function filterTeacherFeeRecords(
  records: TeacherFeeRecord[],
  filters: {
    className: string | "all";
    section: string | "all";
    status: TeacherFeeStatusFilter;
  },
): TeacherFeeRecord[] {
  const scoped = records.filter((record) => {
    if (filters.className !== "all" && record.className !== filters.className) return false;
    if (filters.section !== "all" && record.section !== filters.section) return false;
    return true;
  });

  if (filters.status === "all") return scoped;
  if (filters.status === "paid") return scoped.filter(isTeacherFeeFullyPaid);
  if (filters.status === "overdue") return scoped.filter(teacherFeeHasOverdue);
  return scoped.filter((record) => record.totalDue > 0);
}

export function summarizeTeacherFeeScope(records: TeacherFeeRecord[]) {
  const totalDue = records.reduce((sum, record) => sum + record.totalDue, 0);
  const pendingStudents = records.filter((record) => record.totalDue > 0).length;
  const overdueStudents = records.filter(teacherFeeHasOverdue).length;
  const clearedStudents = records.filter(isTeacherFeeFullyPaid).length;
  const dueOnlyStudents = records.filter(
    (record) => record.totalDue > 0 && !teacherFeeHasOverdue(record),
  ).length;
  return {
    totalDue,
    pendingStudents,
    overdueStudents,
    clearedStudents,
    dueOnlyStudents,
    studentCount: records.length,
  };
}

export function teacherFeeScopeLabel(
  classNameFilter: string | "all",
  sectionFilter: string | "all",
): string {
  if (classNameFilter === "all" && sectionFilter === "all") return "All classes";
  if (sectionFilter === "all") return `Class ${classNameFilter}`;
  return `Class ${classNameFilter}-${sectionFilter}`;
}
