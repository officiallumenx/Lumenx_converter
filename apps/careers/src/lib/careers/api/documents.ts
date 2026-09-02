/**
 * Careers document uploads — assets API + application payload patch.
 * API auth mode only.
 */
import { isApiAuthMode } from "@/auth/auth-mode";
import { getCareersApiClient } from "@/lib/careers-api";
import type { CareersApiClient } from "@/lib/api";
import { isInstituteUuid } from "@/lib/institute-id";
import type {
  ApplicationDocument,
  CareerDocumentType,
  DocumentVerificationStatus,
} from "../types";
import { updateCareerApplication } from "./mutations";

export type CareerAssetDto = {
  id: string;
  instituteId: string;
  objectPath: string;
  fileName: string | null;
};

const DOC_LABELS: Record<CareerDocumentType, string> = {
  resume: "Resume / CV",
  certificates: "Certificates",
  experience_letters: "Experience Letters",
  identity_proof: "Identity Proof",
  profile_photo: "Profile Photo",
  demo_teaching_video: "Demo Teaching Video",
  additional: "Additional Document",
};

const DEFAULT_SLOT_TYPES: CareerDocumentType[] = [
  "resume",
  "certificates",
  "experience_letters",
  "identity_proof",
  "profile_photo",
];

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Careers document API is only available in API auth mode");
  }
}

function isDocumentType(value: unknown): value is CareerDocumentType {
  return typeof value === "string" && value in DOC_LABELS;
}

function isDocumentStatus(value: unknown): value is DocumentVerificationStatus {
  return (
    value === "pending_upload" ||
    value === "uploaded" ||
    value === "under_review" ||
    value === "verified" ||
    value === "rejected" ||
    value === "requires_resubmission"
  );
}

function parsePayloadDocument(raw: unknown): ApplicationDocument | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (!isDocumentType(row.type)) return null;
  const type = row.type;
  const status = isDocumentStatus(row.status) ? row.status : "uploaded";
  return {
    id: typeof row.id === "string" ? row.id : `doc-${type}`,
    type,
    label: typeof row.label === "string" ? row.label : DOC_LABELS[type],
    fileName: typeof row.fileName === "string" ? row.fileName : undefined,
    status,
    uploadedAt: typeof row.uploadedAt === "string" ? row.uploadedAt : undefined,
    note: typeof row.note === "string" ? row.note : undefined,
    assetId: typeof row.assetId === "string" ? row.assetId : undefined,
  };
}

/** Map application payload.documents to UI document slots (with defaults). */
export function applicationDocumentsFromPayload(payload: unknown): ApplicationDocument[] {
  const uploaded: ApplicationDocument[] = [];
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const docs = (payload as Record<string, unknown>).documents;
    if (Array.isArray(docs)) {
      for (const raw of docs) {
        const parsed = parsePayloadDocument(raw);
        if (parsed) uploaded.push(parsed);
      }
    }
  }
  const byType = new Map(uploaded.map((doc) => [doc.type, doc]));
  return DEFAULT_SLOT_TYPES.map(
    (type) =>
      byType.get(type) ?? {
        id: `doc-${type}`,
        type,
        label: DOC_LABELS[type],
        status: "pending_upload" as const,
      },
  );
}

export function mergeApplicationDocument(
  existing: ApplicationDocument[],
  type: CareerDocumentType,
  file: File,
  asset: CareerAssetDto,
): ApplicationDocument[] {
  const doc: ApplicationDocument = {
    id: `doc-${type}`,
    type,
    label: DOC_LABELS[type],
    fileName: file.name,
    status: "uploaded",
    uploadedAt: new Date().toISOString().slice(0, 10),
    assetId: asset.id,
  };
  const slots =
    existing.length > 0
      ? existing
      : DEFAULT_SLOT_TYPES.map((slotType) => ({
          id: `doc-${slotType}`,
          type: slotType,
          label: DOC_LABELS[slotType],
          status: "pending_upload" as const,
        }));
  return [...slots.filter((d) => d.type !== type), doc];
}

export function documentsToPayloadRecords(docs: ApplicationDocument[]): unknown[] {
  return docs
    .filter((d) => d.fileName || d.assetId)
    .map((d) => ({
      id: d.id,
      type: d.type,
      label: d.label,
      fileName: d.fileName,
      status: d.status,
      uploadedAt: d.uploadedAt,
      note: d.note,
      assetId: d.assetId,
    }));
}

export async function uploadCareerDocumentAsset(
  input: {
    instituteId: string;
    file: File;
    applicationId?: string;
  },
  client: CareersApiClient = getCareersApiClient(),
): Promise<CareerAssetDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const form = new FormData();
  form.set("institute_id", input.instituteId.trim());
  form.set("bucket", "career-docs");
  form.set("category", "career_doc");
  form.set("file", input.file);
  form.set("visibility", "private");
  if (input.applicationId) {
    form.set("linked_entity_kind", "career_application");
    form.set("linked_entity_id", input.applicationId);
  }
  return client.uploadForm<CareerAssetDto>("/api/v1/assets/upload", form);
}

export async function uploadCareerApplicationDocument(
  input: {
    applicationId: string;
    instituteId: string;
    type: CareerDocumentType;
    file: File;
    existingDocuments: ApplicationDocument[];
  },
  client: CareersApiClient = getCareersApiClient(),
): Promise<ApplicationDocument[]> {
  assertApiMode();
  const asset = await uploadCareerDocumentAsset(
    {
      instituteId: input.instituteId,
      file: input.file,
      applicationId: input.applicationId,
    },
    client,
  );
  const nextDocuments = mergeApplicationDocument(
    input.existingDocuments,
    input.type,
    input.file,
    asset,
  );
  await updateCareerApplication(
    input.applicationId,
    { payload: { documents: documentsToPayloadRecords(nextDocuments) } },
    client,
  );
  return nextDocuments;
}
