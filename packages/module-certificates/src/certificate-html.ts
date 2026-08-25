import type { CertificateSlidePreview } from "./pptx-fill";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function boxStyle(box: {
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
}): string {
  return [
    "position:absolute",
    `left:${box.xPct}%`,
    `top:${box.yPct}%`,
    `width:${box.wPct}%`,
    `height:${box.hPct}%`,
  ].join(";");
}

function valignCss(valign: "top" | "middle" | "bottom"): string {
  if (valign === "middle") return "center";
  if (valign === "bottom") return "flex-end";
  return "flex-start";
}

/** Render one filled slide to HTML that preserves PPTX layout (print → Save as PDF). */
export function certificateSlideToHtml(slide: CertificateSlidePreview): string {
  const heightPt = (slide.heightEmu / 914400) * 72;
  const pictures = slide.pictures
    .map(
      (picture) =>
        `<img alt="" src="${escapeHtml(picture.dataUrl)}" style="${boxStyle(picture)};object-fit:fill" />`,
    )
    .join("");
  const texts = slide.texts
    .map((text) => {
      const font = text.fontFamily ? `font-family:${escapeHtml(text.fontFamily)},serif;` : "";
      return `<div style="${boxStyle(text)};display:flex;align-items:${valignCss(text.valign)};justify-content:${
        text.align === "center" ? "center" : text.align === "right" ? "flex-end" : "flex-start"
      };overflow:hidden;color:${escapeHtml(text.color)};text-align:${text.align};${font}font-size:calc(${text.fontSizePt} * 100cqh / ${heightPt});line-height:1.15;white-space:pre-wrap">${escapeHtml(text.text)}</div>`;
    })
    .join("");

  return `<div class="lx-cert-slide" style="container-type:size;position:relative;width:100%;aspect-ratio:${slide.widthEmu} / ${slide.heightEmu};background:${escapeHtml(slide.background)};overflow:hidden">${pictures}${texts}</div>`;
}

export function certificateFieldsFallbackHtml(input: {
  templateName: string;
  studentName: string;
  fields: Array<{ displayName: string; value: string }>;
}): string {
  const rows = input.fields
    .filter((field) => field.value.trim())
    .map(
      (field) =>
        `<p class="field"><span>${escapeHtml(field.displayName)}</span><strong>${escapeHtml(field.value)}</strong></p>`,
    )
    .join("");
  return `<div class="lx-cert-fallback">
    <p class="kicker">${escapeHtml(input.templateName)}</p>
    <h1>${escapeHtml(input.studentName)}</h1>
    ${rows || "<p>No filled values</p>"}
  </div>`;
}

export function buildCertificatePrintHtml(input: {
  title: string;
  pages: Array<{ studentName: string; bodyHtml: string }>;
}): string {
  const pages = input.pages
    .map(
      (page) =>
        `<section class="page">${page.bodyHtml}</section>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(input.title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #e8e8e8; color: #111; font-family: Georgia, "Times New Roman", serif; }
    .page { page-break-after: always; background: #fff; }
    .page:last-child { page-break-after: auto; }
    .lx-cert-slide { width: 100vw; max-width: 100%; }
    .lx-cert-fallback { min-height: 100vh; padding: 12vh 10vw; text-align: center; }
    .lx-cert-fallback .kicker { letter-spacing: 0.18em; text-transform: uppercase; font-size: 0.75rem; color: #555; }
    .lx-cert-fallback h1 { font-size: 2rem; margin: 0.6rem 0 1.5rem; }
    .lx-cert-fallback .field { margin: 0.45rem 0; }
    .lx-cert-fallback .field span { display: block; font-size: 0.75rem; color: #666; }
    @page { size: landscape; margin: 0; }
    @media print {
      body { background: #fff; }
      .page { page-break-after: always; }
    }
  </style>
</head>
<body>
${pages}
</body>
</html>`;
}
