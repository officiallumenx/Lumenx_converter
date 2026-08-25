import type { AdminAdmissionDetail } from "@/lib/admissions-application-details";
import type { StudentDirectoryRecord, StudentProfileDocument } from "@/lib/student-directory-store";

const APPLICATIONS_KEY = "ues_admissions_applications";
const COPY_PURGE_AFTER_DAYS = 30;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type ConnectAdmissionDocument = {
  id: string;
  type: string;
  label?: string;
  fileName?: string;
  status?: string;
  note?: string;
  previewDataUrl?: string;
  uploadedAt?: string;
  lifecycle?: {
    movedToStudentId?: string;
    movedAt?: string;
    purgeAfter?: string;
  };
};

type ConnectAdmissionApplication = {
  id: string;
  documents?: ConnectAdmissionDocument[];
};

type RawAdmissionDocument = {
  id: string;
  type: string;
  label: string;
  fileName: string;
  status: string;
  note?: string;
  previewDataUrl?: string;
  previewLines?: string[];
  applicantName?: string;
  applicationId?: string;
};

function readApplicationsStore(): ConnectAdmissionApplication[] {
  try {
    const raw = localStorage.getItem(APPLICATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ConnectAdmissionApplication[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeApplicationsStore(items: ConnectAdmissionApplication[]) {
  try {
    localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(items));
  } catch {
    // Demo mode: ignore storage write issues.
  }
}

function purgeAtFromMovedAt(movedAtIso: string): string {
  const movedAt = new Date(movedAtIso).getTime();
  return new Date(movedAt + COPY_PURGE_AFTER_DAYS * ONE_DAY_MS).toISOString();
}

function fallbackPreviewDataUrl(
  doc: Pick<RawAdmissionDocument, "label" | "fileName" | "type" | "applicationId" | "applicantName" | "previewLines">,
): string {
  const lines = [
    `Document: ${doc.label}`,
    `File: ${doc.fileName}`,
    `Type: ${doc.type}`,
    ...(doc.applicationId ? [`Application: ${doc.applicationId}`] : []),
    ...(doc.applicantName ? [`Applicant: ${doc.applicantName}`] : []),
    ...(doc.previewLines ?? []),
  ];
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;padding:16px"><h3>${doc.label}</h3>${lines
    .map((line) => `<p>${line}</p>`)
    .join("")}</body></html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

function keyForDoc(sourceApplicationId: string, type: string, fileName: string): string {
  return `${sourceApplicationId}::${type.toLowerCase()}::${fileName.trim().toLowerCase()}`;
}

function collectSourceDocs(
  applicationId: string,
  detail: AdminAdmissionDetail | null,
): RawAdmissionDocument[] {
  const app = readApplicationsStore().find((row) => row.id === applicationId);
  const fromConnect: RawAdmissionDocument[] =
    app?.documents?.map((doc) => ({
      id: doc.id,
      type: doc.type,
      label: doc.label ?? doc.type.replace(/_/g, " "),
      fileName: doc.fileName ?? `${doc.type}.pdf`,
      status: doc.status ?? "uploaded",
      note: doc.note,
      previewDataUrl: doc.previewDataUrl,
      applicationId,
    })) ?? [];
  if (fromConnect.length > 0) return fromConnect;
  return (
    detail?.documents.map((doc) => ({
      id: doc.id,
      type: doc.type,
      label: doc.label,
      fileName: doc.fileName,
      status: doc.status,
      note: doc.note,
      previewDataUrl: doc.previewImageUrl,
      previewLines: doc.previewLines,
      applicantName: doc.applicantName,
      applicationId: doc.applicationId,
    })) ?? []
  );
}

function markAdmissionCopiesForPurge(
  applicationId: string,
  studentId: string,
  movedAtIso: string,
) {
  const all = readApplicationsStore();
  const idx = all.findIndex((row) => row.id === applicationId);
  if (idx < 0) return;
  const app = all[idx]!;
  const purgeAfter = purgeAtFromMovedAt(movedAtIso);
  const nextDocs =
    app.documents?.map((doc) => ({
      ...doc,
      lifecycle: {
        ...(doc.lifecycle ?? {}),
        movedToStudentId: studentId,
        movedAt: movedAtIso,
        purgeAfter,
      },
    })) ?? [];
  all[idx] = { ...app, documents: nextDocs };
  writeApplicationsStore(all);
}

export function transferAdmissionDocumentsToStudentProfile(input: {
  student: StudentDirectoryRecord;
  applicationId: string;
  detail: AdminAdmissionDetail | null;
  movedAtIso?: string;
}): { student: StudentDirectoryRecord; movedCount: number; purgeAfter: string } {
  const movedAtIso = input.movedAtIso ?? new Date().toISOString();
  const purgeAfter = purgeAtFromMovedAt(movedAtIso);
  const sourceDocs = collectSourceDocs(input.applicationId, input.detail);
  const existing = input.student.admissionDocuments ?? [];
  const seen = new Set(
    existing.map((doc) => keyForDoc(doc.sourceApplicationId, doc.type, doc.fileName)),
  );
  const added: StudentProfileDocument[] = [];

  for (const doc of sourceDocs) {
    const docKey = keyForDoc(input.applicationId, doc.type, doc.fileName);
    if (seen.has(docKey)) continue;
    seen.add(docKey);
    added.push({
      id: `stu-doc-${input.applicationId}-${doc.type}-${added.length + 1}`,
      sourceApplicationId: input.applicationId,
      sourceDocumentId: doc.id,
      type: doc.type,
      label: doc.label,
      fileName: doc.fileName,
      status: doc.status,
      movedAt: movedAtIso,
      purgeAdmissionCopyAt: purgeAfter,
      previewDataUrl:
        doc.previewDataUrl ||
        fallbackPreviewDataUrl({
          label: doc.label,
          fileName: doc.fileName,
          type: doc.type,
          applicationId: doc.applicationId,
          applicantName: doc.applicantName,
          previewLines: doc.previewLines,
        }),
      note: doc.note,
    });
  }

  markAdmissionCopiesForPurge(input.applicationId, input.student.id, movedAtIso);
  return {
    student: {
      ...input.student,
      admissionDocuments: [...existing, ...added],
    },
    movedCount: added.length,
    purgeAfter,
  };
}

export function purgeExpiredAdmissionDocumentCopies(now: Date = new Date()): number {
  const nowMs = now.getTime();
  const all = readApplicationsStore();
  let changed = false;
  let purged = 0;

  const next = all.map((app) => {
    if (!Array.isArray(app.documents) || app.documents.length === 0) return app;
    const docs = app.documents as ConnectAdmissionDocument[];
    const kept = docs.filter((doc) => {
      const purgeAfter = doc.lifecycle?.purgeAfter;
      if (!purgeAfter) return true;
      const purgeMs = new Date(purgeAfter).getTime();
      if (Number.isNaN(purgeMs) || purgeMs > nowMs) return true;
      purged += 1;
      return false;
    });
    if (kept.length === docs.length) return app;
    changed = true;
    return { ...app, documents: kept };
  });

  if (changed) writeApplicationsStore(next);
  return purged;
}
