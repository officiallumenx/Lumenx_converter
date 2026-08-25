/** Allowed certificate design uploads (PowerPoint only). Shared by Nexus catalog. */

import type { CertificateTemplateFormat } from "./types";

export const CERTIFICATE_UPLOAD_ACCEPT =
  ".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation";

export const CERTIFICATE_UPLOAD_HINT = "PPT or PPTX only";

export const CERTIFICATE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

export function parseCertificateUpload(
  file: File,
): { name: string; format: CertificateTemplateFormat; sizeBytes: number } | null {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext !== "ppt" && ext !== "pptx") return null;
  return { name: file.name, format: ext, sizeBytes: file.size };
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}
