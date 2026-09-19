import { adminNav } from "./admin-nav";
import { getRolePermission } from "./roles-access";
import { CURRENT_INSTITUTE_ID } from "./institute-billing-store";
import type { StudentDto } from "@/lib/students/types";
import type { TeacherDto } from "@/lib/teachers/types";

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

export type AdminSearchScope = {
  /** Session institute id (Admin portal for this tenant only). */
  instituteId: string;
  accessRoleId?: string;
};

/**
 * Build page-only search index for the current Admin institute.
 * Students/teachers are loaded asynchronously via {@link buildAdminPeopleSearchItems}.
 */
export function buildAdminSearchIndex(scope: AdminSearchScope): AdminSearchItem[] {
  const instituteId = scope.instituteId || CURRENT_INSTITUTE_ID;
  const accessRoleId = scope.accessRoleId;

  return adminNav.flatMap((group) =>
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
  ).filter((item) => item.instituteId === instituteId);
}

export function buildAdminPeopleSearchItems(input: {
  instituteId: string;
  accessRoleId?: string;
  students: StudentDto[];
  teachers: TeacherDto[];
}): AdminSearchItem[] {
  const { instituteId, accessRoleId, students, teachers } = input;
  const canSeeStudents =
    !accessRoleId || getRolePermission(accessRoleId, "/students") !== "none";
  const canSeeTeachers =
    !accessRoleId || getRolePermission(accessRoleId, "/teachers") !== "none";

  const studentItems: AdminSearchItem[] = canSeeStudents
    ? students.map((s) => {
        const name = s.displayName?.trim() || `${s.firstName} ${s.surname ?? ""}`.trim();
        const classLabel = s.classLabel || "";
        return {
          id: `student-${s.id}`,
          label: name,
          hint: `${classLabel} · ${s.id.slice(0, 8)}`,
          value: `${name} ${classLabel} ${s.id} student ${instituteId}`,
          to: "/students/$id",
          params: { id: s.id },
          group: "students" as const,
          instituteId,
        };
      })
    : [];

  const teacherItems: AdminSearchItem[] = canSeeTeachers
    ? teachers.map((t) => {
        const name = t.displayName?.trim() || "Teacher";
        const dept = t.department || "";
        const emp = t.employeeId || "";
        return {
          id: `teacher-${t.id}`,
          label: name,
          hint: `${dept}${emp ? ` · ${emp}` : ""}`,
          value: `${name} ${dept} ${emp} ${t.email ?? ""} teacher faculty ${instituteId}`,
          to: "/teachers",
          group: "teachers" as const,
          instituteId,
        };
      })
    : [];

  return [...studentItems, ...teacherItems].filter(
    (item) => item.instituteId === instituteId,
  );
}

/** @deprecated Demo teacher catalog removed; product search uses API. */
export const SEARCH_TEACHERS = [] as const;
