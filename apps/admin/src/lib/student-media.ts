import {
  deleteBlobAsset,
  getBlobAssetAsDataUrl,
  putDataUrlAsset,
} from "@/lib/blob-asset-store";

/** Local shapes only — avoid importing student-directory-store (circular). */
type StudentProfileDocument = {
  id: string;
  previewAssetId?: string;
  previewDataUrl: string;
  [key: string]: unknown;
};

type StudentDirectoryRecord = {
  id: string;
  photoAssetId?: string;
  photoDataUrl?: string;
  admissionDocuments?: StudentProfileDocument[];
  [key: string]: unknown;
};

export function isInlineDataUrl(value: string | undefined): boolean {
  return Boolean(value?.startsWith("data:"));
}

export function studentPhotoAssetId(studentId: string): string {
  return `student-photo:${studentId}`;
}

export function studentDocAssetId(studentId: string, docId: string): string {
  return `student-doc:${studentId}:${docId}`;
}

export function collectStudentAssetIds(record: StudentDirectoryRecord): string[] {
  const ids: string[] = [];
  if (record.photoAssetId) ids.push(record.photoAssetId);
  for (const doc of record.admissionDocuments ?? []) {
    if (doc.previewAssetId) ids.push(doc.previewAssetId);
  }
  return ids;
}

export function slimStudentForPersist(record: StudentDirectoryRecord): StudentDirectoryRecord {
  return {
    ...record,
    photoDataUrl: undefined,
    admissionDocuments: (record.admissionDocuments ?? []).map((doc) => ({
      ...doc,
      previewDataUrl: "",
    })),
  };
}

async function persistPhoto(record: StudentDirectoryRecord): Promise<StudentDirectoryRecord> {
  const inline = record.photoDataUrl?.trim();
  if (isInlineDataUrl(inline)) {
    const id = record.photoAssetId || studentPhotoAssetId(record.id);
    const ok = await putDataUrlAsset(id, inline!);
    if (!ok) return record;
    return { ...record, photoAssetId: id, photoDataUrl: inline };
  }
  if (!inline && !record.photoAssetId) {
    return { ...record, photoAssetId: undefined, photoDataUrl: undefined };
  }
  return record;
}

async function persistDocuments(record: StudentDirectoryRecord): Promise<StudentDirectoryRecord> {
  const docs = record.admissionDocuments ?? [];
  if (docs.length === 0) return record;
  const nextDocs: StudentProfileDocument[] = [];
  for (const doc of docs) {
    const inline = doc.previewDataUrl?.trim();
    if (isInlineDataUrl(inline)) {
      const id = doc.previewAssetId || studentDocAssetId(record.id, doc.id);
      const ok = await putDataUrlAsset(id, inline);
      nextDocs.push(ok ? { ...doc, previewAssetId: id, previewDataUrl: inline } : doc);
      continue;
    }
    nextDocs.push(doc);
  }
  return { ...record, admissionDocuments: nextDocs };
}

export async function persistStudentMedia(
  record: StudentDirectoryRecord,
): Promise<StudentDirectoryRecord> {
  const withPhoto = await persistPhoto(record);
  return persistDocuments(withPhoto);
}

export async function hydrateStudentMedia(
  record: StudentDirectoryRecord,
): Promise<StudentDirectoryRecord> {
  let photoDataUrl = record.photoDataUrl;
  if (!isInlineDataUrl(photoDataUrl) && record.photoAssetId) {
    photoDataUrl = (await getBlobAssetAsDataUrl(record.photoAssetId)) ?? photoDataUrl;
  }

  const docs = record.admissionDocuments ?? [];
  const admissionDocuments: StudentProfileDocument[] = [];
  for (const doc of docs) {
    let previewDataUrl = doc.previewDataUrl;
    if (!isInlineDataUrl(previewDataUrl) && doc.previewAssetId) {
      previewDataUrl = (await getBlobAssetAsDataUrl(doc.previewAssetId)) ?? previewDataUrl;
    }
    admissionDocuments.push({ ...doc, previewDataUrl: previewDataUrl || "" });
  }

  return {
    ...record,
    photoDataUrl,
    admissionDocuments,
  };
}

export async function persistStudentDirectoryMedia(
  records: StudentDirectoryRecord[],
): Promise<StudentDirectoryRecord[]> {
  const next: StudentDirectoryRecord[] = [];
  for (const record of records) {
    next.push(await persistStudentMedia(record));
  }
  return next;
}

export async function hydrateStudentDirectoryMedia(
  records: StudentDirectoryRecord[],
): Promise<StudentDirectoryRecord[]> {
  const next: StudentDirectoryRecord[] = [];
  for (const record of records) {
    next.push(await hydrateStudentMedia(record));
  }
  return next;
}

export async function deleteStudentMedia(record: StudentDirectoryRecord): Promise<void> {
  await Promise.all(collectStudentAssetIds(record).map((id) => deleteBlobAsset(id)));
}
