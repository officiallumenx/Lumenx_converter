import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { listClassesCatalog } from "@/lib/classes/api";
import { listSubjects } from "@/lib/subjects/api";
import { subjectDtosToListItems } from "@/lib/subjects/map";
import type { SubjectListItem } from "@/lib/subjects/types";
import { listTeachers } from "@/lib/teachers/api";
import { teacherDtosToListItems } from "@/lib/teachers/map";
import type { TeacherListItem } from "@/lib/teachers/types";
import { listHomework } from "./api";
import { homeworkDtosToListItems } from "./map";
import type { HomeworkListItem } from "./types";

export type HomeworkListStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

export type HomeworkListState = {
  status: HomeworkListStatus;
  items: HomeworkListItem[];
  errorMessage: string | null;
};

export async function loadHomeworkList(
  activeInstituteId: string | null,
): Promise<HomeworkListState> {
  if (!isApiAuthMode()) {
    return { status: "demo", items: [], errorMessage: null };
  }

  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return { status: "needs_institute", items: [], errorMessage: null };
  }

  try {
    const [rows, catalog, teachers, subjects] = await Promise.all([
      listHomework({ instituteId: activeInstituteId }),
      listClassesCatalog({ instituteId: activeInstituteId }),
      teacherDtosToListItems(await listTeachers({ instituteId: activeInstituteId })),
      subjectDtosToListItems(await listSubjects({ instituteId: activeInstituteId })),
    ]);
    const teachersById = new Map<string, TeacherListItem>(
      teachers.map((teacher) => [teacher.id, teacher]),
    );
    const sectionsById = new Map(catalog.sections.map((section) => [section.id, section]));
    const classesById = new Map(catalog.classes.map((cls) => [cls.id, cls]));
    const subjectsById = new Map<string, SubjectListItem>(
      subjects.map((subject) => [subject.id, subject]),
    );
    const items = homeworkDtosToListItems(
      rows,
      teachersById,
      sectionsById,
      classesById,
      subjectsById,
    );
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
    const message = err instanceof Error ? err.message : "Failed to load homework";

    if (status === 403) {
      return { status: "forbidden", items: [], errorMessage: message };
    }
    return { status: "error", items: [], errorMessage: message };
  }
}
