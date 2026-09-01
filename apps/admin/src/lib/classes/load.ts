/**
 * Dual-mode classes directory list loader.
 * Demo: never calls API (caller keeps demo seed/store).
 * API: requires validated institute UUID; no demo fallback on failure.
 */
import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { listEnrollments } from "@/lib/enrollments/api";
import { listSubjects } from "@/lib/subjects/api";
import { listTeachers } from "@/lib/teachers/api";
import { listTeacherAssignments } from "@/lib/timetable/api";
import { listClassesCatalog, getClass, getSection } from "./api";
import { buildSectionEnrichment } from "./enrich";
import { sectionsToListItems, sectionDtoToDetailItem } from "./map";
import type { ClassListItem, SectionDetailItem } from "./types";

export type ClassesListStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

export type ClassesListState = {
  status: ClassesListStatus;
  items: ClassListItem[];
  errorMessage: string | null;
};

export type SectionDetailState = {
  status: ClassesListStatus;
  section: SectionDetailItem | null;
  errorMessage: string | null;
};

export async function loadSectionDetail(
  sectionId: string,
  activeInstituteId?: string | null,
): Promise<SectionDetailState> {
  if (!isApiAuthMode()) {
    return { status: "demo", section: null, errorMessage: null };
  }

  if (!sectionId?.trim()) {
    return { status: "error", section: null, errorMessage: "Section id is required." };
  }

  if (!isInstituteUuid(sectionId.trim())) {
    return {
      status: "error",
      section: null,
      errorMessage: "Section id must be a valid UUID.",
    };
  }

  try {
    const section = await getSection(sectionId.trim());
    if (
      activeInstituteId &&
      isInstituteUuid(activeInstituteId) &&
      section.instituteId !== activeInstituteId
    ) {
      return {
        status: "empty",
        section: null,
        errorMessage: "Section not found for the active institute.",
      };
    }
    const cls = await getClass(section.classId);
    const [enrollments, assignments, teachers, subjects] = await Promise.all([
      listEnrollments({
        instituteId: section.instituteId,
        sectionId: section.id,
        status: "active",
      }).catch(() => []),
      listTeacherAssignments({
        instituteId: section.instituteId,
        sectionId: section.id,
        status: "active",
      }).catch(() => []),
      listTeachers({ instituteId: section.instituteId }).catch(() => []),
      listSubjects({ instituteId: section.instituteId }).catch(() => []),
    ]);
    const enrich = buildSectionEnrichment(
      enrollments,
      assignments,
      new Map(teachers.map((t) => [t.id, t])),
      new Map(subjects.map((s) => [s.id, s])),
    );
    return {
      status: "ready",
      section: sectionDtoToDetailItem(section, cls, enrich),
      errorMessage: null,
    };
  } catch (err) {
    const status =
      err instanceof ApiClientError
        ? err.status
        : err &&
            typeof err === "object" &&
            "status" in err &&
            typeof (err as { status: unknown }).status === "number"
          ? (err as { status: number }).status
          : null;
    const message = err instanceof Error ? err.message : "Failed to load section";

    if (status === 403) {
      return { status: "forbidden", section: null, errorMessage: message };
    }
    if (status === 404) {
      return { status: "empty", section: null, errorMessage: "Section not found." };
    }
    return { status: "error", section: null, errorMessage: message };
  }
}

export async function loadClassesList(
  activeInstituteId: string | null,
): Promise<ClassesListState> {
  if (!isApiAuthMode()) {
    return { status: "demo", items: [], errorMessage: null };
  }

  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return {
      status: "needs_institute",
      items: [],
      errorMessage: null,
    };
  }

  try {
    const instituteId = activeInstituteId;
    const [catalog, enrollments, assignments, teachers, subjects] = await Promise.all([
      listClassesCatalog({ instituteId }),
      listEnrollments({ instituteId, status: "active" }).catch(() => []),
      listTeacherAssignments({ instituteId, status: "active" }).catch(() => []),
      listTeachers({ instituteId }).catch(() => []),
      listSubjects({ instituteId }).catch(() => []),
    ]);
    const enrich = buildSectionEnrichment(
      enrollments,
      assignments,
      new Map(teachers.map((t) => [t.id, t])),
      new Map(subjects.map((s) => [s.id, s])),
    );
    const items = sectionsToListItems(catalog.sections, catalog.classes, enrich);
    return {
      status: items.length === 0 ? "empty" : "ready",
      items,
      errorMessage: null,
    };
  } catch (err) {
    const status =
      err instanceof ApiClientError
        ? err.status
        : err &&
            typeof err === "object" &&
            "status" in err &&
            typeof (err as { status: unknown }).status === "number"
          ? (err as { status: number }).status
          : null;
    const message =
      err instanceof Error ? err.message : "Failed to load classes";

    if (status === 403) {
      return {
        status: "forbidden",
        items: [],
        errorMessage: message,
      };
    }
    return {
      status: "error",
      items: [],
      errorMessage: message,
    };
  }
}
