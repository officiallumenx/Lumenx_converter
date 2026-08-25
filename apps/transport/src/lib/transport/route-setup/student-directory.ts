import { CANONICAL_TRANSPORT_STUDENTS } from "@lumenx/utils";
import type { StudentDirectoryEntry } from "./types";

/**
 * Student directory for Driver route setup — same STU-* IDs as Admin / Connect ops bridge.
 */
export const ROUTE_SETUP_STUDENT_DIRECTORY: StudentDirectoryEntry[] =
  CANONICAL_TRANSPORT_STUDENTS.map((s) => ({
    id: s.id,
    name: s.name,
    className: s.className,
    section: s.section,
    rollNo: s.id.replace("STU-", ""),
  }));

export function listClasses(directory = ROUTE_SETUP_STUDENT_DIRECTORY): string[] {
  return [...new Set(directory.map((s) => s.className))].sort((a, b) => Number(a) - Number(b));
}

export function listSections(
  className: string,
  directory = ROUTE_SETUP_STUDENT_DIRECTORY,
): string[] {
  return [
    ...new Set(directory.filter((s) => s.className === className).map((s) => s.section)),
  ].sort();
}

export function listStudents(
  className: string,
  section: string,
  directory = ROUTE_SETUP_STUDENT_DIRECTORY,
): StudentDirectoryEntry[] {
  return directory
    .filter((s) => s.className === className && s.section === section)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function studentsByIds(
  ids: string[],
  directory = ROUTE_SETUP_STUDENT_DIRECTORY,
): StudentDirectoryEntry[] {
  const set = new Set(ids);
  return directory.filter((s) => set.has(s.id));
}
