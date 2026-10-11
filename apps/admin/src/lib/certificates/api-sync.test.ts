import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api";
import type { IssuedCertificateRecord } from "@/lib/certificate-numbering-store";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TPL = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const TPL_SHADOW = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

vi.mock("@/auth/auth-mode", () => ({
  isApiAuthMode: () => true,
}));

vi.mock("@/lib/documents/api", () => ({
  listDocumentTemplates: vi.fn(),
}));

vi.mock("@/lib/documents/mutations", () => ({
  createDocumentTemplate: vi.fn(),
}));

vi.mock("./mutations", () => ({
  issueCertificate: vi.fn(),
}));

import { listDocumentTemplates } from "@/lib/documents/api";
import { createDocumentTemplate } from "@/lib/documents/mutations";
import { issueCertificate } from "./mutations";
import {
  HYBRID_SHADOW_TEMPLATE_TAG,
  ensureIssueTemplateId,
  resetIssueTemplateCacheForTests,
  syncIssuedRecordsToApi,
} from "./api-sync";

function record(
  overrides: Partial<IssuedCertificateRecord> = {},
): IssuedCertificateRecord {
  return {
    id: "iss-1",
    certificateNumber: "CERT/2026/0001",
    sequence: 1,
    year: 2026,
    studentId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    studentName: "Ada",
    categoryId: "awards",
    categoryName: "Awards",
    templateId: "local-tpl-1",
    templateFamilyId: "local-fam-1",
    templateVersion: 2,
    templateName: "Sports Day Award",
    issuedAt: "2026-06-01T00:00:00.000Z",
    issuedById: "admin",
    issuedByName: "Admin",
    fileName: "Sports-Day.pptx",
    fileKind: "pptx",
    status: "issued",
    ...overrides,
  };
}

describe("hybrid certificate ledger sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetIssueTemplateCacheForTests();
  });

  it("reuses an existing template by name and does not create duplicates", async () => {
    vi.mocked(listDocumentTemplates).mockResolvedValue([
      {
        id: TPL,
        ownerScope: "institute",
        instituteId: INST,
        type: "certificate",
        name: "Sports Day Award",
        description: "Nexus-linked template v1 (ledger metadata only; PPTX stays local)",
        category: "Awards",
        status: "active",
        source: "custom",
        version: 1,
        previewAspect: "a4",
        layoutMode: "visual",
        blocks: [],
        visualTheme: null,
        visualFields: null,
        tags: [HYBRID_SHADOW_TEMPLATE_TAG],
        createdByUserId: null,
        createdAt: "",
        updatedAt: "",
      },
    ] as never);

    const id1 = await ensureIssueTemplateId({
      instituteId: INST,
      templateName: "Sports Day Award",
      categoryName: "Awards",
      templateVersion: 2,
    });
    const id2 = await ensureIssueTemplateId({
      instituteId: INST,
      templateName: "Sports Day Award",
      categoryName: "Awards",
      templateVersion: 3,
    });

    expect(id1).toBe(TPL);
    expect(id2).toBe(TPL);
    expect(createDocumentTemplate).not.toHaveBeenCalled();
    expect(listDocumentTemplates).toHaveBeenCalledTimes(1);
  });

  it("creates a tagged shadow template only when no name match exists", async () => {
    vi.mocked(listDocumentTemplates).mockResolvedValue([]);
    vi.mocked(createDocumentTemplate).mockResolvedValue({
      id: TPL_SHADOW,
      name: "Sports Day Award",
    } as never);

    const id = await ensureIssueTemplateId({
      instituteId: INST,
      templateName: "Sports Day Award",
      categoryName: "Awards",
      templateVersion: 2,
    });

    expect(id).toBe(TPL_SHADOW);
    expect(createDocumentTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        instituteId: INST,
        type: "certificate",
        layoutMode: "visual",
        tags: [HYBRID_SHADOW_TEMPLATE_TAG],
        activateNow: true,
      }),
    );
  });

  it("issues metadata-only with null asset path and pptx file kind", async () => {
    vi.mocked(listDocumentTemplates).mockResolvedValue([
      {
        id: TPL,
        name: "Sports Day Award",
        description: "Nexus-linked",
        tags: [HYBRID_SHADOW_TEMPLATE_TAG],
        type: "certificate",
        status: "active",
      },
    ] as never);
    vi.mocked(issueCertificate).mockResolvedValue({ id: "issued-1" } as never);

    const result = await syncIssuedRecordsToApi({
      instituteId: INST,
      records: [record()],
    });

    expect(result).toEqual({
      synced: 1,
      failed: 0,
      alreadySynced: 0,
      metadataOnly: true,
    });
    expect(issueCertificate).toHaveBeenCalledWith(
      expect.objectContaining({
        instituteId: INST,
        templateId: TPL,
        certificateNumber: "CERT/2026/0001",
        fileKind: "pptx",
        metadataOnly: true,
        assetPath: null,
      }),
    );
  });

  it("treats repeated sync of the same number as alreadySynced (idempotent)", async () => {
    vi.mocked(listDocumentTemplates).mockResolvedValue([
      {
        id: TPL,
        name: "Sports Day Award",
        tags: [HYBRID_SHADOW_TEMPLATE_TAG],
        type: "certificate",
        status: "active",
      },
    ] as never);
    vi.mocked(issueCertificate).mockRejectedValue(
      new ApiClientError({
        status: 409,
        code: "CONFLICT",
        message: "Certificate number already issued",
      }),
    );

    const result = await syncIssuedRecordsToApi({
      instituteId: INST,
      records: [record(), record({ id: "iss-2", certificateNumber: "CERT/2026/0001" })],
    });

    expect(result.synced).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.alreadySynced).toBe(2);
    expect(result.metadataOnly).toBe(true);
    expect(createDocumentTemplate).not.toHaveBeenCalled();
  });

  it("counts non-conflict failures without creating extra numbers", async () => {
    vi.mocked(listDocumentTemplates).mockResolvedValue([
      {
        id: TPL,
        name: "Sports Day Award",
        tags: [HYBRID_SHADOW_TEMPLATE_TAG],
        type: "certificate",
        status: "active",
      },
    ] as never);
    vi.mocked(issueCertificate).mockRejectedValue(
      new ApiClientError({
        status: 403,
        code: "FORBIDDEN",
        message: "Insufficient permissions",
      }),
    );

    const result = await syncIssuedRecordsToApi({
      instituteId: INST,
      records: [record()],
    });

    expect(result).toEqual({
      synced: 0,
      failed: 1,
      alreadySynced: 0,
      metadataOnly: true,
    });
  });
});
