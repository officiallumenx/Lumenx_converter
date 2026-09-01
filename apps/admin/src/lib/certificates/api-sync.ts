/**
 * Sync locally issued certificates (PPTX/HTML) to the API ledger — hybrid 2B path.
 */
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import { listDocumentTemplates } from "@/lib/documents/api";
import { createDocumentTemplate } from "@/lib/documents/mutations";
import type { IssuedCertificateRecord } from "@/lib/certificate-numbering-store";
import { issueCertificate } from "./mutations";

const templateIdCache = new Map<string, string>();

function cacheKey(instituteId: string, templateName: string): string {
  return `${instituteId}::${templateName.trim().toLowerCase()}`;
}

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

  const match = templates.find(
    (t) => t.name.trim().toLowerCase() === input.templateName.trim().toLowerCase(),
  );
  if (match) {
    templateIdCache.set(key, match.id);
    return match.id;
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
    description: `Nexus-linked template v${input.templateVersion}`,
  });
  templateIdCache.set(key, created.id);
  return created.id;
}

export async function syncIssuedRecordsToApi(input: {
  instituteId: string;
  records: IssuedCertificateRecord[];
}): Promise<{ synced: number; failed: number }> {
  if (!isApiAuthMode() || !isInstituteUuid(input.instituteId)) {
    return { synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;

  for (const record of input.records) {
    try {
      const studentUuid = isInstituteUuid(record.studentId) ? record.studentId : null;
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
        metadataOnly: true,
      });
      synced += 1;
    } catch {
      failed += 1;
    }
  }

  return { synced, failed };
}

export function resetIssueTemplateCacheForTests(): void {
  templateIdCache.clear();
}
