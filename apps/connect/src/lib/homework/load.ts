import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/institute-id";
import { listStudents } from "@/lib/students/api";
import type { StudentDto } from "@/lib/students/types";
import type { StudentAssignment } from "@/lib/mock-data";
import type { StudentAssignmentDetail } from "@/lib/assignment-details";
import {
  getAssetSignedUrl,
  getStudentHomeworkItems,
  getTeacherHomeworkSheet,
  listHomework,
} from "./api";
import { learnerItemToDetail, learnerItemToStudentAssignment } from "./map";
import type { HomeworkDto, LearnerHomeworkItemDto, TeacherHomeworkSheetDto } from "./types";
import type { AssignmentSubmission } from "@/lib/teacher/types";
import { submissionDtoToConnectRow } from "./map";

export type HomeworkLoadStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

function mapError(err: unknown, label: string): { status: HomeworkLoadStatus; message: string } {
  const status =
    err instanceof ApiClientError
      ? err.status
      : err &&
          typeof err === "object" &&
          "status" in err &&
          typeof (err as { status: unknown }).status === "number"
        ? (err as { status: number }).status
        : null;
  const message = err instanceof Error ? err.message : `Failed to load ${label}`;
  if (status === 403) return { status: "forbidden", message };
  return { status: "error", message };
}

export async function loadParentHomeworkItems(input: {
  instituteId: string | null;
}): Promise<{
  status: HomeworkLoadStatus;
  students: StudentDto[];
  itemsByStudentId: Map<string, LearnerHomeworkItemDto[]>;
  errorMessage: string | null;
}> {
  if (!isApiAuthMode()) {
    return { status: "demo", students: [], itemsByStudentId: new Map(), errorMessage: null };
  }
  if (!input.instituteId || !isInstituteUuid(input.instituteId)) {
    return { status: "needs_institute", students: [], itemsByStudentId: new Map(), errorMessage: null };
  }

  try {
    const students = await listStudents({ instituteId: input.instituteId });
    const groups = await Promise.all(
      students.map((student) =>
        getStudentHomeworkItems({ instituteId: input.instituteId!, studentId: student.id }),
      ),
    );
    const itemsByStudentId = new Map<string, LearnerHomeworkItemDto[]>();
    students.forEach((student, index) => {
      itemsByStudentId.set(student.id, groups[index] ?? []);
    });
    const hasItems = [...itemsByStudentId.values()].some((items) => items.length > 0);
    return {
      status: students.length === 0 || !hasItems ? "empty" : "ready",
      students,
      itemsByStudentId,
      errorMessage: null,
    };
  } catch (err) {
    const mapped = mapError(err, "homework");
    return { status: mapped.status, students: [], itemsByStudentId: new Map(), errorMessage: mapped.message };
  }
}

export async function loadStudentHomeworkItems(input: {
  instituteId: string | null;
  studentId: string | null;
  classLabel?: string;
}): Promise<{
  status: HomeworkLoadStatus;
  assignments: StudentAssignment[];
  details: StudentAssignmentDetail[];
  errorMessage: string | null;
}> {
  if (!isApiAuthMode()) {
    return { status: "demo", assignments: [], details: [], errorMessage: null };
  }
  if (
    !input.instituteId ||
    !isInstituteUuid(input.instituteId) ||
    !input.studentId ||
    !isInstituteUuid(input.studentId)
  ) {
    return { status: "needs_institute", assignments: [], details: [], errorMessage: null };
  }

  try {
    const items = await getStudentHomeworkItems({
      instituteId: input.instituteId,
      studentId: input.studentId,
    });
    const classLabel = input.classLabel ?? "Class";
    const assignments = items.map((item) => learnerItemToStudentAssignment(item, classLabel));
    const details = items.map((item) => learnerItemToDetail(item, classLabel));
    return {
      status: items.length === 0 ? "empty" : "ready",
      assignments,
      details,
      errorMessage: null,
    };
  } catch (err) {
    const mapped = mapError(err, "homework");
    return { status: mapped.status, assignments: [], details: [], errorMessage: mapped.message };
  }
}

export async function loadTeacherHomeworkList(input: {
  instituteId: string | null;
  teacherId: string | null;
}): Promise<{
  status: HomeworkLoadStatus;
  items: HomeworkDto[];
  errorMessage: string | null;
}> {
  if (!isApiAuthMode()) {
    return { status: "demo", items: [], errorMessage: null };
  }
  if (!input.instituteId || !isInstituteUuid(input.instituteId) || !input.teacherId) {
    return { status: "needs_institute", items: [], errorMessage: null };
  }

  try {
    const items = await listHomework({
      instituteId: input.instituteId,
      teacherId: input.teacherId,
    });
    return {
      status: items.length === 0 ? "empty" : "ready",
      items,
      errorMessage: null,
    };
  } catch (err) {
    const mapped = mapError(err, "homework list");
    return { status: mapped.status, items: [], errorMessage: mapped.message };
  }
}

export async function loadTeacherHomeworkSheet(input: {
  instituteId: string | null;
  homeworkId: string | null;
}): Promise<{
  status: HomeworkLoadStatus;
  sheet: TeacherHomeworkSheetDto | null;
  rows: AssignmentSubmission[];
  errorMessage: string | null;
}> {
  if (!isApiAuthMode()) {
    return { status: "demo", sheet: null, rows: [], errorMessage: null };
  }
  if (
    !input.instituteId ||
    !isInstituteUuid(input.instituteId) ||
    !input.homeworkId ||
    !isInstituteUuid(input.homeworkId)
  ) {
    return { status: "needs_institute", sheet: null, rows: [], errorMessage: null };
  }

  try {
    const sheet = await getTeacherHomeworkSheet({
      instituteId: input.instituteId,
      homeworkId: input.homeworkId,
    });
    return {
      status: "ready",
      sheet,
      rows: sheet.rows.map(submissionDtoToConnectRow),
      errorMessage: null,
    };
  } catch (err) {
    const mapped = mapError(err, "homework sheet");
    return { status: mapped.status, sheet: null, rows: [], errorMessage: mapped.message };
  }
}

export async function resolveAttachmentDownloadUrl(assetId: string): Promise<string | null> {
  if (!isApiAuthMode() || !isInstituteUuid(assetId)) return null;
  try {
    const result = await getAssetSignedUrl(assetId);
    return result.signedUrl;
  } catch {
    return null;
  }
}
