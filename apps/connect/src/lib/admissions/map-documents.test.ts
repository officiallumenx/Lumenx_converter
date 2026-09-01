import { describe, expect, it } from "vitest";
import {
  admissionDocumentDtoToPortal,
  formatDocCountSummary,
} from "./map-documents";
import type { AdmissionDocumentDto } from "./api";

describe("admissions map-documents", () => {
  it("maps dto to portal document", () => {
    const dto: AdmissionDocumentDto = {
      id: "d1111111-1111-4111-8111-111111111111",
      instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      applicationId: "b0111111-1111-4111-8111-111111111111",
      docType: "birth_certificate",
      label: "Birth certificate",
      fileName: "birth.pdf",
      assetPath: "inst/a/birth.pdf",
      status: "uploaded",
      note: null,
      uploadedByUserId: null,
      createdAt: "2026-06-01T10:00:00Z",
      updatedAt: "2026-06-01T10:00:00Z",
    };
    const row = admissionDocumentDtoToPortal(dto);
    expect(row.type).toBe("birth_certificate");
    expect(row.fileName).toBe("birth.pdf");
    expect(row.status).toBe("uploaded");
  });

  it("formats verified/total doc count", () => {
    const docs = [
      { status: "verified" as const },
      { status: "uploaded" as const },
    ] as AdmissionDocumentDto[];
    expect(formatDocCountSummary(docs)).toBe("1/2");
  });
});
