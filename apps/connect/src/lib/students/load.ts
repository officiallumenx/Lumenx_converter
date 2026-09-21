import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { getConnectApiClient } from "@/lib/connect-api";
import type { MeResponse } from "@/lib/api/me-types";
import { isInstituteUuid } from "@/lib/institute-id";
import {
  listStudentRemarks,
  mapRemarkDtoToStudentRemark,
} from "@/lib/remarks";
import type { StudentDetail } from "@/lib/teacher/types";
import type { StudentSnapshot } from "@/lib/student/types";
import { getStudent, getStudentGuardians, listStudents } from "./api";
import {
  buildEmptyStudentSnapshot,
  studentDtoToProfile,
  studentDtoToTeacherDetail,
} from "./map";
import { enrichStudentDashboardSnapshot } from "@/lib/dashboard";
import { getPhotoSignedUrl } from "@/lib/photos/api";
import { getInstitute } from "@/lib/institute-profile/api";
import type { StudentDto, StudentGuardianDto } from "./types";

export type StudentsLoadStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

async function resolveStudentPhotoUrl(studentId: string): Promise<string | null> {
  try {
    const signed = await getPhotoSignedUrl("student", studentId);
    return signed.photoSignedUrl;
  } catch {
    return null;
  }
}

async function resolveInstituteDisplayName(instituteId: string): Promise<string> {
  try {
    const institute = await getInstitute(instituteId);
    return institute.name?.trim() || "Institute";
  } catch {
    return "Institute";
  }
}

function mapError(err: unknown, label: string): { status: StudentsLoadStatus; message: string } {
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
  if (status === 404) return { status: "empty", message };
  return { status: "error", message };
}

export async function loadTeacherStudentDetail(input: {
  instituteId: string | null;
  studentId: string | null;
}): Promise<{
  status: StudentsLoadStatus;
  detail: StudentDetail | null;
  errorMessage: string | null;
}> {
  if (!isApiAuthMode()) {
    return { status: "demo", detail: null, errorMessage: null };
  }
  if (
    !input.instituteId ||
    !isInstituteUuid(input.instituteId) ||
    !input.studentId ||
    !isInstituteUuid(input.studentId)
  ) {
    return { status: "needs_institute", detail: null, errorMessage: null };
  }

  try {
    const [dto, guardians, remarkDtos] = await Promise.all([
      getStudent(input.studentId),
      getStudentGuardians(input.studentId).catch(() => [] as StudentGuardianDto[]),
      listStudentRemarks({
        instituteId: input.instituteId,
        studentId: input.studentId,
      }).catch(() => []),
    ]);
    if (dto.instituteId !== input.instituteId) {
      return { status: "empty", detail: null, errorMessage: "Student not found." };
    }
    const photoUrl = await resolveStudentPhotoUrl(dto.id);
    return {
      status: "ready",
      detail: studentDtoToTeacherDetail(
        dto,
        guardians,
        remarkDtos.map(mapRemarkDtoToStudentRemark),
        photoUrl,
      ),
      errorMessage: null,
    };
  } catch (err) {
    const mapped = mapError(err, "student");
    return { status: mapped.status, detail: null, errorMessage: mapped.message };
  }
}

export async function loadStudentPortalSnapshot(input: {
  instituteId: string | null;
  userDisplayName?: string | null;
  userEmail?: string | null;
}): Promise<{
  status: StudentsLoadStatus;
  snapshot: StudentSnapshot | null;
  errorMessage: string | null;
}> {
  if (!isApiAuthMode()) {
    return { status: "demo", snapshot: null, errorMessage: null };
  }
  if (!input.instituteId || !isInstituteUuid(input.instituteId)) {
    return { status: "needs_institute", snapshot: null, errorMessage: null };
  }

  try {
    const me = await getConnectApiClient().get<MeResponse>("/api/v1/me");
    const identity =
      me.identities.students.find((s) => s.instituteId === input.instituteId) ?? null;
    if (!identity?.studentId) {
      return {
        status: "empty",
        snapshot: null,
        errorMessage: "No student profile linked to this account.",
      };
    }

    const [dto, guardians, instituteName] = await Promise.all([
      getStudent(identity.studentId),
      getStudentGuardians(identity.studentId).catch(() => [] as StudentGuardianDto[]),
      resolveInstituteDisplayName(input.instituteId),
    ]);
    const primary = guardians.find((g) => g.isPrimary) ?? guardians[0];
    const photoUrl = await resolveStudentPhotoUrl(dto.id);
    const profile = studentDtoToProfile(dto, {
      email: input.userEmail ?? me.profile.email ?? undefined,
      institute: instituteName,
      parentName: primary?.parentName,
      photoUrl,
    });
    if (input.userDisplayName?.trim()) {
      profile.name = input.userDisplayName.trim();
    }
    const base = buildEmptyStudentSnapshot(profile);
    const snapshot = await enrichStudentDashboardSnapshot({
      instituteId: input.instituteId,
      snapshot: base,
    });
    return {
      status: "ready",
      snapshot,
      errorMessage: null,
    };
  } catch (err) {
    const mapped = mapError(err, "student portal");
    return { status: mapped.status, snapshot: null, errorMessage: mapped.message };
  }
}

export async function loadStudentsForInstitute(input: {
  instituteId: string | null;
  q?: string;
}): Promise<{
  status: StudentsLoadStatus;
  students: StudentDto[];
  errorMessage: string | null;
}> {
  if (!isApiAuthMode()) {
    return { status: "demo", students: [], errorMessage: null };
  }
  if (!input.instituteId || !isInstituteUuid(input.instituteId)) {
    return { status: "needs_institute", students: [], errorMessage: null };
  }

  try {
    const students = await listStudents({
      instituteId: input.instituteId,
      q: input.q,
    });
    return {
      status: students.length === 0 ? "empty" : "ready",
      students,
      errorMessage: null,
    };
  } catch (err) {
    const mapped = mapError(err, "students");
    return { status: mapped.status, students: [], errorMessage: mapped.message };
  }
}
