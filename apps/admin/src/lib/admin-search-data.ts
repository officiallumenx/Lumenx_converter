import { adminNav } from "./admin-nav";
import { getRolePermission } from "./roles-access";
import { CURRENT_INSTITUTE_ID } from "./institute-billing-store";
import { loadStudentDirectory } from "./student-directory-store";
import { isApiAuthMode } from "@/auth/auth-mode";

export type AdminSearchItem = {
  id: string;
  label: string;
  hint?: string;
  value: string;
  to: string;
  params?: Record<string, string>;
  group: "pages" | "students" | "teachers";
  /** Always the signed-in institute — never mixed across institutes. */
  instituteId: string;
};

/** Demo teachers for the current Admin institute only. */
export const SEARCH_TEACHERS = [
  {
    id: "T-001",
    name: "Sarah Jenkins",
    dept: "Mathematics",
    email: "s.jenkins@institute.edu",
    phone: "9876501221",
    employeeId: "EMP-1041",
  },
  {
    id: "T-002",
    name: "David Koal",
    dept: "Physics",
    email: "d.koal@institute.edu",
    phone: "9876501222",
    employeeId: "EMP-1042",
  },
  {
    id: "T-003",
    name: "Priya Iyer",
    dept: "Biology",
    email: "p.iyer@institute.edu",
    phone: "9822044102",
    employeeId: "EMP-1043",
  },
  {
    id: "T-004",
    name: "Marcus Whitfield",
    dept: "English",
    email: "m.whitfield@institute.edu",
    phone: "9876501441",
    employeeId: "EMP-1044",
  },
  {
    id: "T-005",
    name: "Hana Suzuki",
    dept: "Chemistry",
    email: "h.suzuki@institute.edu",
    phone: "9876501567",
    employeeId: "EMP-1045",
  },
  {
    id: "T-006",
    name: "Omar Faris",
    dept: "History",
    email: "o.faris@institute.edu",
    phone: "9876501882",
    employeeId: "EMP-1046",
  },
] as const;

export type AdminSearchScope = {
  /** Session institute id (Admin portal for this tenant only). */
  instituteId: string;
  accessRoleId?: string;
};

/**
 * Build search index for the current Admin institute + Admin portal only.
 * Never includes other institutes or Connect/Transport portal data.
 */
export function buildAdminSearchIndex(scope: AdminSearchScope): AdminSearchItem[] {
  const instituteId = scope.instituteId || CURRENT_INSTITUTE_ID;
  const accessRoleId = scope.accessRoleId;

  const pages: AdminSearchItem[] = adminNav.flatMap((group) =>
    group.items
      .filter(
        (item) => !accessRoleId || getRolePermission(accessRoleId, item.to) !== "none",
      )
      .map((item) => ({
        id: `page-${item.to}`,
        label: item.label,
        hint: group.label,
        value: `${item.label} ${group.label} page navigation ${instituteId}`,
        to: item.to,
        group: "pages" as const,
        instituteId,
      })),
  );

  const students: AdminSearchItem[] = isApiAuthMode()
    ? []
    : loadStudentDirectory().map((s) => {
        const classLabel = s.grade || "";
        const parentLabel = s.parentName || s.parent || "";
        return {
          id: `student-${s.id}`,
          label: s.name,
          hint: `${classLabel} · ${s.id}`,
          value: `${s.name} ${classLabel} ${s.id} ${parentLabel} student ${instituteId}`,
          to: "/students/$id",
          params: { id: s.id },
          group: "students" as const,
          instituteId,
        };
      });

  const teachers: AdminSearchItem[] = isApiAuthMode()
    ? []
    : SEARCH_TEACHERS.map((t) => ({
        id: `teacher-${t.id}`,
        label: t.name,
        hint: `${t.dept} · ${t.employeeId}`,
        value: `${t.name} ${t.dept} ${t.email} ${t.phone} ${t.employeeId} teacher faculty ${instituteId}`,
        to: "/teachers",
        group: "teachers" as const,
        instituteId,
      }));

  const canSeeStudents =
    !accessRoleId || getRolePermission(accessRoleId, "/students") !== "none";
  const canSeeTeachers =
    !accessRoleId || getRolePermission(accessRoleId, "/teachers") !== "none";

  return [
    ...pages,
    ...(canSeeStudents ? students : []),
    ...(canSeeTeachers ? teachers : []),
  ].filter((item) => item.instituteId === instituteId);
}
