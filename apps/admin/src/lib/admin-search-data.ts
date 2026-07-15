import { adminNav } from "./admin-nav";
import { getMockStudentsForProfile } from "./academic-data";

export type AdminSearchItem = {
  id: string;
  label: string;
  hint?: string;
  value: string;
  to: string;
  params?: Record<string, string>;
  group: "pages" | "students" | "teachers";
};

/** Demo teachers indexed for global search (subset of teachers module data). */
const SEARCH_TEACHERS = [
  { id: "T-001", name: "Sarah Jenkins", dept: "Mathematics", email: "s.jenkins@institute.edu", employeeId: "EMP-1041" },
  { id: "T-002", name: "David Koal", dept: "Physics", email: "d.koal@institute.edu", employeeId: "EMP-1042" },
  { id: "T-003", name: "Priya Iyer", dept: "Biology", email: "p.iyer@institute.edu", employeeId: "EMP-1043" },
  { id: "T-004", name: "Marcus Whitfield", dept: "English", email: "m.whitfield@institute.edu", employeeId: "EMP-1044" },
  { id: "T-005", name: "Hana Suzuki", dept: "Chemistry", email: "h.suzuki@institute.edu", employeeId: "EMP-1045" },
  { id: "T-006", name: "Omar Faris", dept: "History", email: "o.faris@institute.edu", employeeId: "EMP-1046" },
] as const;

export function buildAdminSearchIndex(): AdminSearchItem[] {
  const pages: AdminSearchItem[] = adminNav.flatMap((group) =>
    group.items.map((item) => ({
      id: `page-${item.to}`,
      label: item.label,
      hint: group.label,
      value: `${item.label} ${group.label} page navigation`,
      to: item.to,
      group: "pages" as const,
    })),
  );

  const students: AdminSearchItem[] = getMockStudentsForProfile().map((s) => ({
    id: `student-${s.id}`,
    label: s.name,
    hint: `${s.grade} · ${s.id}`,
    value: `${s.name} ${s.grade} ${s.id} ${s.parent ?? ""} student`,
    to: "/students/$id",
    params: { id: s.id },
    group: "students" as const,
  }));

  const teachers: AdminSearchItem[] = SEARCH_TEACHERS.map((t) => ({
    id: `teacher-${t.id}`,
    label: t.name,
    hint: `${t.dept} · ${t.employeeId}`,
    value: `${t.name} ${t.dept} ${t.email} ${t.employeeId} teacher faculty`,
    to: "/teachers",
    group: "teachers" as const,
  }));

  return [...pages, ...students, ...teachers];
}
