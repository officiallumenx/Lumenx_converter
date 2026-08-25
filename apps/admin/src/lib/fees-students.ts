/** Students available for fee concessions — Admin roster + Connect parent children. */

import { compareClassKeys } from "@lumenx/module-fees";

export type FeesStudentOption = {
  id: string;
  name: string;
  classKey: string;
  section: string;
  rollNo: string;
};

/** Connect parent children — IDs must match apps/connect mock children. */
export const CONNECT_FEE_STUDENTS: FeesStudentOption[] = [
  { id: "C1", name: "Aarav Sharma", classKey: "Class 10", section: "B", rollNo: "14" },
  { id: "C2", name: "Anaya Sharma", classKey: "Class 7", section: "A", rollNo: "06" },
  { id: "C3", name: "Vihaan Sharma", classKey: "Class 4", section: "C", rollNo: "21" },
];

const ADMIN_FEE_STUDENTS: FeesStudentOption[] = [
  { id: "STU-1042", name: "Aanya Sharma", classKey: "Grade 10", section: "A", rollNo: "12" },
  { id: "STU-1043", name: "Julian Draxler", classKey: "Grade 11", section: "C", rollNo: "07" },
  { id: "STU-1044", name: "Ethan Wright", classKey: "Grade 10", section: "B", rollNo: "08" },
  { id: "STU-1045", name: "Sana Khan", classKey: "Grade 12", section: "A", rollNo: "03" },
  { id: "STU-1046", name: "Alina Moreno", classKey: "Grade 9", section: "A", rollNo: "01" },
  { id: "STU-1047", name: "Marcus Lee", classKey: "Grade 11", section: "A", rollNo: "14" },
  { id: "STU-1048", name: "Priya Patel", classKey: "Grade 9", section: "B", rollNo: "05" },
  { id: "STU-1049", name: "Omar Haddad", classKey: "Grade 12", section: "B", rollNo: "22" },
];

export const FEES_STUDENT_OPTIONS: FeesStudentOption[] = [
  ...CONNECT_FEE_STUDENTS,
  ...ADMIN_FEE_STUDENTS,
];

export function feesStudentClasses(): string[] {
  return [...new Set(FEES_STUDENT_OPTIONS.map((s) => s.classKey))].sort(compareClassKeys);
}

export function feesStudentSections(classKey: string): string[] {
  return [
    ...new Set(
      FEES_STUDENT_OPTIONS.filter((s) => s.classKey === classKey).map((s) => s.section),
    ),
  ].sort();
}

export function feesStudentsFor(classKey: string, section: string): FeesStudentOption[] {
  return FEES_STUDENT_OPTIONS.filter(
    (s) => s.classKey === classKey && s.section === section,
  );
}

export function findFeesStudent(id: string): FeesStudentOption | undefined {
  return FEES_STUDENT_OPTIONS.find((s) => s.id === id);
}
