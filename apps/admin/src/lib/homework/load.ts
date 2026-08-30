import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { listClassesCatalog } from "@/lib/classes/api";
import type { ClassDto, SectionDto } from "@/lib/classes/types";
import { listSubjects } from "@/lib/subjects/api";
import { subjectDtosToListItems } from "@/lib/subjects/map";
import type { SubjectListItem } from "@/lib/subjects/types";
import { listTeachers } from "@/lib/teachers/api";
import { teacherDtosToListItems } from "@/lib/teachers/map";
import type { TeacherListItem } from "@/lib/teachers/types";
import { getHomework, listHomework } from "./api";
import { homeworkDtoToListItem, homeworkDtosToListItems } from "./map";
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

export type HomeworkDetailState = {
  status: HomeworkListStatus;
  item: HomeworkListItem | null;
  errorMessage: string | null;
};

async function mapApiError(
  err: unknown,
  fallback: string,
): Promise<{ status: HomeworkListStatus; errorMessage: string }> {
  const status =
    err instanceof ApiClientError
      ? err.status
      : err &&
          typeof err === "object" &&
          "status" in err &&
          typeof (err as { status: unknown }).status === "number"
        ? (err as { status: number }).status
        : null;
  const message = err instanceof Error ? err.message : fallback;
  if (status === 403) {
    return { status: "forbidden", errorMessage: message };
  }
  return { status: "error", errorMessage: message };
}

async function loadLabelMaps(instituteId: string): Promise<{
  teachersById: Map<string, TeacherListItem>;
  sectionsById: Map<string, SectionDto>;
  classesById: Map<string, ClassDto>;
  subjectsById: Map<string, SubjectListItem>;
}> {
  const [catalog, teachers, subjects] = await Promise.all([
    listClassesCatalog({ instituteId }),
    teacherDtosToListItems(await listTeachers({ instituteId })),
    subjectDtosToListItems(await listSubjects({ instituteId })),
  ]);
  return {
    teachersById: new Map(teachers.map((teacher) => [teacher.id, teacher])),
    sectionsById: new Map(catalog.sections.map((section) => [section.id, section])),
    classesById: new Map(catalog.classes.map((cls) => [cls.id, cls])),
    subjectsById: new Map(subjects.map((subject) => [subject.id, subject])),
  };
}

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
    const [rows, labels] = await Promise.all([
      listHomework({ instituteId: activeInstituteId }),
      loadLabelMaps(activeInstituteId),
    ]);
    const items = homeworkDtosToListItems(
      rows,
      labels.teachersById,
      labels.sectionsById,
      labels.classesById,
      labels.subjectsById,
    );
    return {
      status: items.length === 0 ? "empty" : "ready",
      items,
      errorMessage: null,
    };
  } catch (err) {
    const mapped = await mapApiError(err, "Failed to load homework");
    return { status: mapped.status, items: [], errorMessage: mapped.errorMessage };
  }
}

export async function loadHomeworkDetail(
  activeInstituteId: string | null,
  homeworkId: string,
): Promise<HomeworkDetailState> {
  if (!isApiAuthMode()) {
    return { status: "demo", item: null, errorMessage: null };
  }

  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return { status: "needs_institute", item: null, errorMessage: null };
  }

  if (!isInstituteUuid(homeworkId)) {
    return {
      status: "error",
      item: null,
      errorMessage: "homework_id must be a valid UUID",
    };
  }

  try {
    const [dto, labels] = await Promise.all([
      getHomework(homeworkId),
      loadLabelMaps(activeInstituteId),
    ]);
    if (dto.instituteId !== activeInstituteId) {
      return {
        status: "forbidden",
        item: null,
        errorMessage: "Homework does not belong to the active institute",
      };
    }
    return {
      status: "ready",
      item: homeworkDtoToListItem(
        dto,
        labels.teachersById,
        labels.sectionsById,
        labels.classesById,
        labels.subjectsById,
      ),
      errorMessage: null,
    };
  } catch (err) {
    const mapped = await mapApiError(err, "Failed to load homework detail");
    return { status: mapped.status, item: null, errorMessage: mapped.errorMessage };
  }
}
