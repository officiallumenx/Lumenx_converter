import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { listAcademicYears, type AcademicYearDto } from "@/lib/academic-years/api";
import { isInstituteUuid } from "@/lib/institute-id";
import {
  listClasses,
  listEnrollments,
  listSections,
  type EnrollmentDto,
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

function yearLabelFor(
  academicYearId: string,
  yearsById: Map<string, AcademicYearDto>,
): string {
  const year = yearsById.get(academicYearId);
  if (year?.name?.trim()) return year.name.trim();
  if (year?.code?.trim()) return year.code.trim();
  return academicYearId.slice(0, 8);
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
    const [enrollments, classes, sections, years] = await Promise.all([
      listEnrollments({
        instituteId: input.instituteId,
        studentId: input.studentId,
      }),
      listClasses(input.instituteId),
      listSections(input.instituteId),
      listAcademicYears(input.instituteId),
    ]);

    if (enrollments.length === 0) {
      return { status: "empty", rows: [] };
    }

    const classById = new Map(classes.map((c) => [c.id, c]));
    const sectionById = new Map(sections.map((s) => [s.id, s]));
    const yearsById = new Map(years.map((y) => [y.id, y]));

    const rows: EnrollmentHistoryRow[] = enrollments
      .slice()
      .sort((a, b) => b.enrolledOn.localeCompare(a.enrolledOn))
      .map((row) => {
        const cls = classById.get(row.classId);
        const section = sectionById.get(row.sectionId);
        const yearLabel = yearLabelFor(row.academicYearId, yearsById);
        return {
          id: row.id,
          yearLabel,
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
