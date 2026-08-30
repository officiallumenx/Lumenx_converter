/**
 * Dual-mode marks entries list loader.
 * Demo: never calls API.
 * API: real entries + label lookups; no demo fallback on failure.
 */
import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { listClassesCatalog } from "@/lib/classes/api";
import { listExams } from "@/lib/exams/api";
import { listSubjects } from "@/lib/subjects/api";
import { listTeachers } from "@/lib/teachers/api";
import { teacherDtosToListItems } from "@/lib/teachers/map";
import { listMarkEntries } from "./api";
import { markEntryDtosToListItems } from "./map";
import type { MarkEntryListItem, MarksLookupMaps } from "./types";

export type MarksListStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

export type MarksListState = {
  status: MarksListStatus;
  items: MarkEntryListItem[];
  errorMessage: string | null;
};

export async function loadMarksList(
  activeInstituteId: string | null,
): Promise<MarksListState> {
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
    const [rows, exams, subjects, teacherDtos, catalog] = await Promise.all([
      listMarkEntries({ instituteId: activeInstituteId }),
      listExams({ instituteId: activeInstituteId }),
      listSubjects({ instituteId: activeInstituteId }),
      listTeachers({ instituteId: activeInstituteId }),
      listClassesCatalog({ instituteId: activeInstituteId }),
    ]);

    const teachers = teacherDtosToListItems(teacherDtos);
    const lookups: MarksLookupMaps = {
      examsById: new Map(exams.map((exam) => [exam.id, exam])),
      subjectsById: new Map(subjects.map((subject) => [subject.id, subject])),
      teachersById: new Map(teachers.map((teacher) => [teacher.id, teacher])),
      classesById: new Map(catalog.classes.map((cls) => [cls.id, cls])),
      sectionsById: new Map(
        catalog.sections.map((section) => [section.id, section]),
      ),
    };

    const items = markEntryDtosToListItems(rows, lookups);
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
      err instanceof Error ? err.message : "Failed to load marks entries";

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
