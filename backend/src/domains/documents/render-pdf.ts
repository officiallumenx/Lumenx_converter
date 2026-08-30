/** Minimal PDF 1.4 text renderer — template/data → binary without external deps. */

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

function pdfEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapLine(text: string, maxLen = 88): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
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

function payloadLines(payload: unknown): string[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return [];
  }
  const lines: string[] = [];
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (value == null) continue;
    const rendered =
      typeof value === "string" ? value : JSON.stringify(value);
    lines.push(...wrapLine(`${key}: ${rendered}`));
  }
  return lines;
}

function buildContentStream(bodyLines: string[]): string {
  const stream: string[] = ["BT", "/F1 12 Tf", "72 770 Td"];
  let lineCount = 0;
  for (const line of bodyLines) {
    if (lineCount > 0) stream.push("0 -16 Td");
    stream.push(`(${pdfEscape(line || " ")}) Tj`);
    lineCount += 1;
    if (lineCount >= 44) break;
  }
  stream.push("ET");
  return stream.join("\n");
}

function assemblePdf(contentStream: string): Uint8Array {
  const objects: string[] = [];
  objects.push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj");
  objects.push("2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj");
  objects.push(
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
  );
  objects.push(
    `4 0 obj << /Length ${Buffer.byteLength(contentStream, "utf8")} >> stream\n${contentStream}\nendstream endobj`,
  );
  objects.push(
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
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

export function renderDocumentPdf(input: RenderDocumentPdfInput): Uint8Array {
  const bodyLines: string[] = [
    input.title,
    "",
    `Template: ${input.templateName}`,
    `Recipient: ${input.recipientName}`,
  ];
  if (input.recipientRef) bodyLines.push(`Reference: ${input.recipientRef}`);
  if (input.category) bodyLines.push(`Category: ${input.category}`);
  if (input.documentType) bodyLines.push(`Type: ${input.documentType}`);
  if (input.certificateNumber) {
    bodyLines.push(`Certificate No: ${input.certificateNumber}`);
  }
  if (input.issuedAt) bodyLines.push(`Issued: ${input.issuedAt}`);
  bodyLines.push("");
  const details = payloadLines(input.payload);
  if (details.length > 0) {
    bodyLines.push("Details:");
    bodyLines.push(...details);
  }
  return assemblePdf(buildContentStream(bodyLines));
}
