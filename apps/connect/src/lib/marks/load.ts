import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/institute-id";
import { listStudents } from "@/lib/students/api";
import type { StudentDto } from "@/lib/students/types";
import type { ReportCard } from "@lumenx/types";
import { getStudentReportCards, getTeacherMarkSheet } from "./api";
import { reportCardDtosToReportCards, teacherSheetToConnectRows } from "./map";
import type { ConnectMarkRow, TeacherMarkSheetDto } from "./types";

export type MarksLoadStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

function mapError(err: unknown, label: string): { status: MarksLoadStatus; message: string } {
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

export async function loadParentReportCards(input: {
  instituteId: string | null;
}): Promise<{
  status: MarksLoadStatus;
  students: StudentDto[];
  cardsByStudentId: Map<string, ReportCard[]>;
  errorMessage: string | null;
}> {
  if (!isApiAuthMode()) {
    return { status: "demo", students: [], cardsByStudentId: new Map(), errorMessage: null };
  }
  if (!input.instituteId || !isInstituteUuid(input.instituteId)) {
    return { status: "needs_institute", students: [], cardsByStudentId: new Map(), errorMessage: null };
  }

  try {
    const students = await listStudents({ instituteId: input.instituteId });
    const groups = await Promise.all(
      students.map((student) =>
        getStudentReportCards({
          instituteId: input.instituteId!,
          studentId: student.id,
        }),
      ),
    );
    const cardsByStudentId = new Map<string, ReportCard[]>();
    students.forEach((student, index) => {
      cardsByStudentId.set(student.id, reportCardDtosToReportCards(groups[index] ?? []));
    });
    const hasCards = [...cardsByStudentId.values()].some((cards) => cards.length > 0);
    return {
      status: students.length === 0 || !hasCards ? "empty" : "ready",
      students,
      cardsByStudentId,
      errorMessage: null,
    };
  } catch (err) {
    const mapped = mapError(err, "report cards");
    return { status: mapped.status, students: [], cardsByStudentId: new Map(), errorMessage: mapped.message };
  }
}

export async function loadStudentReportCards(input: {
  instituteId: string | null;
  studentId: string | null;
}): Promise<{
  status: MarksLoadStatus;
  reportCards: ReportCard[];
  errorMessage: string | null;
}> {
  if (!isApiAuthMode()) {
    return { status: "demo", reportCards: [], errorMessage: null };
  }
  if (
    !input.instituteId ||
    !isInstituteUuid(input.instituteId) ||
    !input.studentId ||
    !isInstituteUuid(input.studentId)
  ) {
    return { status: "needs_institute", reportCards: [], errorMessage: null };
  }

  try {
    const dtos = await getStudentReportCards({
      instituteId: input.instituteId,
      studentId: input.studentId,
    });
    const reportCards = reportCardDtosToReportCards(dtos);
    return {
      status: reportCards.length === 0 ? "empty" : "ready",
      reportCards,
      errorMessage: null,
    };
  } catch (err) {
    const mapped = mapError(err, "report cards");
    return { status: mapped.status, reportCards: [], errorMessage: mapped.message };
  }
}

export async function loadTeacherMarkSheet(input: {
  instituteId: string | null;
  sectionId: string | null;
  examId: string | null;
  subjectId: string | null;
}): Promise<{
  status: MarksLoadStatus;
  sheet: TeacherMarkSheetDto | null;
  rows: ConnectMarkRow[];
  errorMessage: string | null;
}> {
  if (!isApiAuthMode()) {
    return { status: "demo", sheet: null, rows: [], errorMessage: null };
  }
  if (
    !input.instituteId ||
    !isInstituteUuid(input.instituteId) ||
    !input.sectionId ||
    !input.examId ||
    !input.subjectId
  ) {
    return { status: "needs_institute", sheet: null, rows: [], errorMessage: null };
  }

  try {
    const sheet = await getTeacherMarkSheet({
      instituteId: input.instituteId,
      sectionId: input.sectionId,
      examId: input.examId,
      subjectId: input.subjectId,
    });
    return {
      status: "ready",
      sheet,
      rows: teacherSheetToConnectRows(sheet),
      errorMessage: null,
    };
  } catch (err) {
    const mapped = mapError(err, "mark sheet");
    return { status: mapped.status, sheet: null, rows: [], errorMessage: mapped.message };
  }
}
