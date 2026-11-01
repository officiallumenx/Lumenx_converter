/**
 * Shared student multi-select helpers for Documents and Certificates generation.
 */

export type SelectableStudent = {
  id: string;
  displayName: string;
  classLabel: string | null;
  sectionLabel: string | null;
  admissionNumber: string | null;
  rollNo?: string | null;
  academicYearId?: string | null;
};

export type StudentSelectionFilters = {
  academicYearId?: string;
  classLabel?: string;
  sectionLabel?: string;
  query?: string;
};

export function filterSelectableStudents<T extends SelectableStudent>(
  students: T[],
  filters: StudentSelectionFilters,
): T[] {
  const year = filters.academicYearId?.trim() || "";
  const cls = filters.classLabel?.trim().toLowerCase() || "";
  const section = filters.sectionLabel?.trim().toLowerCase() || "";
  const q = filters.query?.trim().toLowerCase() || "";

  return students.filter((s) => {
    if (year && (s.academicYearId ?? "") !== year) return false;
    if (cls && (s.classLabel ?? "").trim().toLowerCase() !== cls) return false;
    if (section && (s.sectionLabel ?? "").trim().toLowerCase() !== section) {
      return false;
    }
    if (!q) return true;
    const hay = [
      s.displayName,
      s.admissionNumber,
      s.rollNo,
      s.classLabel,
      s.sectionLabel,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function uniqueClassLabels(students: SelectableStudent[]): string[] {
  const set = new Set<string>();
  for (const s of students) {
    const label = s.classLabel?.trim();
    if (label) set.add(label);
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function uniqueSectionLabels(
  students: SelectableStudent[],
  classLabel?: string,
): string[] {
  const cls = classLabel?.trim().toLowerCase() || "";
  const set = new Set<string>();
  for (const s of students) {
    if (cls && (s.classLabel ?? "").trim().toLowerCase() !== cls) continue;
    const label = s.sectionLabel?.trim();
    if (label) set.add(label);
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/** Toggle one student id in a selection set. */
export function toggleStudentId(
  selectedIds: ReadonlySet<string>,
  studentId: string,
): Set<string> {
  const next = new Set(selectedIds);
  if (next.has(studentId)) next.delete(studentId);
  else next.add(studentId);
  return next;
}

/** Select all students in the visible/filtered scope. */
export function selectAllInScope(
  selectedIds: ReadonlySet<string>,
  scopeIds: readonly string[],
): Set<string> {
  const next = new Set(selectedIds);
  for (const id of scopeIds) next.add(id);
  return next;
}

/** Clear only students that are in the current scope (keeps other classes). */
export function clearSelectionInScope(
  selectedIds: ReadonlySet<string>,
  scopeIds: readonly string[],
): Set<string> {
  const scope = new Set(scopeIds);
  const next = new Set<string>();
  for (const id of selectedIds) {
    if (!scope.has(id)) next.add(id);
  }
  return next;
}

export function selectEntireClass(
  selectedIds: ReadonlySet<string>,
  students: SelectableStudent[],
  classLabel: string,
  sectionLabel?: string,
): Set<string> {
  const filtered = filterSelectableStudents(students, {
    classLabel,
    sectionLabel,
  });
  return selectAllInScope(
    selectedIds,
    filtered.map((s) => s.id),
  );
}
