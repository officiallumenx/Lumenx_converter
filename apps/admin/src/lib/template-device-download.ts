/**
 * Admin generated-document download — device Downloads only (no in-app library).
 */
import { downloadTextToDevice } from "@lumenx/utils";
import type { GeneratedDocument } from "@/lib/template-management/types";

function safeFilePart(value: string): string {
  return value.trim().replace(/[^\w.-]+/g, "_").slice(0, 48) || "document";
}

export function downloadGeneratedTemplateDoc(doc: GeneratedDocument): { filename: string } {
  const lines = [
    "LumenX Admin",
    "GENERATED DOCUMENT",
    "========================================",
    `Template    : ${doc.templateName}`,
    `Kind        : ${doc.kind}`,
    `Recipient   : ${doc.recipientName}`,
    `Ref         : ${doc.recipientRef}`,
    doc.certificateNumber ? `Cert. No.   : ${doc.certificateNumber}` : null,
    `Generated   : ${new Date(doc.generatedAt).toLocaleString()}`,
    doc.batchId ? `Batch       : ${doc.batchId}` : null,
    "========================================",
    "Saved to this device's Downloads folder.",
    "Demo file — replace with real PDF/binary when templates are connected.",
    "",
  ].filter(Boolean) as string[];

  const base =
    doc.certificateNumber ||
    `${doc.kind}-${doc.recipientRef}` ||
    doc.id;

  return downloadTextToDevice(
    `${safeFilePart(doc.templateName)}-${safeFilePart(base)}.txt`,
    `${lines.join("\n")}\n`,
    "text/plain;charset=utf-8",
  );
}
