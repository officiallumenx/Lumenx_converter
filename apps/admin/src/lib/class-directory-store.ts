import { readAdminDataScopeKey } from "@/lib/admin-tenant";

import {
  collegeTimetableGrade,
  getClassGroups,
  getDepartmentById,
  getLevelLabelById,
} from "@/lib/academic-data";

export type ClassSection = {
  id: string;
  name: string;
  levelId: string;
  timetableGrade: string;
  section: string;
  departmentId?: string;
  departmentCode?: string;
  departmentName?: string;
  teacher: string;
  students: number;
  capacity: number;
  room: string;
  hasTimetable: boolean;
  /** Class-specific subject → teacher assignment. Empty string means intentionally unassigned. */
  subjectTeacherAssignments?: Record<string, string>;
};

const KEY_PREFIX = "lumenx.admin.classes.v2";

function storageKey(): string {
  return `${KEY_PREFIX}.${readAdminDataScopeKey()}`;
}

export function classGroupsToSections(): ClassSection[] {
  return getClassGroups().map((group) => {
    const departmentId = group.departmentId ?? group.courseId;
    const department = departmentId ? getDepartmentById(departmentId) : undefined;
    return {
      id: group.id,
      name: group.displayName,
      levelId: group.levelId,
      timetableGrade: departmentId
        ? collegeTimetableGrade(departmentId, group.levelId)
        : getLevelLabelById(group.levelId),
      section: group.section,
      departmentId,
      departmentCode: department?.code,
      departmentName: department?.name,
      teacher: group.teacher,
      students: group.students,
      capacity: group.capacity,
      room: group.room,
      hasTimetable: group.hasTimetable,
      subjectTeacherAssignments: {},
    };
  });
}

export function loadClassDirectory(): ClassSection[] {
  try {
    const raw = localStorage.getItem(storageKey());
    if (raw) {
      return (JSON.parse(raw) as ClassSection[]).map((record) => ({
        ...record,
        subjectTeacherAssignments: record.subjectTeacherAssignments ?? {},
      }));
    }
  } catch {
    // Fall back to configured class groups.
  }
  return classGroupsToSections();
}

export function saveClassDirectory(records: ClassSection[]): void {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(records));
  } catch {
    // Keep the in-memory page usable when storage is unavailable.
  }
}

export function findClassSection(id: string): ClassSection | null {
  return loadClassDirectory().find((record) => record.id === id) ?? null;
}
