import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@lumenx/module-certificates", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@lumenx/module-certificates")>();
  return {
    ...actual,
    isDbCertificateCatalogEnabled: vi.fn(() => false),
  };
});

import { isDbCertificateCatalogEnabled } from "@lumenx/module-certificates";
import {
  listNexusPlatformCertificateTemplates,
  mirrorLocalTemplateToPlatformCatalog,
} from "./api";

describe("nexus certificate-templates api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isDbCertificateCatalogEnabled).mockReturnValue(false);
  });

  it("lists and maps platform DTOs", async () => {
    const get = vi.fn().mockResolvedValue([
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        familyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        name: "Award",
        description: null,
        category: "awards",
        status: "active",
        source: "custom",
        version: 1,
        layoutMode: "pptx",
        fileName: "a.pptx",
        fileByteSize: 12,
        fileContentType: "application/octet-stream",
        assetPath: "platform/x/v1/a.pptx",
        hasFile: true,
        pptxMeta: { targets: [], mappings: [] },
        createdByUserId: null,
        createdAt: "",
        updatedAt: "",
      },
    ]);
    const rows = await listNexusPlatformCertificateTemplates(undefined, {
      get,
    } as never);
    expect(get).toHaveBeenCalledWith("/api/nexus/certificate-templates");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("Award");
  });

  it("mirror is a no-op when DB catalog flag is OFF", async () => {
    const result = await mirrorLocalTemplateToPlatformCatalog({
      id: "tpl-1",
      familyId: "fam-1",
      name: "Award",
      categoryId: "awards",
      description: "",
      version: 1,
      status: "published",
      createdAt: "",
      updatedAt: "",
      file: {
        fileName: "a.pptx",
        format: "pptx",
        sizeBytes: 4,
        dataUrl: "data:application/octet-stream;base64,AAAA",
      },
      targets: [],
      mappings: [],
    });
    expect(result).toEqual({ ok: false, reason: "flag_off" });
  });

  it("mirror creates upload and publish when flag is ON", async () => {
    vi.mocked(isDbCertificateCatalogEnabled).mockReturnValue(true);
    const post = vi
      .fn()
      .mockResolvedValueOnce({ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" })
      .mockResolvedValueOnce({ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" });
    const postForm = vi.fn().mockResolvedValue({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });
    const result = await mirrorLocalTemplateToPlatformCatalog(
      {
        id: "tpl-1",
        familyId: "fam-1",
        name: "Award",
        categoryId: "awards",
        description: "",
        version: 1,
        status: "published",
        createdAt: "",
        updatedAt: "",
        file: {
          fileName: "a.pptx",
          format: "pptx",
          sizeBytes: 4,
          dataUrl: "data:application/octet-stream;base64,AAAA",
        },
        targets: [],
        mappings: [],
      },
      { post, postForm, get: vi.fn() } as never,
    );
    expect(result).toEqual({
      ok: true,
      platformId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });
    expect(post).toHaveBeenCalled();
    expect(postForm).toHaveBeenCalled();
  });
});
