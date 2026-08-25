/** Allowed design uploads for template import / builder (PowerPoint only). */

export type DesignUploadFormat = "ppt" | "pptx";

export const DESIGN_UPLOAD_ACCEPT =
  ".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation";

export const DESIGN_UPLOAD_HINT = "PPT or PPTX only";

export function parseDesignUpload(file: File): { name: string; format: DesignUploadFormat } | null {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "ppt" || ext === "pptx") {
    return { name: file.name, format: ext };
  }
  return null;
}
