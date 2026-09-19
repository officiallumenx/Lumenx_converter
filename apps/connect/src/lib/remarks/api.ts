import { getConnectApiClient } from "@/lib/connect-api";
import type { ConnectApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import type { RemarkType, StudentRemark } from "@/lib/teacher/types";

export type StudentRemarkDto = {
  id: string;
  instituteId: string;
  studentId: string;
  studentName: string | null;
  authorTeacherId: string;
  authorUserId: string;
  authorName: string | null;
  type: RemarkType;
  text: string;
  createdAt: string;
  updatedAt: string;
  visibleTo: Array<"teacher" | "parent" | "admin">;
};

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Remarks API is only available in API auth mode");
  }
}

function formatRemarkDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function mapRemarkDtoToStudentRemark(dto: StudentRemarkDto): StudentRemark {
  return {
    id: dto.id,
    studentId: dto.studentId,
    studentName: dto.studentName?.trim() || "Student",
    type: dto.type,
    text: dto.text,
    authorId: dto.authorTeacherId,
    authorName: dto.authorName?.trim() || "Teacher",
    createdAt: formatRemarkDate(dto.createdAt),
    updatedAt: dto.updatedAt ? formatRemarkDate(dto.updatedAt) : undefined,
    visibleTo: [...dto.visibleTo],
  };
}

export type ParentRemarkCard = {
  teacher: string;
  subject: string;
  text: string;
  date: string;
  tone: "positive" | "warning";
};

export function mapRemarkDtoToParentCard(dto: StudentRemarkDto): ParentRemarkCard {
  const tone: "positive" | "warning" =
    dto.type === "behaviour" || dto.type === "improvement" ? "warning" : "positive";
  return {
    teacher: dto.authorName?.trim() || "Teacher",
    subject: dto.type === "parent_note" ? "Parent note" : dto.type.replace("_", " "),
    text: dto.text,
    date: formatRemarkDate(dto.createdAt),
    tone,
  };
}

export async function listStudentRemarks(
  params: { instituteId: string; studentId?: string },
  client: ConnectApiClient = getConnectApiClient(),
): Promise<StudentRemarkDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams({ institute_id: params.instituteId.trim() });
  if (params.studentId) query.set("student_id", params.studentId.trim());
  return client.get<StudentRemarkDto[]>(`/api/v1/remarks?${query.toString()}`);
}

export async function createStudentRemark(
  input: {
    instituteId: string;
    studentId: string;
    type: RemarkType;
    text: string;
  },
  client: ConnectApiClient = getConnectApiClient(),
): Promise<StudentRemarkDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.post<StudentRemarkDto>("/api/v1/remarks", {
    institute_id: input.instituteId.trim(),
    student_id: input.studentId.trim(),
    type: input.type,
    text: input.text.trim(),
  });
}

export async function updateStudentRemark(
  remarkId: string,
  text: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<StudentRemarkDto> {
  assertApiMode();
  return client.patch<StudentRemarkDto>(`/api/v1/remarks/${remarkId.trim()}`, {
    text: text.trim(),
  });
}

export async function deleteStudentRemark(
  remarkId: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<void> {
  assertApiMode();
  await client.delete(`/api/v1/remarks/${remarkId.trim()}`);
}
