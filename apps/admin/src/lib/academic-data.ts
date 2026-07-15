import {
  getDemoProfile,
  readDemoProfileId,
  type DemoAcademicConfig,
  type DemoClassGroup,
  type DemoDepartment,
} from "@lumenx/types";
import type { AdminStudentRecord } from "@lumenx/module-students";
import { MOCK_ADMIN_STUDENTS } from "@lumenx/module-students";

export type InstituteClass = {
  id: string;
  grade: string;
  section: string;
  departmentId?: string;
  departmentCode?: string;
};

export function getAcademicConfig(): DemoAcademicConfig {
  return getDemoProfile().academic;
}

export function isCollegeMode(): boolean {
  return getAcademicConfig().mode === "college";
}

export function getAcademicLevels() {
  return getAcademicConfig().levels;
}

export function getLevelLabels(): string[] {
  return getAcademicConfig().levels.map((l) => l.label);
}

export function getLevelShortLabels(): string[] {
  return getAcademicConfig().levels.map((l) => l.shortLabel);
}

export function getAcademicSections(): string[] {
  return getAcademicConfig().sections;
}

export function getDepartments(): DemoDepartment[] {
  return getAcademicConfig().departments;
}

/** @deprecated Use getDepartments() */
export function getDegreeCourses(): DemoDepartment[] {
  return getDepartments();
}

export function getClassGroups(): DemoClassGroup[] {
  return getAcademicConfig().classGroups;
}

export function getLevelLabelById(levelId: string): string {
  return getAcademicConfig().levels.find((l) => l.id === levelId)?.label ?? levelId;
}

export function getDepartmentById(departmentId: string): DemoDepartment | undefined {
  return getAcademicConfig().departments.find((d) => d.id === departmentId);
}

export function getDepartmentCode(departmentId: string): string {
  return getDepartmentById(departmentId)?.code ?? departmentId.toUpperCase();
}

/** Timetable / institute class grade key — unique per dept + year */
export function collegeTimetableGrade(departmentId: string, levelId: string): string {
  const code = getDepartmentCode(departmentId);
  const level = getLevelLabelById(levelId);
  return `${code} · ${level}`;
}

export function getInstituteClasses(): InstituteClass[] {
  const { classGroups } = getAcademicConfig();
  return classGroups.map((g) => {
    const deptId = g.departmentId ?? g.courseId;
    return {
      id: g.id,
      grade: deptId ? collegeTimetableGrade(deptId, g.levelId) : getLevelLabelById(g.levelId),
      section: g.section,
      departmentId: deptId,
      departmentCode: deptId ? getDepartmentCode(deptId) : undefined,
    };
  });
}

export function classGroupTimetableId(group: DemoClassGroup): string {
  const deptId = group.departmentId ?? group.courseId;
  const level = getAcademicConfig().levels.find((l) => l.id === group.levelId);
  const deptCode = deptId ? getDepartmentCode(deptId) : "";
  const prefix = deptCode ? `${deptCode}-${level?.shortLabel ?? group.levelId}` : level?.shortLabel ?? group.levelId;
  return `TT-${prefix}${group.section}`;
}

export const COLLEGE_MOCK_STUDENTS: AdminStudentRecord[] = [
  {
    id: "STU-2001",
    name: "Neha Desai",
    grade: "MPC-FY-A",
    attendance: 89,
    gpa: 3.6,
    status: "active",
    parent: "S. Desai",
  },
  {
    id: "STU-2002",
    name: "Arjun Mehta",
    grade: "MPC-FY-B",
    attendance: 76,
    gpa: 2.7,
    status: "watch",
    parent: "R. Mehta",
  },
  {
    id: "STU-2003",
    name: "Kavya Iyer",
    grade: "BIPC-FY-A",
    attendance: 94,
    gpa: 3.9,
    status: "active",
    parent: "L. Iyer",
  },
  {
    id: "STU-2004",
    name: "Rohan Kapoor",
    grade: "MPC-SY-A",
    attendance: 82,
    gpa: 3.2,
    status: "active",
    parent: "P. Kapoor",
  },
  {
    id: "STU-2005",
    name: "Ananya Pillai",
    grade: "CEC-FY-B",
    attendance: 91,
    gpa: 3.7,
    status: "active",
    parent: "V. Pillai",
  },
  {
    id: "STU-2006",
    name: "Dev Sharma",
    grade: "MEC-SY-C",
    attendance: 68,
    gpa: 2.3,
    status: "at-risk",
    parent: "M. Sharma",
  },
  {
    id: "STU-2007",
    name: "Isha Khan",
    grade: "BIPC-SY-B",
    attendance: 88,
    gpa: 3.4,
    status: "active",
    parent: "F. Khan",
  },
  {
    id: "STU-2008",
    name: "Vikram Singh",
    grade: "CEC-SY-A",
    attendance: 95,
    gpa: 3.85,
    status: "active",
    parent: "H. Singh",
  },
];

export function getMockStudentsForProfile(): AdminStudentRecord[] {
  if (readDemoProfileId() === "inter_college") {
    return COLLEGE_MOCK_STUDENTS.map((s) => ({ ...s }));
  }
  return MOCK_ADMIN_STUDENTS.map((s) => ({ ...s }));
}
