import type { CertificateTemplateFile } from "./types";
import type { CertificateTemplateTarget } from "./field-types";
import { dataUrlToBytes, unzipBytes } from "./zip-store";

function decodeXml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export type SlideShapeVisit = {
  id: string;
  slide: number;
  shapeXml: string;
  name: string;
  previewText: string;
};

/** Rewrite each text shape using the same target ids as mapping detection. */
export function rewriteSlideShapes(
  xml: string,
  slide: number,
  rewrite: (shape: SlideShapeVisit) => string,
): string {
  const matches = [...xml.matchAll(/<p:sp\b[\s\S]*?<\/p:sp>/g)];
  if (matches.length === 0) return xml;

  let out = "";
  let last = 0;
  let index = 0;
  for (const match of matches) {
    const shapeXml = match[0];
    const start = match.index ?? 0;
    out += xml.slice(last, start);

    const nameMatch = shapeXml.match(/<p:cNvPr\b[^>]*\sname="([^"]*)"/);
    const texts = [...shapeXml.matchAll(/<a:t\b[^>]*>([^<]*)<\/a:t>/g)].map((item) =>
      decodeXml(item[1] ?? "").trim(),
    );
    const previewText = texts.filter(Boolean).join(" ").trim();
    index += 1;
    if (!nameMatch && !previewText) {
      out += shapeXml;
      last = start + shapeXml.length;
      continue;
    }

    out += rewrite({
      id: `slide-${slide}-box-${index}`,
      slide,
      shapeXml,
      name: (nameMatch?.[1] ?? "").trim() || `Text box ${index}`,
      previewText,
    });
    last = start + shapeXml.length;
  }
  return out + xml.slice(last);
}

function extractShapeTargets(xml: string, slide: number): CertificateTemplateTarget[] {
  const targets: CertificateTemplateTarget[] = [];
  rewriteSlideShapes(xml, slide, (shape) => {
    targets.push({
      id: shape.id,
      slide,
      name: shape.name,
      previewText: shape.previewText,
      source: "detected",
    });
    return shape.shapeXml;
  });
  return targets;
}

export function slideNumberFromPath(path: string): number {
  const match = path.match(/slide(\d+)\.xml$/i);
  return match ? Number(match[1]) : 1;
}

export function listSlideXmlPaths(files: Map<string, Uint8Array>): string[] {
  return [...files.keys()]
    .filter((path) => path.startsWith("ppt/slides/slide") && path.endsWith(".xml"))
    .sort((a, b) => slideNumberFromPath(a) - slideNumberFromPath(b));
}

export async function detectCertificateTemplateTargets(
  file: CertificateTemplateFile,
): Promise<CertificateTemplateTarget[]> {
  if (file.format !== "pptx" || !file.dataUrl) return [];
  try {
    const files = await unzipBytes(dataUrlToBytes(file.dataUrl));
    const decoder = new TextDecoder("utf-8");
    const targets: CertificateTemplateTarget[] = [];
    for (const path of listSlideXmlPaths(files)) {
      const raw = files.get(path);
      if (!raw) continue;
      targets.push(...extractShapeTargets(decoder.decode(raw), slideNumberFromPath(path)));
    }
    return targets;
  } catch {
    return [];
  }
}
