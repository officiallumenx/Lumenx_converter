import { describe, expect, it } from "vitest";
import { renderDocumentPdf } from "../src/domains/documents/render-pdf.js";

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

    const text = new TextDecoder().decode(bytes);
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("Bonafide Certificate");
    expect(text).toContain("Student A");
    expect(text).toContain("Bank account");
    expect(text.endsWith("%%EOF\n")).toBe(true);
  });
});
