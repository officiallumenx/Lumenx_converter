import { describe, expect, it } from "vitest";
import { issuedCertificateDtoToHistoryItem } from "./map";
import type { IssuedCertificateDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("certificates map", () => {
  it("maps issued certificate dto to history item", () => {
    const dto: IssuedCertificateDto = {
      id: "ee111111-1111-4111-8111-111111111111",
      instituteId: INST,
      generatedDocumentId: null,
      templateId: "cc111111-1111-4111-8111-111111111111",
      studentId: "dd111111-1111-4111-8111-111111111111",
      teacherId: null,
      certificateNumber: "CERT/2026/0001",
      sequence: 1,
      year: 2026,
      title: "Achievement",
      category: "Certificates",
      templateName: "Achievement Certificate",
      templateVersion: 2,
      recipientName: "Rahul Sharma",
      recipientRef: "ADM-001",
      status: "revoked",
      issuedAt: "2026-06-01T10:00:00Z",
      issuedByUserId: "bb111111-1111-4111-8111-111111111111",
      revokedAt: "2026-06-02T10:00:00Z",
      revokedByUserId: "bb111111-1111-4111-8111-111111111111",
      revokeReason: "Typo",
      assetPath: "/assets/cert.pdf",
      fileKind: "pdf",
      createdAt: "2026-06-01T10:00:00Z",
      updatedAt: "2026-06-02T10:00:00Z",
    };
    const row = issuedCertificateDtoToHistoryItem(dto);
    expect(row.studentName).toBe("Rahul Sharma");
    expect(row.templateVersion).toBe(2);
    expect(row.status).toBe("revoked");
    expect(row.fileName).toBe("cert.pdf");
    expect(row.hasServerFile).toBe(true);
  });

  it("does not invent a PPTX filename when assetPath is missing (hybrid ledger)", () => {
    const dto: IssuedCertificateDto = {
      id: "ee222222-2222-4222-8222-222222222222",
      instituteId: INST,
      generatedDocumentId: null,
      templateId: "cc111111-1111-4111-8111-111111111111",
      studentId: null,
      teacherId: null,
      certificateNumber: "CERT/2026/0009",
      sequence: 9,
      year: 2026,
      title: "Sports Day",
      category: "Awards",
      templateName: "Sports Day Award",
      templateVersion: 1,
      recipientName: "Ada",
      recipientRef: null,
      status: "issued",
      issuedAt: "2026-06-01T10:00:00Z",
      issuedByUserId: "bb111111-1111-4111-8111-111111111111",
      revokedAt: null,
      revokedByUserId: null,
      revokeReason: null,
      assetPath: null,
      fileKind: "pptx",
      createdAt: "2026-06-01T10:00:00Z",
      updatedAt: "2026-06-01T10:00:00Z",
    };
    const row = issuedCertificateDtoToHistoryItem(dto);
    expect(row.fileName).toBe("Ledger only (no server file)");
    expect(row.fileName).not.toMatch(/\.pptx$/i);
    expect(row.hasServerFile).toBe(false);
    expect(row.templateId).toBe(dto.templateId);
    expect(row.certificateNumber).toBe("CERT/2026/0009");
  });
});
