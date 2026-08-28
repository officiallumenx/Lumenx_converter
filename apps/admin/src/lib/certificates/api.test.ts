import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api";
import type { IssuedCertificateDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("certificates api repository", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("lists issued certificates with institute_id in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listIssuedCertificates } = await import("./api");
    const payload: IssuedCertificateDto[] = [
      {
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
        templateVersion: 1,
        recipientName: "Rahul Sharma",
        recipientRef: "ADM-001",
        status: "issued",
        issuedAt: "2026-06-01T10:00:00Z",
        issuedByUserId: "bb111111-1111-4111-8111-111111111111",
        revokedAt: null,
        revokedByUserId: null,
        revokeReason: null,
        assetPath: "/assets/cert.pdf",
        fileKind: "pdf",
        createdAt: "2026-06-01T10:00:00Z",
        updatedAt: "2026-06-01T10:00:00Z",
      },
    ];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: payload }),
    });
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const result = await listIssuedCertificates({ instituteId: INST }, client);
    expect(result).toEqual(payload);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/api/v1/certificates?");
    expect(url).toContain(`institute_id=${INST}`);
  });
});
