/**
 * Minimal PDF 1.4 text renderer — no external deps.
 *
 * Current capability (generic official-document layout):
 * - Single-font Helvetica body text on A4 pages
 * - Title + recipient/reference/category/type/number/issued lines
 * - Optional payload key/value lines (provided values only; never invented)
 * - Word wrap + multi-page overflow
 *
 * Explicitly NOT implemented (requires an approved sample / richer engine):
 * - Board-specific Transfer Certificate layouts (CBSE or other)
 * - Template `blocks` / `visual_fields` / tables / watermarks
 * - Signature / seal / logo placement
 * - Precise print margins, columns, or bilingual boards
 *
 * Transfer Certificates remain Documents `type: document`. This renderer must
 * not fabricate student or institute fields missing from the payload.
 */

export type RenderDocumentPdfInput = {
  title: string;
  templateName: string;
  recipientName: string;
  recipientRef?: string | null;
  category?: string | null;
  certificateNumber?: string | null;
  documentType?: string | null;
  payload?: unknown;
  issuedAt?: string;
};

/** Max content lines per page before a new page is started (approx. A4 @ 12pt). */
export const PDF_LINES_PER_PAGE = 44;

/** Soft wrap width for body text. */
export const PDF_WRAP_MAX_LEN = 88;

function pdfEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function wrapLine(text: string, maxLen = PDF_WRAP_MAX_LEN): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    // Hard-split tokens longer than maxLen so they cannot blow the line.
    if (word.length > maxLen) {
      if (current) {
        lines.push(current);
        current = "";
      }
      for (let i = 0; i < word.length; i += maxLen) {
        lines.push(word.slice(i, i + maxLen));
      }
      continue;
    }
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLen && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Humanize payload keys for display without inventing values. */
export function formatPayloadLabel(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return "Field";
  return trimmed
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function isPresentValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function formatPayloadValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function payloadLines(payload: unknown): string[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return [];
  }
  const lines: string[] = [];
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (!isPresentValue(value)) continue;
    const label = formatPayloadLabel(key);
    const rendered = formatPayloadValue(value);
    lines.push(...wrapLine(`${label}: ${rendered}`));
  }
  return lines;
}

/** Build the full ordered body for an official/generated document PDF. */
export function buildDocumentPdfBodyLines(
  input: RenderDocumentPdfInput,
): string[] {
  const bodyLines: string[] = [
    input.title.trim() || "Document",
    "",
    `Template: ${input.templateName.trim() || "—"}`,
    `Recipient: ${input.recipientName.trim() || "—"}`,
  ];
  if (input.recipientRef?.trim()) {
    bodyLines.push(`Reference: ${input.recipientRef.trim()}`);
  }
  if (input.category?.trim()) {
    bodyLines.push(`Category: ${input.category.trim()}`);
  }
  if (input.documentType?.trim()) {
    bodyLines.push(`Type: ${input.documentType.trim()}`);
  }
  if (input.certificateNumber?.trim()) {
    const numberLabel =
      input.documentType === "certificate" ? "Certificate No" : "Document No";
    bodyLines.push(`${numberLabel}: ${input.certificateNumber.trim()}`);
  }
  if (input.issuedAt?.trim()) {
    bodyLines.push(`Issued: ${input.issuedAt.trim()}`);
  }
  bodyLines.push("");
  const details = payloadLines(input.payload);
  if (details.length > 0) {
    bodyLines.push("Details:");
    bodyLines.push(...details);
  }
  return bodyLines;
}

/** Split body lines into page chunks (does not drop overflow). */
export function paginatePdfLines(
  bodyLines: string[],
  linesPerPage = PDF_LINES_PER_PAGE,
): string[][] {
  const pages: string[][] = [];
  if (bodyLines.length === 0) return [[""]];
  for (let i = 0; i < bodyLines.length; i += linesPerPage) {
    pages.push(bodyLines.slice(i, i + linesPerPage));
  }
  return pages.length > 0 ? pages : [[""]];
}

function buildContentStream(bodyLines: string[]): string {
  const stream: string[] = ["BT", "/F1 12 Tf", "72 770 Td"];
  let lineCount = 0;
  for (const line of bodyLines) {
    if (lineCount > 0) stream.push("0 -16 Td");
    stream.push(`(${pdfEscape(line || " ")}) Tj`);
    lineCount += 1;
  }
  stream.push("ET");
  return stream.join("\n");
}

function assemblePdf(pageStreams: string[]): Uint8Array {
  const pageCount = Math.max(pageStreams.length, 1);
  const objects: string[] = [];

  // Object numbers:
  // 1 Catalog
  // 2 Pages
  // 3..(2+pageCount) Page
  // then Content + Font
  const pageObjNums = Array.from(
    { length: pageCount },
    (_, i) => 3 + i,
  );
  const contentObjNums = pageObjNums.map((n) => n + pageCount);
  const fontObjNum = 3 + pageCount * 2;

  objects.push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj");
  objects.push(
    `2 0 obj << /Type /Pages /Kids [${pageObjNums
      .map((n) => `${n} 0 R`)
      .join(" ")}] /Count ${pageCount} >> endobj`,
  );

  for (let i = 0; i < pageCount; i += 1) {
    const pageNum = pageObjNums[i]!;
    const contentNum = contentObjNums[i]!;
    objects.push(
      `${pageNum} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${contentNum} 0 R /Resources << /Font << /F1 ${fontObjNum} 0 R >> >> >> endobj`,
    );
  }

  for (let i = 0; i < pageCount; i += 1) {
    const contentNum = contentObjNums[i]!;
    const contentStream = pageStreams[i] ?? buildContentStream([""]);
    objects.push(
      `${contentNum} 0 obj << /Length ${Buffer.byteLength(contentStream, "utf8")} >> stream\n${contentStream}\nendstream endobj`,
    );
  }

  objects.push(
    `${fontObjNum} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj`,
  );

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${obj}\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

/** Render arbitrary text lines into a multi-page PDF when needed. */
export function renderTextPdf(bodyLines: string[]): Uint8Array {
  const pages = paginatePdfLines(bodyLines);
  return assemblePdf(pages.map((page) => buildContentStream(page)));
}

export function renderDocumentPdf(input: RenderDocumentPdfInput): Uint8Array {
  return renderTextPdf(buildDocumentPdfBodyLines(input));
}
