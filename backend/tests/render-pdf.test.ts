import { describe, expect, it } from "vitest";
import {
  PDF_LINES_PER_PAGE,
  buildDocumentPdfBodyLines,
  formatPayloadLabel,
  paginatePdfLines,
  payloadLines,
  renderDocumentPdf,
  renderTextPdf,
  wrapLine,
} from "../src/domains/documents/render-pdf.js";

function pdfText(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

describe("renderDocumentPdf", () => {
  it("produces a valid PDF header and includes key fields", () => {
    const bytes = renderDocumentPdf({
      title: "Bonafide Certificate",
      templateName: "Standard Bonafide",
      recipientName: "Student A",
      recipientRef: "ROLL-12",
      category: "Academic",
      documentType: "document",
      payload: { purpose: "Bank account" },
    });

    const text = pdfText(bytes);
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("Bonafide Certificate");
    expect(text).toContain("Student A");
    expect(text).toContain("Bank account");
    expect(text.endsWith("%%EOF\n")).toBe(true);
  });

  it("renders Transfer Certificate as type document without inventing fields", () => {
    const bytes = renderDocumentPdf({
      title: "Transfer Certificate — Board Format",
      templateName: "Transfer Certificate — Board Format",
      recipientName: "Alina Moreno",
      recipientRef: "STU-1046",
      category: "transfer_certificate",
      documentType: "document",
      certificateNumber: "LXA/TC/2026/0031",
      payload: {
        admission_number: "STU-1046",
        last_class: "10-A",
        // Omitting father_name / date_of_birth on purpose — must not appear.
      },
    });

    const text = pdfText(bytes);
    expect(text).toContain("Type: document");
    expect(text).toContain("Category: transfer_certificate");
    expect(text).toContain("Document No: LXA/TC/2026/0031");
    expect(text).toContain("Admission Number: STU-1046");
    expect(text).toContain("Last Class: 10-A");
    expect(text).not.toContain("Father");
    expect(text).not.toContain("Date Of Birth");
    expect(text).not.toMatch(/CBSE|mandatory board/i);
  });

  it("skips null, empty, and whitespace-only optional payload fields", () => {
    const lines = payloadLines({
      purpose: "Admission",
      remarks: "",
      note: "   ",
      sealed: null,
      unused: undefined,
    });
    expect(lines.join("\n")).toContain("Purpose: Admission");
    expect(lines.join("\n")).not.toContain("Remarks");
    expect(lines.join("\n")).not.toContain("Note");
    expect(lines.join("\n")).not.toContain("Sealed");
  });

  it("wraps long text and hard-splits oversized tokens", () => {
    const wrapped = wrapLine(
      "This is a moderately long sentence that should wrap across multiple lines for the official document body.",
      40,
    );
    expect(wrapped.length).toBeGreaterThan(1);
    expect(wrapped.every((line) => line.length <= 40)).toBe(true);

    const hard = wrapLine("A".repeat(100), 40);
    expect(hard.length).toBeGreaterThan(1);
    expect(hard.every((line) => line.length <= 40)).toBe(true);
  });

  it("paginates overflow instead of truncating content", () => {
    const many = Array.from({ length: PDF_LINES_PER_PAGE + 12 }, (_, i) =>
      `Line ${i + 1}`,
    );
    const pages = paginatePdfLines(many);
    expect(pages).toHaveLength(2);
    expect(pages[0]).toHaveLength(PDF_LINES_PER_PAGE);
    expect(pages[1]).toHaveLength(12);
    expect(pages.flat().join("\n")).toContain(
      `Line ${PDF_LINES_PER_PAGE + 12}`,
    );

    const bytes = renderTextPdf(many);
    const text = pdfText(bytes);
    expect(text).toContain("/Count 2");
    expect(text).toContain(`Line ${PDF_LINES_PER_PAGE + 12}`);
  });

  it("keeps certificate number label for certificate documentType", () => {
    const lines = buildDocumentPdfBodyLines({
      title: "Award",
      templateName: "Award",
      recipientName: "Sam",
      documentType: "certificate",
      certificateNumber: "CERT/2026/0001",
    });
    expect(lines.some((l) => l === "Certificate No: CERT/2026/0001")).toBe(
      true,
    );
  });

  it("formats payload labels without inventing values", () => {
    expect(formatPayloadLabel("date_of_leaving")).toBe("Date Of Leaving");
    expect(payloadLines({ date_of_leaving: "2026-03-31" })).toEqual([
      "Date Of Leaving: 2026-03-31",
    ]);
  });
});
