/**
 * Hybrid ledger sync (interim path “2B”).
 *
 * Flow:
 * 1. Nexus / Admin fill PPTX in the browser (localStorage catalog + download).
 * 2. Certificate numbers are allocated in localStorage (`certificate-numbering-store`).
 * 3. This module mirrors issued rows into `/api/v1/certificates` so Connect verify
 *    and Admin API history can see them.
 *
 * Supported interim semantics:
 * - Issues with `metadata_only: true` → `asset_path` stays null; `file_kind` records
 *   pptx/html. PPTX bytes are NOT uploaded to Storage.
 * - A shadow institute `template` row (type certificate, layout visual) is reused or
 *   created by display name so the ledger FK is satisfied. It is not a PPTX SoT and
 *   does not store file bytes.
 * - Historical issued numbers and API `template_id` values are never renumbered or
 *   rewritten after insert. Repeated sync treats “number already issued” as success.
 *
 * Not a substitute for DB catalog cutover (`VITE_NEXUS_TEMPLATE_DB_CATALOG`).
 */
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import { isConflictError } from "@/lib/api";
import { listDocumentTemplates } from "@/lib/documents/api";
import { createDocumentTemplate } from "@/lib/documents/mutations";
import type { IssuedCertificateRecord } from "@/lib/certificate-numbering-store";
import { issueCertificate } from "./mutations";

const templateIdCache = new Map<string, string>();

/** Marker stored on shadow templates created for hybrid ledger sync. */
export const HYBRID_SHADOW_TEMPLATE_TAG = "nexus-hybrid-ledger";

export const HYBRID_SHADOW_DESCRIPTION_PREFIX = "Nexus-linked template";

function cacheKey(instituteId: string, templateName: string): string {
  return `${instituteId}::${templateName.trim().toLowerCase()}`;
}

function isAlreadyIssuedConflict(err: unknown): boolean {
  if (!isConflictError(err)) return false;
  const message = err instanceof Error ? err.message : String(err);
  return /certificate number already issued|already issued/i.test(message);
}

/**
 * Resolve or create a shadow institute certificate template by name.
 * Prefer an existing active row (especially prior hybrid shadows) — never duplicates
 * by name when one already exists. Does not modify issued_certificate.template_id.
 */
export async function ensureIssueTemplateId(input: {
  instituteId: string;
  templateName: string;
  categoryName: string;
  templateVersion: number;
}): Promise<string> {
  if (!isApiAuthMode() || !isInstituteUuid(input.instituteId)) {
    throw new Error("API template resolution requires API auth mode");
  }

  const key = cacheKey(input.instituteId, input.templateName);
  const cached = templateIdCache.get(key);
  if (cached) return cached;

  const templates = await listDocumentTemplates({
    instituteId: input.instituteId,
    type: "certificate",
    status: "active",
  });

  const nameKey = input.templateName.trim().toLowerCase();
  const sameName = templates.filter(
    (t) => t.name.trim().toLowerCase() === nameKey,
  );
  const preferred =
    sameName.find((t) =>
      Array.isArray(t.tags)
        ? t.tags.includes(HYBRID_SHADOW_TEMPLATE_TAG)
        : false,
    ) ??
    sameName.find((t) =>
      (t.description ?? "")
        .toLowerCase()
        .includes(HYBRID_SHADOW_DESCRIPTION_PREFIX.toLowerCase()),
    ) ??
    sameName[0];

  if (preferred) {
    templateIdCache.set(key, preferred.id);
    return preferred.id;
  }

  const created = await createDocumentTemplate({
    instituteId: input.instituteId,
    type: "certificate",
    name: input.templateName,
    category: input.categoryName,
    source: "custom",
    previewAspect: "a4",
    layoutMode: "visual",
    activateNow: true,
    tags: [HYBRID_SHADOW_TEMPLATE_TAG],
    description: `${HYBRID_SHADOW_DESCRIPTION_PREFIX} v${input.templateVersion} (ledger metadata only; PPTX stays local)`,
  });
  templateIdCache.set(key, created.id);
  return created.id;
}

export type HybridLedgerSyncResult = {
  /** Newly inserted ledger rows this run. */
  synced: number;
  /** Hard failures (auth, validation, network, etc.). */
  failed: number;
  /** Certificate number already on the ledger — treated as success (idempotent). */
  alreadySynced: number;
  /** Interim path always issues metadata-only (no Storage PPTX). */
  metadataOnly: true;
};

export async function syncIssuedRecordsToApi(input: {
  instituteId: string;
  records: IssuedCertificateRecord[];
}): Promise<HybridLedgerSyncResult> {
  if (!isApiAuthMode() || !isInstituteUuid(input.instituteId)) {
    return { synced: 0, failed: 0, alreadySynced: 0, metadataOnly: true };
  }

  let synced = 0;
  let failed = 0;
  let alreadySynced = 0;

  for (const record of input.records) {
    try {
      const studentUuid = isInstituteUuid(record.studentId)
        ? record.studentId
        : null;
      const templateId = await ensureIssueTemplateId({
        instituteId: input.instituteId,
        templateName: record.templateName,
        categoryName: record.categoryName,
        templateVersion: record.templateVersion,
      });

      await issueCertificate({
        instituteId: input.instituteId,
        templateId,
        studentId: studentUuid,
        title: record.templateName,
        category: record.categoryName,
        recipientName: record.studentName,
        recipientRef: record.admissionNumber ?? null,
        certificateNumber: record.certificateNumber,
        year: record.year,
        fileKind: record.fileKind === "html" ? "html" : "pptx",
        // Intentional interim: ledger + verify without uploading PPTX bytes.
        metadataOnly: true,
        assetPath: null,
      });
      synced += 1;
    } catch (err) {
      if (isAlreadyIssuedConflict(err)) {
        alreadySynced += 1;
        continue;
      }
      failed += 1;
    }
  }

  return { synced, failed, alreadySynced, metadataOnly: true };
}

export function resetIssueTemplateCacheForTests(): void {
  templateIdCache.clear();
}
