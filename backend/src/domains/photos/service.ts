/**
 * Canonical profile photos for students and teachers.
 * Storage: student-media via assets upload; DB: photo_asset_path object keys.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteRoles,
  requireInstituteId,
} from "../../authorization/index.js";
import { listEnrollmentsForActor } from "../academics/service.js";
import {
  findAssetByBucketPath,
  listAssets,
  softDeleteAsset,
} from "../assets/repository.js";
import { uploadAssetForActor } from "../assets/service.js";
import {
  createStorageSignedUrl,
  DEFAULT_SIGNED_URL_TTL_SEC,
  removeFromStorage,
} from "../assets/storage.js";
import { findStudentById } from "../students/repository.js";
import {
  getStudentForActor,
  listStudentsForActor,
  STUDENT_STAFF_READ_ROLES,
  STUDENT_STAFF_WRITE_ROLES,
  updateStudentForActor,
} from "../students/service.js";
import type { StudentDto } from "../students/types.js";
import { findTeacherById } from "../teachers/repository.js";
import {
  getTeacherForActor,
  listTeachersForActor,
  TEACHER_STAFF_READ_ROLES,
  TEACHER_STAFF_WRITE_ROLES,
  updateTeacherForActor,
} from "../teachers/service.js";
import type { TeacherDto } from "../teachers/types.js";

export const PROFILE_PHOTO_MAX_BYTES = 1.5 * 1024 * 1024;
export const PROFILE_PHOTO_BUCKET = "student-media" as const;

/**
 * Client compresses to ≤800KB / ≤1200px (PROFILE_PHOTO_COMPRESS in @lumenx/utils)
 * before upload. This ceiling rejects accidental uncompressed originals.
 */

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export type PhotoPersonKind = "student" | "teacher";

export type PhotoListTeacherDto = TeacherDto & {
  photoSignedUrl: string | null;
  photoExpiresAt: string | null;
};

export type PhotoListStudentDto = StudentDto & {
  photoSignedUrl: string | null;
  photoExpiresAt: string | null;
  enrollmentId: string | null;
  classId: string | null;
  sectionId: string | null;
};

export type PhotoUploadResultDto = {
  kind: PhotoPersonKind;
  person: StudentDto | TeacherDto;
  photoAssetPath: string;
  photoSignedUrl: string;
  photoExpiresAt: string;
  assetId: string;
};

function assertPhotoWriter(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  assertInstituteRoles(actor, instituteId, [
    ...new Set([...STUDENT_STAFF_WRITE_ROLES, ...TEACHER_STAFF_WRITE_ROLES]),
  ]);
}

function assertPhotoReader(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  assertInstituteRoles(actor, instituteId, [
    ...new Set([...STUDENT_STAFF_READ_ROLES, ...TEACHER_STAFF_READ_ROLES]),
  ]);
}

function assertImageFile(input: {
  contentType: string;
  byteSize: number;
  fileName: string;
}): void {
  const mime = input.contentType.trim().toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    throw AppError.validation("Unsupported image type", {
      file: ["Use JPEG, PNG, or WebP"],
    });
  }
  if (input.byteSize <= 0) {
    throw AppError.validation("File is empty", { file: ["Required"] });
  }
  if (input.byteSize > PROFILE_PHOTO_MAX_BYTES) {
    throw AppError.validation("Image exceeds profile photo limit", {
      file: [`Max ${PROFILE_PHOTO_MAX_BYTES} bytes`],
    });
  }
  const name = input.fileName.trim().toLowerCase();
  if (name && !/\.(jpe?g|png|webp)$/i.test(name)) {
    throw AppError.validation("Unsupported image type", {
      file: ["Use JPEG, PNG, or WebP"],
    });
  }
}

export async function resolvePhotoSignedUrl(
  admin: SupabaseClient,
  instituteId: string,
  objectPath: string | null | undefined,
  expiresInSec: number = DEFAULT_SIGNED_URL_TTL_SEC,
): Promise<{ signedUrl: string; expiresAt: string; assetId: string } | null> {
  const path = objectPath?.trim();
  if (!path) return null;

  const asset = await findAssetByBucketPath(
    admin,
    instituteId,
    PROFILE_PHOTO_BUCKET,
    path,
  );
  if (asset) {
    const { signedUrl, expiresAt } = await createStorageSignedUrl(
      admin,
      asset.bucket,
      asset.object_path,
      expiresInSec,
    );
    return { signedUrl, expiresAt, assetId: asset.id };
  }

  // Path may exist on the person row even if the asset catalog row is missing.
  try {
    const { signedUrl, expiresAt } = await createStorageSignedUrl(
      admin,
      PROFILE_PHOTO_BUCKET,
      path,
      expiresInSec,
    );
    return { signedUrl, expiresAt, assetId: "" };
  } catch {
    return null;
  }
}

async function withSignedPhoto<
  T extends { instituteId: string; photoAssetPath: string | null },
>(
  admin: SupabaseClient,
  person: T,
): Promise<T & { photoSignedUrl: string | null; photoExpiresAt: string | null }> {
  const signed = await resolvePhotoSignedUrl(
    admin,
    person.instituteId,
    person.photoAssetPath,
  );
  return {
    ...person,
    photoSignedUrl: signed?.signedUrl ?? null,
    photoExpiresAt: signed?.expiresAt ?? null,
  };
}

export async function listPhotoTeachersForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: { instituteId: string; q?: string },
): Promise<PhotoListTeacherDto[]> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertPhotoReader(actor, instituteId);
  const teachers = await listTeachersForActor(admin, actor, {
    instituteId,
    q: input.q,
  });
  return Promise.all(teachers.map(async (t) => withSignedPhoto(admin, t)));
}

export async function listPhotoStudentsForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: {
    instituteId: string;
    classId: string;
    sectionId: string;
    q?: string;
  },
): Promise<PhotoListStudentDto[]> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertPhotoReader(actor, instituteId);

  if (!input.classId || !input.sectionId) {
    throw AppError.validation("Class and section are required", {
      class_id: !input.classId ? ["Required"] : undefined,
      section_id: !input.sectionId ? ["Required"] : undefined,
    });
  }

  const enrollments = await listEnrollmentsForActor(admin, actor, {
    instituteId,
    classId: input.classId,
    sectionId: input.sectionId,
    status: "active",
  });

  const studentIds = [...new Set(enrollments.map((e) => e.studentId))];
  if (studentIds.length === 0) return [];

  const enrollmentByStudent = new Map(
    enrollments.map((e) => [e.studentId, e] as const),
  );

  const all = await listStudentsForActor(admin, actor, { instituteId });
  let matched = all.filter((s) => studentIds.includes(s.id));
  if (input.q?.trim()) {
    const q = input.q.trim().toLowerCase();
    matched = matched.filter((s) => {
      const hay = [
        s.displayName,
        s.firstName,
        s.surname,
        s.admissionNumber,
        s.rollNo,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }

  return Promise.all(
    matched.map(async (s) => {
      const withPhoto = await withSignedPhoto(admin, s);
      const enr = enrollmentByStudent.get(s.id);
      return {
        ...withPhoto,
        enrollmentId: enr?.id ?? null,
        classId: enr?.classId ?? input.classId,
        sectionId: enr?.sectionId ?? input.sectionId,
      };
    }),
  );
}

async function cleanupPreviousPhoto(
  admin: SupabaseClient,
  instituteId: string,
  kind: PhotoPersonKind,
  personId: string,
  previousPath: string | null,
  keepPath: string,
): Promise<void> {
  if (!previousPath || previousPath === keepPath) return;

  const linked = await listAssets(admin, {
    instituteId,
    bucket: PROFILE_PHOTO_BUCKET,
    linkedEntityKind: kind,
    linkedEntityId: personId,
  });

  for (const row of linked) {
    if (row.object_path === keepPath) continue;
    const isOldPath = row.object_path === previousPath;
    const isProfileCategory =
      row.category === "student_photo" || row.category === "avatar";
    if (!isOldPath && !isProfileCategory) continue;
    await softDeleteAsset(admin, row.id).catch(() => undefined);
    await removeFromStorage(admin, row.bucket, row.object_path).catch(
      () => undefined,
    );
  }

  const byPath = await findAssetByBucketPath(
    admin,
    instituteId,
    PROFILE_PHOTO_BUCKET,
    previousPath,
  );
  if (byPath && byPath.object_path !== keepPath) {
    await softDeleteAsset(admin, byPath.id).catch(() => undefined);
    await removeFromStorage(admin, byPath.bucket, byPath.object_path).catch(
      () => undefined,
    );
  }
}

export async function uploadTeacherPhotoForActor(
  admin: SupabaseClient,
  actor: Actor,
  teacherId: string,
  file: {
    fileName: string;
    contentType: string;
    byteSize: number;
    body: ArrayBuffer;
  },
): Promise<PhotoUploadResultDto> {
  assertImageFile(file);
  const existing = await findTeacherById(admin, teacherId);
  if (!existing) throw AppError.notFound("Teacher not found");

  assertPhotoWriter(actor, existing.institute_id);

  const previousPath = existing.photo_asset_path;
  const asset = await uploadAssetForActor(admin, actor, {
    instituteId: existing.institute_id,
    bucket: PROFILE_PHOTO_BUCKET,
    category: "avatar",
    fileName: file.fileName,
    contentType: file.contentType,
    byteSize: file.byteSize,
    body: file.body,
    visibility: "institute",
    linkedEntityKind: "teacher",
    linkedEntityId: teacherId,
  });

  const updated = await updateTeacherForActor(admin, actor, teacherId, {
    photoAssetPath: asset.objectPath,
  });

  await cleanupPreviousPhoto(
    admin,
    existing.institute_id,
    "teacher",
    teacherId,
    previousPath,
    asset.objectPath,
  );

  const signed = await createStorageSignedUrl(
    admin,
    asset.bucket,
    asset.objectPath,
    DEFAULT_SIGNED_URL_TTL_SEC,
  );

  return {
    kind: "teacher",
    person: updated,
    photoAssetPath: asset.objectPath,
    photoSignedUrl: signed.signedUrl,
    photoExpiresAt: signed.expiresAt,
    assetId: asset.id,
  };
}

export async function uploadStudentPhotoForActor(
  admin: SupabaseClient,
  actor: Actor,
  studentId: string,
  file: {
    fileName: string;
    contentType: string;
    byteSize: number;
    body: ArrayBuffer;
  },
): Promise<PhotoUploadResultDto> {
  assertImageFile(file);
  const existing = await findStudentById(admin, studentId);
  if (!existing) throw AppError.notFound("Student not found");

  assertPhotoWriter(actor, existing.institute_id);

  const previousPath = existing.photo_asset_path;
  const asset = await uploadAssetForActor(admin, actor, {
    instituteId: existing.institute_id,
    bucket: PROFILE_PHOTO_BUCKET,
    category: "student_photo",
    fileName: file.fileName,
    contentType: file.contentType,
    byteSize: file.byteSize,
    body: file.body,
    visibility: "institute",
    linkedEntityKind: "student",
    linkedEntityId: studentId,
  });

  const updated = await updateStudentForActor(admin, actor, studentId, {
    photoAssetPath: asset.objectPath,
  });

  await cleanupPreviousPhoto(
    admin,
    existing.institute_id,
    "student",
    studentId,
    previousPath,
    asset.objectPath,
  );

  const signed = await createStorageSignedUrl(
    admin,
    asset.bucket,
    asset.objectPath,
    DEFAULT_SIGNED_URL_TTL_SEC,
  );

  return {
    kind: "student",
    person: updated,
    photoAssetPath: asset.objectPath,
    photoSignedUrl: signed.signedUrl,
    photoExpiresAt: signed.expiresAt,
    assetId: asset.id,
  };
}

export async function getPhotoSignedUrlForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: { kind: PhotoPersonKind; id: string },
): Promise<{
  kind: PhotoPersonKind;
  id: string;
  photoAssetPath: string | null;
  photoSignedUrl: string | null;
  photoExpiresAt: string | null;
}> {
  if (input.kind === "teacher") {
    const dto = await getTeacherForActor(admin, actor, input.id);
    const signed = await resolvePhotoSignedUrl(
      admin,
      dto.instituteId,
      dto.photoAssetPath,
    );
    return {
      kind: "teacher",
      id: dto.id,
      photoAssetPath: dto.photoAssetPath,
      photoSignedUrl: signed?.signedUrl ?? null,
      photoExpiresAt: signed?.expiresAt ?? null,
    };
  }

  const dto = await getStudentForActor(admin, actor, input.id);
  const signed = await resolvePhotoSignedUrl(
    admin,
    dto.instituteId,
    dto.photoAssetPath,
  );
  return {
    kind: "student",
    id: dto.id,
    photoAssetPath: dto.photoAssetPath,
    photoSignedUrl: signed?.signedUrl ?? null,
    photoExpiresAt: signed?.expiresAt ?? null,
  };
}
