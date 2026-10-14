import {
  deleteBlobAsset,
  getBlobAssetAsDataUrl,
  putDataUrlAsset,
} from "@/lib/blob-asset-store";

/** Local shapes only — avoid importing student-directory-store (circular). */
type StudentMediaDoc = {
  id: string;
  previewAssetId?: string;
  previewDataUrl: string;
};

type StudentMediaRecord = {
  id: string;
  photoAssetId?: string;
  photoDataUrl?: string;
  admissionDocuments?: StudentMediaDoc[];
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

export function collectStudentAssetIds(record: StudentMediaRecord): string[] {
  const ids: string[] = [];
  if (record.photoAssetId) ids.push(record.photoAssetId);
  for (const doc of record.admissionDocuments ?? []) {
    if (doc.previewAssetId) ids.push(doc.previewAssetId);
  }
  return ids;
}

export function slimStudentForPersist<T extends StudentMediaRecord>(record: T): T {
  return {
    ...record,
    photoDataUrl: undefined,
    admissionDocuments: (record.admissionDocuments ?? []).map((doc) => ({
      ...doc,
      previewDataUrl: "",
    })),
  } as T;
}

async function persistPhoto<T extends StudentMediaRecord>(record: T): Promise<T> {
  const inline = record.photoDataUrl?.trim();
  if (isInlineDataUrl(inline)) {
    const id = record.photoAssetId || studentPhotoAssetId(record.id);
    const ok = await putDataUrlAsset(id, inline!);
    if (!ok) return record;
    return { ...record, photoAssetId: id, photoDataUrl: inline } as T;
  }
  if (!inline && !record.photoAssetId) {
    return { ...record, photoAssetId: undefined, photoDataUrl: undefined } as T;
  }
  return record;
}

async function persistDocuments<T extends StudentMediaRecord>(record: T): Promise<T> {
  const docs = record.admissionDocuments ?? [];
  if (docs.length === 0) return record;
  const nextDocs: StudentMediaDoc[] = [];
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
  return { ...record, admissionDocuments: nextDocs } as T;
}

export async function persistStudentMedia<T extends StudentMediaRecord>(
  record: T,
): Promise<T> {
  const withPhoto = await persistPhoto(record);
  return persistDocuments(withPhoto);
}

export async function hydrateStudentMedia<T extends StudentMediaRecord>(
  record: T,
): Promise<T> {
  let photoDataUrl = record.photoDataUrl;
  if (!isInlineDataUrl(photoDataUrl) && record.photoAssetId) {
    photoDataUrl = (await getBlobAssetAsDataUrl(record.photoAssetId)) ?? photoDataUrl;
  }

  const docs = record.admissionDocuments ?? [];
  const admissionDocuments: StudentMediaDoc[] = [];
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
  } as T;
}

export async function persistStudentDirectoryMedia<T extends StudentMediaRecord>(
  records: T[],
): Promise<T[]> {
  const next: T[] = [];
  for (const record of records) {
    next.push(await persistStudentMedia(record));
  }
  return next;
}

export async function hydrateStudentDirectoryMedia<T extends StudentMediaRecord>(
  records: T[],
): Promise<T[]> {
  const next: T[] = [];
  for (const record of records) {
    next.push(await hydrateStudentMedia(record));
  }
  return next;
}

export async function deleteStudentMedia(record: StudentMediaRecord): Promise<void> {
  await Promise.all(collectStudentAssetIds(record).map((id) => deleteBlobAsset(id)));
}
