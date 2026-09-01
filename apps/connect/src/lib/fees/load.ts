import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/institute-id";
import { listStudents } from "@/lib/students/api";
import type { StudentDto } from "@/lib/students/types";
import type { TeacherFeeRecord } from "@/lib/teacher/repositories";
import type { StudentFeeAccount } from "@lumenx/module-fees";
import { getStudentFeePortal, listSectionFeeRoster } from "./api";
import { portalDtoToStudentFeeAccount, rosterRowsToTeacherFeeRecords } from "./map";

export type FeesLoadStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

function mapError(err: unknown, label: string): { status: FeesLoadStatus; message: string } {
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

export async function loadParentFeesPortals(input: {
  instituteId: string | null;
}): Promise<{
  status: FeesLoadStatus;
  students: StudentDto[];
  accountsByStudentId: Map<string, StudentFeeAccount>;
  errorMessage: string | null;
}> {
  if (!isApiAuthMode()) {
    return {
      status: "demo",
      students: [],
      accountsByStudentId: new Map(),
      errorMessage: null,
    };
  }
  if (!input.instituteId || !isInstituteUuid(input.instituteId)) {
    return {
      status: "needs_institute",
      students: [],
      accountsByStudentId: new Map(),
      errorMessage: null,
    };
  }

  try {
    const students = await listStudents({ instituteId: input.instituteId });
    const portals = await Promise.all(
      students.map((student) =>
        getStudentFeePortal({
          instituteId: input.instituteId!,
          studentId: student.id,
        }),
      ),
    );
    const accountsByStudentId = new Map<string, StudentFeeAccount>();
    for (const portal of portals) {
      accountsByStudentId.set(portal.studentId, portalDtoToStudentFeeAccount(portal));
    }
    const hasData = [...accountsByStudentId.values()].some(
      (a) => a.billed > 0 || a.paid > 0 || a.payments.length > 0,
    );
    return {
      status: students.length === 0 || !hasData ? "empty" : "ready",
      students,
      accountsByStudentId,
      errorMessage: null,
    };
  } catch (err) {
    const mapped = mapError(err, "fees");
    return {
      status: mapped.status,
      students: [],
      accountsByStudentId: new Map(),
      errorMessage: mapped.message,
    };
  }
}

export async function loadStudentFeePortal(input: {
  instituteId: string | null;
  studentId: string | null;
}): Promise<{
  status: FeesLoadStatus;
  account: StudentFeeAccount | null;
  studentName: string | null;
  classLabel: string | null;
  errorMessage: string | null;
}> {
  if (!isApiAuthMode()) {
    return {
      status: "demo",
      account: null,
      studentName: null,
      classLabel: null,
      errorMessage: null,
    };
  }
  if (
    !input.instituteId ||
    !isInstituteUuid(input.instituteId) ||
    !input.studentId ||
    !isInstituteUuid(input.studentId)
  ) {
    return {
      status: "needs_institute",
      account: null,
      studentName: null,
      classLabel: null,
      errorMessage: null,
    };
  }

  try {
    const portal = await getStudentFeePortal({
      instituteId: input.instituteId,
      studentId: input.studentId,
    });
    const account = portalDtoToStudentFeeAccount(portal);
    const classLabel =
      portal.className && portal.sectionName
        ? `${portal.className} ${portal.sectionName}`
        : portal.className;
    const hasData = account.billed > 0 || account.paid > 0 || account.payments.length > 0;
    return {
      status: hasData ? "ready" : "empty",
      account,
      studentName: portal.studentName,
      classLabel,
      errorMessage: null,
    };
  } catch (err) {
    const mapped = mapError(err, "fees");
    return {
      status: mapped.status,
      account: null,
      studentName: null,
      classLabel: null,
      errorMessage: mapped.message,
    };
  }
}

export async function loadTeacherFeeRoster(input: {
  instituteId: string | null;
  sectionIds: string[];
}): Promise<{
  status: FeesLoadStatus;
  records: TeacherFeeRecord[];
  errorMessage: string | null;
}> {
  if (!isApiAuthMode()) {
    return { status: "demo", records: [], errorMessage: null };
  }
  if (!input.instituteId || !isInstituteUuid(input.instituteId)) {
    return { status: "needs_institute", records: [], errorMessage: null };
  }
  if (input.sectionIds.length === 0) {
    return { status: "empty", records: [], errorMessage: null };
  }

  try {
    const groups = await Promise.all(
      input.sectionIds.map((sectionId) =>
        listSectionFeeRoster({
          instituteId: input.instituteId!,
          sectionId,
        }),
      ),
    );
    const records = rosterRowsToTeacherFeeRecords(groups.flat());
    return {
      status: records.length === 0 ? "empty" : "ready",
      records,
      errorMessage: null,
    };
  } catch (err) {
    const mapped = mapError(err, "class fees");
    return { status: mapped.status, records: [], errorMessage: mapped.message };
  }
}
