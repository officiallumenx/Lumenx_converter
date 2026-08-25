import { MODULE_IDS } from "@lumenx/config/module-ids";

export const MODULE_ID = MODULE_IDS.students;
export const MIN_PLAN = "core" as const;
export const OWNER_APP = "admin" as const;

export type StudentStatus = "active" | "at-risk" | "watch" | "inactive" | "graduated";

export interface AdminStudentRecord {
  id: string;
  name: string;
  grade: string;
  attendance: number;
  gpa: number;
  status: StudentStatus;
  parent: string;
}

export type AdminStudentSortKey = "name" | "grade" | "attendance" | "gpa";

export const MOCK_ADMIN_STUDENTS: AdminStudentRecord[] = [
  { id: "STU-1042", name: "Aanya Sharma", grade: "10-A", attendance: 96, gpa: 3.8, status: "active", parent: "R. Sharma" },
  { id: "STU-1043", name: "Julian Draxler", grade: "11-C", attendance: 71, gpa: 2.2, status: "at-risk", parent: "M. Draxler" },
  { id: "STU-1044", name: "Ethan Wright", grade: "10-B", attendance: 85, gpa: 2.9, status: "watch", parent: "S. Wright" },
  { id: "STU-1045", name: "Sana Khan", grade: "12-A", attendance: 91, gpa: 3.5, status: "active", parent: "I. Khan" },
  { id: "STU-1046", name: "Alina Moreno", grade: "9-A", attendance: 68, gpa: 2.1, status: "at-risk", parent: "C. Moreno" },
  { id: "STU-1047", name: "Marcus Lee", grade: "11-A", attendance: 99, gpa: 3.95, status: "active", parent: "H. Lee" },
  { id: "STU-1048", name: "Priya Patel", grade: "9-B", attendance: 93, gpa: 3.6, status: "active", parent: "K. Patel" },
  { id: "STU-1049", name: "Omar Haddad", grade: "12-B", attendance: 78, gpa: 2.8, status: "watch", parent: "F. Haddad" },
];

export function filterAdminStudents(
  records: AdminStudentRecord[],
  query: string,
  status: "all" | StudentStatus,
): AdminStudentRecord[] {
  const q = query.trim().toLowerCase();
  return records.filter((s) => {
    const statusOk = status === "all" || s.status === status;
    const queryOk =
      q === "" ||
      s.name.toLowerCase().includes(q) ||
      s.id.toUpperCase().includes(query.trim().toUpperCase());
    return statusOk && queryOk;
  });
}

export function sortAdminStudents(
  records: AdminStudentRecord[],
  key: AdminStudentSortKey,
  dir: "asc" | "desc",
): AdminStudentRecord[] {
  const mul = dir === "asc" ? 1 : -1;
  return [...records].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * mul;
    return String(av).localeCompare(String(bv)) * mul;
  });
}
