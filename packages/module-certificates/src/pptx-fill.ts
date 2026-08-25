import type { CertificateTemplateFile } from "./types";
import {
  listSlideXmlPaths,
  rewriteSlideShapes,
  slideNumberFromPath,
} from "./pptx-targets";
import { bytesToBlob, dataUrlToBytes, unzipBytes, zipStore } from "./zip-store";

export type CertificateFillValues = Record<string, string>;

export type CertificatePreviewBox = {
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
};

export type CertificatePreviewPicture = CertificatePreviewBox & {
  dataUrl: string;
};

export type CertificatePreviewText = CertificatePreviewBox & {
  targetId?: string;
  text: string;
  fontSizePt: number;
  align: "left" | "center" | "right";
  valign: "top" | "middle" | "bottom";
  color: string;
  fontFamily?: string;
};

export type CertificateSlidePreview = {
  widthEmu: number;
  heightEmu: number;
  background: string;
  pictures: CertificatePreviewPicture[];
  texts: CertificatePreviewText[];
};

const PPTX_MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const DEFAULT_SLIDE_CX = 12192000;
const DEFAULT_SLIDE_CY = 6858000;
const decoder = new TextDecoder("utf-8");
const encoder = new TextEncoder();

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function replaceShapeText(shapeXml: string, value: string): string {
  const escaped = escapeXml(value.replace(/\s+/g, " ").trim());
  let first = true;
  const replaced = shapeXml.replace(/<a:t\b[^>]*>[^<]*<\/a:t>/g, (match) => {
    if (first) {
      first = false;
      return match.replace(/>([^<]*)</, `>${escaped}<`);
    }
    return match.replace(/>([^<]*)</, "><");
  });
  return first ? shapeXml : replaced;
}

function fillSlideXml(xml: string, slide: number, values: CertificateFillValues): string {
  return rewriteSlideShapes(xml, slide, (shape) => {
    const value = values[shape.id];
    if (value == null || !value.trim()) return shape.shapeXml;
    return replaceShapeText(shape.shapeXml, value);
  });
}

function attr(xml: string, name: string): string | undefined {
  return xml.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
}

function emuAttr(xml: string, tag: string, name: string): number {
  const block = xml.match(new RegExp(`<${tag}\\b[^>]*>`))?.[0];
  if (!block) return 0;
  return Number(attr(block, name) ?? 0) || 0;
}

function boxFromXml(xml: string, slideW: number, slideH: number): CertificatePreviewBox | null {
  const xfrm = xml.match(/<a:xfrm\b[\s\S]*?<\/a:xfrm>/)?.[0];
  const source = xfrm ?? xml;
  const x = emuAttr(source, "a:off", "x");
  const y = emuAttr(source, "a:off", "y");
  const w = emuAttr(source, "a:ext", "cx");
  const h = emuAttr(source, "a:ext", "cy");
  if (w <= 0 || h <= 0 || slideW <= 0 || slideH <= 0) return null;
  return {
    xPct: (x / slideW) * 100,
    yPct: (y / slideH) * 100,
    wPct: (w / slideW) * 100,
    hPct: (h / slideH) * 100,
  };
}

function readSrgb(xml: string): string | undefined {
  const hex = xml.match(/<a:srgbClr\b[^>]*\bval="([^"]+)"/)?.[1];
  if (!hex || !/^[0-9a-fA-F]{6}$/.test(hex)) return undefined;
  return `#${hex}`;
}

function parseAlign(xml: string): "left" | "center" | "right" {
  const algn = xml.match(/<a:pPr\b[^>]*\balgn="([^"]+)"/)?.[1];
  if (algn === "ctr") return "center";
  if (algn === "r") return "right";
  return "left";
}

function parseVAlign(xml: string): "top" | "middle" | "bottom" {
  const anchor = xml.match(/<a:bodyPr\b[^>]*\banchor="([^"]+)"/)?.[1];
  if (anchor === "ctr") return "middle";
  if (anchor === "b") return "bottom";
  return "top";
}

function parseFontSizePt(xml: string): number {
  const sz = xml.match(/<a:rPr\b[^>]*\bsz="(\d+)"/)?.[1];
  if (!sz) return 18;
  return Math.max(8, Number(sz) / 100);
}

function parseFontFamily(xml: string): string | undefined {
  return xml.match(/<a:latin\b[^>]*\btypeface="([^"]+)"/)?.[1];
}

function slideSize(presentationXml: string | undefined): { widthEmu: number; heightEmu: number } {
  const block = presentationXml?.match(/<p:sldSz\b[^>]*>/)?.[0];
  const widthEmu = Number(block ? attr(block, "cx") : 0) || DEFAULT_SLIDE_CX;
  const heightEmu = Number(block ? attr(block, "cy") : 0) || DEFAULT_SLIDE_CY;
  return { widthEmu, heightEmu };
}

function slideBackground(slideXml: string): string {
  const bg = slideXml.match(/<p:bg\b[\s\S]*?<\/p:bg>/)?.[0];
  return (bg ? readSrgb(bg) : undefined) ?? "#ffffff";
}

function parseRels(xml: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const tag of xml.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = attr(tag[0], "Id");
    const target = attr(tag[0], "Target");
    if (id && target) map.set(id, target);
  }
  return map;
}

function resolveZipPath(fromFile: string, target: string): string {
  const normalized = target.replaceAll("\\", "/");
  if (normalized.startsWith("/")) return normalized.replace(/^\/+/, "");
  const dir = fromFile.split("/").slice(0, -1);
  for (const part of normalized.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") dir.pop();
    else dir.push(part);
  }
  return dir.join("/");
}

function mimeFromPath(path: string): string | null {
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  if (ext === "svg") return "image/svg+xml";
  return null;
}

function bytesToDataUrl(bytes: Uint8Array, mime: string): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

function mediaDataUrl(
  files: Map<string, Uint8Array>,
  slidePath: string,
  rels: Map<string, string>,
  embedId: string | undefined,
): string | null {
  if (!embedId) return null;
  const target = rels.get(embedId);
  if (!target) return null;
  const path = resolveZipPath(slidePath, target);
  const bytes = files.get(path);
  const mime = mimeFromPath(path);
  if (!bytes || !mime) return null;
  return bytesToDataUrl(bytes, mime);
}

function extractBackgroundPicture(
  slideXml: string,
  slidePath: string,
  files: Map<string, Uint8Array>,
  rels: Map<string, string>,
): CertificatePreviewPicture | null {
  const bg = slideXml.match(/<p:bg\b[\s\S]*?<\/p:bg>/)?.[0];
  if (!bg) return null;
  const embed = bg.match(/<a:blip\b[^>]*\b(?:r:)?embed="([^"]+)"/)?.[1];
  const dataUrl = mediaDataUrl(files, slidePath, rels, embed);
  if (!dataUrl) return null;
  return { xPct: 0, yPct: 0, wPct: 100, hPct: 100, dataUrl };
}

function extractPictures(
  slideXml: string,
  slidePath: string,
  files: Map<string, Uint8Array>,
  rels: Map<string, string>,
  widthEmu: number,
  heightEmu: number,
): CertificatePreviewPicture[] {
  const pictures: CertificatePreviewPicture[] = [];
  for (const match of slideXml.matchAll(/<p:pic\b[\s\S]*?<\/p:pic>/g)) {
    const box = boxFromXml(match[0], widthEmu, heightEmu);
    const embed = match[0].match(/<a:blip\b[^>]*\b(?:r:)?embed="([^"]+)"/)?.[1];
    const dataUrl = mediaDataUrl(files, slidePath, rels, embed);
    if (!box || !dataUrl) continue;
    pictures.push({ ...box, dataUrl });
  }
  return pictures;
}

function extractTexts(
  slideXml: string,
  slide: number,
  values: CertificateFillValues,
  widthEmu: number,
  heightEmu: number,
): CertificatePreviewText[] {
  const texts: CertificatePreviewText[] = [];
  rewriteSlideShapes(slideXml, slide, (shape) => {
    const box = boxFromXml(shape.shapeXml, widthEmu, heightEmu);
    if (box) {
      const value = values[shape.id];
      texts.push({
        ...box,
        targetId: shape.id,
        text: value?.trim() ? value : shape.previewText,
        fontSizePt: parseFontSizePt(shape.shapeXml),
        align: parseAlign(shape.shapeXml),
        valign: parseVAlign(shape.shapeXml),
        color: readSrgb(shape.shapeXml) ?? "#111111",
        fontFamily: parseFontFamily(shape.shapeXml),
      });
    }
    return shape.shapeXml;
  });
  return texts;
}

async function loadPptxFiles(file: CertificateTemplateFile): Promise<Map<string, Uint8Array> | null> {
  if (file.format !== "pptx" || !file.dataUrl) return null;
  try {
    return await unzipBytes(dataUrlToBytes(file.dataUrl));
  } catch {
    return null;
  }
}

function buildSlidesFromFiles(
  files: Map<string, Uint8Array>,
  values: CertificateFillValues,
): CertificateSlidePreview[] {
  const presentation = files.get("ppt/presentation.xml");
  const { widthEmu, heightEmu } = slideSize(presentation ? decoder.decode(presentation) : undefined);
  const slides: CertificateSlidePreview[] = [];

  for (const path of listSlideXmlPaths(files)) {
    const raw = files.get(path);
    if (!raw) continue;
    const xml = decoder.decode(raw);
    const relsPath = path.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels";
    const relsRaw = files.get(relsPath);
    const rels = relsRaw ? parseRels(decoder.decode(relsRaw)) : new Map<string, string>();
    const slide = slideNumberFromPath(path);
    const backgroundPic = extractBackgroundPicture(xml, path, files, rels);
    const pictures = extractPictures(xml, path, files, rels, widthEmu, heightEmu);
    slides.push({
      widthEmu,
      heightEmu,
      background: slideBackground(xml),
      pictures: backgroundPic ? [backgroundPic, ...pictures] : pictures,
      texts: extractTexts(xml, slide, values, widthEmu, heightEmu),
    });
  }
  return slides;
}

/** In-app preview of the Nexus PPTX with mapped + manual values applied. Original file is not written. */
export async function buildCertificateSlidePreview(
  file: CertificateTemplateFile,
  values: CertificateFillValues,
): Promise<CertificateSlidePreview[] | null> {
  const files = await loadPptxFiles(file);
  if (!files) return null;
  const slides = buildSlidesFromFiles(files, values);
  return slides.length > 0 ? slides : null;
}

function fillPptxFiles(
  original: Map<string, Uint8Array>,
  values: CertificateFillValues,
): Map<string, Uint8Array> {
  const files = new Map(original);
  for (const path of listSlideXmlPaths(original)) {
    const raw = original.get(path);
    if (!raw) continue;
    const filled = fillSlideXml(decoder.decode(raw), slideNumberFromPath(path), values);
    files.set(path, encoder.encode(filled));
  }
  return files;
}

/**
 * Fill mapped text boxes on a copy of the PPTX.
 * Returns null when the file is not a readable PPTX. Never mutates the catalog data URL.
 */
export async function fillCertificatePptxCopy(
  file: CertificateTemplateFile,
  values: CertificateFillValues,
): Promise<Uint8Array | null> {
  const original = await loadPptxFiles(file);
  if (!original) return null;
  return zipStore(fillPptxFiles(original, values));
}

/** Fill one PPTX copy per student from a single unzip of the original template. */
export async function fillCertificatePptxCopies(
  file: CertificateTemplateFile,
  items: Array<{ filename: string; values: CertificateFillValues }>,
): Promise<Map<string, Uint8Array> | null> {
  const original = await loadPptxFiles(file);
  if (!original) return null;
  const out = new Map<string, Uint8Array>();
  for (const item of items) {
    out.set(item.filename, zipStore(fillPptxFiles(original, item.values)));
  }
  return out;
}

export function filledPptxBlob(bytes: Uint8Array): Blob {
  return bytesToBlob(bytes, PPTX_MIME);
}
