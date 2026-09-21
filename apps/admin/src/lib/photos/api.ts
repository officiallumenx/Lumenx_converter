/**
 * Admin Photos API — staff/teacher + student profile photo management.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Photos API is only available in API auth mode");
  }
}

export type PhotoTeacherDto = {
  id: string;
  instituteId: string;
  displayName: string;
  department: string;
  phone: string | null;
  email: string | null;
  status: string;
  teachingScope: string;
  photoAssetPath: string | null;
  photoSignedUrl: string | null;
  photoExpiresAt: string | null;
};

export type PhotoStudentDto = {
  id: string;
  instituteId: string;
  displayName: string;
  firstName: string;
  surname: string;
  admissionNumber: string | null;
  rollNo: string | null;
  classLabel: string | null;
  sectionLabel: string | null;
  photoAssetPath: string | null;
  photoSignedUrl: string | null;
  photoExpiresAt: string | null;
  enrollmentId: string | null;
  classId: string | null;
  sectionId: string | null;
};

export type PhotoUploadResultDto = {
  kind: "student" | "teacher";
  person: { id: string; displayName?: string; photoAssetPath?: string | null };
  photoAssetPath: string;
  photoSignedUrl: string;
  photoExpiresAt: string;
  assetId: string;
};

export async function listPhotoTeachers(
  params: { instituteId: string; q?: string },
  client: AdminApiClient = getAdminApiClient(),
): Promise<PhotoTeacherDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.q?.trim()) query.set("q", params.q.trim());
  return client.get<PhotoTeacherDto[]>(`/api/v1/photos/teachers?${query}`);
}

export async function listPhotoStudents(
  params: {
    instituteId: string;
    classId: string;
    sectionId: string;
    q?: string;
  },
  client: AdminApiClient = getAdminApiClient(),
): Promise<PhotoStudentDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  query.set("class_id", params.classId.trim());
  query.set("section_id", params.sectionId.trim());
  if (params.q?.trim()) query.set("q", params.q.trim());
  return client.get<PhotoStudentDto[]>(`/api/v1/photos/students?${query}`);
}

export async function uploadTeacherPhoto(
  teacherId: string,
  file: File,
  client: AdminApiClient = getAdminApiClient(),
): Promise<PhotoUploadResultDto> {
  assertApiMode();
  const form = new FormData();
  form.append("file", file);
  return client.uploadForm<PhotoUploadResultDto>(
    `/api/v1/photos/teachers/${teacherId.trim()}`,
    form,
  );
}

export async function uploadStudentPhoto(
  studentId: string,
  file: File,
  client: AdminApiClient = getAdminApiClient(),
): Promise<PhotoUploadResultDto> {
  assertApiMode();
  const form = new FormData();
  form.append("file", file);
  return client.uploadForm<PhotoUploadResultDto>(
    `/api/v1/photos/students/${studentId.trim()}`,
    form,
  );
}

export type PhotoSignedUrlDto = {
  kind: "student" | "teacher";
  id: string;
  photoAssetPath: string | null;
  photoSignedUrl: string | null;
  photoExpiresAt: string | null;
};

export async function getPhotoSignedUrl(
  kind: "student" | "teacher",
  id: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<PhotoSignedUrlDto> {
  assertApiMode();
  const query = new URLSearchParams();
  query.set("kind", kind);
  query.set("id", id.trim());
  return client.get<PhotoSignedUrlDto>(`/api/v1/photos/signed-url?${query}`);
}
