import type { PreviewDevice, TemplateRecord } from "@/lib/template-management/types";

/** ISO/IEC 7810 ID-1 — standard PVC card */
export const PVC_ID_CARD = {
  widthMm: 85.6,
  heightMm: 53.98,
  label: "85.6 × 54 mm · PVC card (ISO ID-1)",
} as const;

/** ISO 216 A4 */
export const A4_SHEET = {
  widthMm: 210,
  heightMm: 297,
  label: "210 × 297 mm · A4 sheet",
} as const;

export function previewAspectForKind(kind: TemplateRecord["kind"]): TemplateRecord["previewAspect"] {
  return kind === "id_card" ? "id_card" : "a4";
}

export function getPreviewSizeConfig(
  aspect: TemplateRecord["previewAspect"],
  device: PreviewDevice = "desktop",
) {
  if (aspect === "id_card") {
    return {
      label: PVC_ID_CARD.label,
      /** True physical width on screen (browser mm units) */
      frameClass: "w-[85.6mm] max-w-full",
      aspectClass: "aspect-[85.6/53.98]",
      compact: true,
      deviceNote: "Standard credit-card / school ID PVC size",
    };
  }

  const a4Width =
    device === "mobile"
      ? "w-full max-w-[280px]"
      : device === "tablet"
        ? "w-full max-w-[420px]"
        : device === "print"
          ? "w-[210mm] max-w-full"
          : "w-[210mm] max-w-full";

  return {
    label: A4_SHEET.label,
    frameClass: a4Width,
    aspectClass: "aspect-[210/297]",
    compact: false,
    deviceNote:
      device === "print"
        ? "Print preview at full A4 width"
        : "Scaled A4 portrait · 210 × 297 mm",
  };
}
