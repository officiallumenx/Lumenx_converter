import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/institute-id";
import {
  listClasses,
  listEnrollments,
  listSections,
  type ClassDto,
  type EnrollmentDto,
  type SectionDto,
} from "@/lib/teacher-classes/api";

export type EnrollmentHistoryRow = {
  id: string;
  yearLabel: string;
  classLabel: string;
  sectionLabel: string;
  rollNo: string;
  status: EnrollmentDto["status"];
  enrolledOn: string;
  withdrawnOn: string | null;
};

export type EnrollmentHistoryLoad =
  | { status: "demo" | "needs_institute" | "empty"; rows: [] }
  | { status: "ready"; rows: EnrollmentHistoryRow[] }
  | { status: "forbidden" | "error"; rows: []; message: string };

function yearLabel(academicYearId: string, classes: ClassDto[]): string {
  const match = classes.find((c) => c.academicYearId === academicYearId);
  return match?.academicYearId ? academicYearId.slice(0, 8) : academicYearId.slice(0, 8);
}

export async function loadStudentEnrollmentHistory(input: {
  instituteId: string | null;
  studentId: string | null;
}): Promise<EnrollmentHistoryLoad> {
  if (!isApiAuthMode()) {
    return { status: "demo", rows: [] };
  }
  if (
    !input.instituteId ||
    !isInstituteUuid(input.instituteId) ||
    !input.studentId ||
    !isInstituteUuid(input.studentId)
  ) {
    return { status: "needs_institute", rows: [] };
  }

  try {
    const [enrollments, classes, sections] = await Promise.all([
      listEnrollments({
        instituteId: input.instituteId,
        studentId: input.studentId,
      }),
      listClasses(input.instituteId).catch(() => [] as ClassDto[]),
      listSections(input.instituteId).catch(() => [] as SectionDto[]),
    ]);

    if (enrollments.length === 0) {
      return { status: "empty", rows: [] };
    }

    const classById = new Map(classes.map((c) => [c.id, c]));
    const sectionById = new Map(sections.map((s) => [s.id, s]));

    const rows: EnrollmentHistoryRow[] = enrollments
      .slice()
      .sort((a, b) => b.enrolledOn.localeCompare(a.enrolledOn))
      .map((row) => {
        const cls = classById.get(row.classId);
        const section = sectionById.get(row.sectionId);
        return {
          id: row.id,
          yearLabel: cls?.name
            ? `${cls.name} · ${yearLabel(row.academicYearId, classes)}`
            : yearLabel(row.academicYearId, classes),
          classLabel: cls?.name?.trim() || cls?.code?.trim() || "Class",
          sectionLabel: section?.name?.trim() || section?.code?.trim() || "—",
          rollNo: row.rollNo,
          status: row.status,
          enrolledOn: row.enrolledOn,
          withdrawnOn: row.withdrawnOn,
        };
      });

    return { status: "ready", rows };
  } catch (err) {
    const status =
      err instanceof ApiClientError && err.status === 403 ? "forbidden" : "error";
    return {
      status,
      rows: [],
      message: err instanceof Error ? err.message : "Failed to load enrollment history",
    };
  }
}
